import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
	Aedes,
	AedesPublishPacket,
	AuthenticateError,
	AuthErrorCode,
	Client,
	PublishPacket,
	Subscription,
} from "aedes";
import { Server } from "net";
import { MqttCommunication } from "./interfaces/mqtt.interface";
import { machineInTopic, machineOutTopic } from "./mqtt-topics";
import { MachinesRepository } from "../persistence/interfaces/machines-repository.interface";
import { MACHINES_REPOSITORY } from "../persistence/persistence.tokens";
import { verifySecret } from "../common/security/secret-hasher";

export interface MqttSubscription {
	unsubscribe(): void;
}

@Injectable()
export class MqttBrokerService implements MqttCommunication, OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(MqttBrokerService.name);
	private aedes: Aedes;
	private server: Server;
	private readonly port = 1883;
	private readonly clientMachineIds = new WeakMap<Client, string>();

	constructor(
		@Inject(MACHINES_REPOSITORY)
		private readonly machinesRepository: MachinesRepository,
	) {}

	async onModuleInit() {
		this.aedes = new Aedes({
			authenticate: this.authenticate,
			authorizePublish: this.authorizePublish,
			authorizeSubscribe: this.authorizeSubscribe,
		});
		await this.aedes.listen();
		this.server = new Server(this.aedes.handle);
		this.server.listen(this.port, () => {
			this.logger.log(`MQTT broker is running on port ${this.port}`);
		});
	}

	onModuleDestroy() {
		this.server.close();
		this.aedes.close(() => {
			this.logger.log("MQTT broker has been stopped");
		});
	}

	publish(topic: string, message: string, qos: 0 | 1 | 2 = 0) {
		this.aedes.publish({
			topic,
			payload: message,
			cmd: 'publish',
			qos: qos,
			dup: false,
			retain: false
		}, (err) => {
			if (err) {
				this.logger.error(`Failed to publish message to topic ${topic}: ${err.message}`);
			} else {
				this.logger.log(`Message published to topic ${topic}: ${message}`);
			}
		});
	}

	subscribe(topic: string, onMessage: (message: string) => void, onSubscribed?: () => void): MqttSubscription {
		const deliver = (packet: AedesPublishPacket, cb: () => void) => {
			const message = packet.payload.toString();
			this.logger.log(`Message received on topic ${topic}: ${message.slice(0, 5)}...`);
			onMessage(message);
			cb();
		};

		this.aedes.subscribe(topic, deliver, () => onSubscribed && onSubscribed());

		return {
			unsubscribe: () => {
				this.aedes.unsubscribe(topic, deliver, () => {
					this.logger.log(`Unsubscribed from topic ${topic}`);
				});
			},
		};
	}

	private authenticate = (
		client: Client,
		username: string | undefined,
		password: Buffer | undefined,
		done: (error: AuthenticateError | null, success: boolean | null) => void,
	): void => {
		void this.doAuthenticate(client, username, password, done);
	};

	private async doAuthenticate(
		client: Client,
		username: string | undefined,
		password: Buffer | undefined,
		done: (error: AuthenticateError | null, success: boolean | null) => void,
	): Promise<void> {
		if (!username || !password) {
			done(this.authError('Missing username or password'), false);
			return;
		}

		const machine = this.machinesRepository.findByMachineId(username);
		if (!machine || machine.registrationStatus !== 'confirmed') {
			this.logger.warn(`MQTT auth rejected for machine "${username}": unknown or unconfirmed`);
			done(this.authError('Invalid machine credentials'), false);
			return;
		}

		const validSecret = await verifySecret(password.toString(), machine.machineSecretHash);
		if (!validSecret) {
			this.logger.warn(`MQTT auth rejected for machine "${username}": invalid secret`);
			done(this.authError('Invalid machine credentials'), false);
			return;
		}

		this.clientMachineIds.set(client, machine.machineId);
		done(null, true);
	}

	private authorizePublish = (
		client: Client | null,
		packet: PublishPacket,
		done: (error?: Error | null) => void,
	): void => {
		const machineId = client && this.clientMachineIds.get(client);
		if (machineId && packet.topic === machineOutTopic(machineId)) {
			done();
			return;
		}
		this.logger.warn(`MQTT publish to "${packet.topic}" denied for client "${client?.id}"`);
		done(new Error(`Not authorized to publish to topic "${packet.topic}"`));
	};

	private authorizeSubscribe = (
		client: Client,
		sub: Subscription,
		done: (error: Error | null, subscription?: Subscription | null) => void,
	): void => {
		const machineId = this.clientMachineIds.get(client);
		if (machineId && sub.topic === machineInTopic(machineId)) {
			done(null, sub);
			return;
		}
		this.logger.warn(`MQTT subscribe to "${sub.topic}" denied for client "${client.id}"`);
		done(null, null);
	};

	private authError(message: string): AuthenticateError {
		const error = new Error(message) as AuthenticateError;
		error.returnCode = AuthErrorCode.BAD_USERNAME_OR_PASSWORD;
		return error;
	}
}

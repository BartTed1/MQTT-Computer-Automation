import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Aedes, AedesPublishPacket } from "aedes";
import { Server } from "net";
import { MqttCommunication } from "./interfaces/mqtt.interface";

export interface MqttSubscription {
	unsubscribe(): void;
}

@Injectable()
export class MqttBrokerService implements MqttCommunication, OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(MqttBrokerService.name);
	private aedes: Aedes;
	private server: Server;
	private readonly port = 1883;

	onModuleInit() {
		this.aedes = new Aedes();
		this.server = new Server(this.aedes.handle);
		this.server.listen(this.port, () => {
			this.logger.log(`MQTT broker is running on port ${this.port}`);
		});
	}

	onModuleDestroy() {
		this.server.close(() => {
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
}
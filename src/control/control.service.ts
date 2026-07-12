import { Inject, Injectable, Logger, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { MqttCommunication } from '../mqtt/interfaces/mqtt.interface';
import { MQTT_COMMUNICATION } from '../mqtt/mqtt.tokens';
import { machineInTopic, machineOutTopic } from '../mqtt/mqtt-topics';

@Injectable()
export class ControlService {
	private readonly logger = new Logger(ControlService.name);
	private lock = new Set<string>();

	constructor(
		@Inject(MQTT_COMMUNICATION)
		private readonly mqttCommunication: MqttCommunication,
		private readonly configService: ConfigService,
	) {}

	publishAndObserve(
		machineId: string,
		command: string,
		params: string,
	): Observable<MessageEvent> {
		if (this.lock.has(machineId)) {
			this.logger.warn(`Command for machine ${machineId} is already in progress. Ignoring new command.`);
			return new Observable<MessageEvent>((subscriber) => {
				subscriber.error(new Error(`Command for machine ${machineId} is already in progress.`));
			});
		}

		const timeoutSeconds = Number(
			this.configService.get<string>('COMMAND_TIMEOUT_SECONDS'),
		);
		if (!timeoutSeconds || Number.isNaN(timeoutSeconds)) {
			return new Observable<MessageEvent>((subscriber) => {
				subscriber.error(new Error('COMMAND_TIMEOUT_SECONDS is not configured'));
			});
		}

		this.lock.add(machineId);
		this.logger.log(`Lock acquired for machine ${machineId}.`);

		return new Observable<MessageEvent>((subscriber) => {
			const topic = machineInTopic(machineId);
			const subscriptionTopic = machineOutTopic(machineId);
			const paramsArray = params ? params.split(',') : [];
			const message = JSON.stringify({ command, params: paramsArray });
			const qos = 1;

			let timeoutHandle: ReturnType<typeof setTimeout>;
			const resetTimeout = () => {
				clearTimeout(timeoutHandle);
				timeoutHandle = setTimeout(() => {
					subscriber.error(
						new Error(
							`No message received for machine ${machineId} within ${timeoutSeconds}s`,
						),
					);
				}, timeoutSeconds * 1000);
			};

			const subscription = this.mqttCommunication.subscribe(
				subscriptionTopic,
				(message) => {
					resetTimeout();
					if (message === '==COMPLETED==') {
						subscriber.complete();
						return;
					}
					subscriber.next({
						data: message,
					});
				},
				() => {
					this.logger.log(`Subscribed to topic ${subscriptionTopic}`);
				}
			);

			this.mqttCommunication.publish(topic, message, qos);
			this.logger.log(`Published command to topic ${topic}: ${message}`);

			resetTimeout();

			return () => {
				clearTimeout(timeoutHandle);
				subscription.unsubscribe();
				this.lock.delete(machineId);
				this.logger.log(`Lock released for machine ${machineId}.`);
			};
		});
	}
}

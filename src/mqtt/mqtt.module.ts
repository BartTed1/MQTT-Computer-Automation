import { Module } from '@nestjs/common';
import { MQTT_COMMUNICATION } from './mqtt.tokens';
import { MqttBrokerService } from './mqtt-broker.service';

@Module({
	providers: [
		{ provide: MQTT_COMMUNICATION, useClass: MqttBrokerService },
	],
	exports: [MQTT_COMMUNICATION],
})
export class MqttModule {}

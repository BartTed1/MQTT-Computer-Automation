import { Module } from '@nestjs/common';
import { MQTT_COMMUNICATION } from './mqtt.tokens';
import { MqttBrokerService } from './mqtt-broker.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
	imports: [PersistenceModule],
	providers: [
		{ provide: MQTT_COMMUNICATION, useClass: MqttBrokerService },
	],
	exports: [MQTT_COMMUNICATION],
})
export class MqttModule {}

import { Module } from '@nestjs/common';
import { ControlModule } from './control/control.module';
import { RegistrationModule } from './registration/registration.module';
import { MqttModule } from './mqtt/mqtt.module';

@Module({
	imports: [ControlModule, RegistrationModule, MqttModule],
})
export class AppModule {}

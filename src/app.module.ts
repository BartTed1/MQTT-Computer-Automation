import { Module } from '@nestjs/common';
import { ControlModule } from './control/control.module';
import { RegistrationModule } from './registration/registration.module';
import { MqttModule } from './mqtt/mqtt.module';
import { SecurityModule } from './security/security.module';

@Module({
	imports: [ControlModule, RegistrationModule, MqttModule, SecurityModule],
})
export class AppModule {}

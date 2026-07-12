import { Module } from '@nestjs/common';
import { ControlModule } from './control/control.module';
import { RegistrationModule } from './registration/registration.module';

@Module({
	imports: [ControlModule, RegistrationModule],
})
export class AppModule {}

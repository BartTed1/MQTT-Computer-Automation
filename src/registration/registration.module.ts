import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
	imports: [PersistenceModule],
	controllers: [RegistrationController],
	providers: [RegistrationService],
})
export class RegistrationModule {}

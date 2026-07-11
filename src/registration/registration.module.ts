import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { CommonModule } from '../common/common.module';

@Module({
	imports: [PersistenceModule, CommonModule],
	controllers: [RegistrationController],
	providers: [RegistrationService],
})
export class RegistrationModule {}

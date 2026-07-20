import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { CommonModule } from '../common/common.module';

@Module({
	imports: [CommonModule],
	controllers: [SecurityController],
})
export class SecurityModule {}

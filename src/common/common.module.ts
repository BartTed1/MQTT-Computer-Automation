import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JsonEncryptionService } from './security/json-encryption.service';

@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true })],
	providers: [ApiKeyGuard, JsonEncryptionService],
	exports: [ApiKeyGuard, JsonEncryptionService],
})
export class CommonModule {}

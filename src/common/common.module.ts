import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JsonEncryptionService } from './security/json-encryption.service';
import { CommandSigningService } from './security/command-signing.service';

@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true })],
	providers: [ApiKeyGuard, JsonEncryptionService, CommandSigningService],
	exports: [ApiKeyGuard, JsonEncryptionService, CommandSigningService],
})
export class CommonModule {}

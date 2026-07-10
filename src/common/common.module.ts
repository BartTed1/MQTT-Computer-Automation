import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true })],
	providers: [ApiKeyGuard],
	exports: [ApiKeyGuard],
})
export class CommonModule {}

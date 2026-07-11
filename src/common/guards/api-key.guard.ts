import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { API_KEY_SYSTEMS_KEY } from '../decorators/api-key-auth.decorator';
import { ApiKeySystem } from './api-key-system.enum';

@Injectable()
export class ApiKeyGuard implements CanActivate {
	constructor(
		private readonly configService: ConfigService,
		private readonly reflector: Reflector,
	) {}

	canActivate(context: ExecutionContext): boolean {
		const allowedSystems =
			this.reflector.get<ApiKeySystem[]>(
				API_KEY_SYSTEMS_KEY,
				context.getHandler(),
			) ?? [];

		const configuredApiKeys = allowedSystems
			.map((system) => this.configService.get<string>(`API_KEY_${system}`))
			.filter((apiKey): apiKey is string => !!apiKey);

		if (configuredApiKeys.length === 0) {
			throw new UnauthorizedException(
				'API key authentication is not configured',
			);
		}

		const request = context.switchToHttp().getRequest<Request>();
		const providedApiKey = request.query.apiKey;
		if (
			!providedApiKey ||
			!configuredApiKeys.includes(providedApiKey as string)
		) {
			throw new UnauthorizedException('Invalid or missing API key');
		}

		return true;
	}
}

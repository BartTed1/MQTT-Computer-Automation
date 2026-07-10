import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
	constructor(private readonly configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		const expectedApiKey = this.configService.get<string>('API_KEY');
		if (!expectedApiKey) {
			throw new UnauthorizedException(
				'API key authentication is not configured',
			);
		}

		const providedApiKey = request.query.apiKey;
		if (!providedApiKey || providedApiKey !== expectedApiKey) {
			throw new UnauthorizedException('Invalid or missing API key');
		}

		return true;
	}
}

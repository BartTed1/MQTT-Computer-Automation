import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ApiKeySystem } from '../guards/api-key-system.enum';

export const API_KEY_SYSTEMS_KEY = 'apiKeySystems';

export const ApiKeyAuth = (...systems: ApiKeySystem[]) =>
	applyDecorators(
		SetMetadata(API_KEY_SYSTEMS_KEY, systems),
		UseGuards(ApiKeyGuard),
		ApiSecurity('api-key'),
		ApiUnauthorizedResponse({ description: 'Invalid or missing API key' }),
	);

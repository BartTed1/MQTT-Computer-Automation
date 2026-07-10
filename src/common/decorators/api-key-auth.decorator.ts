import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';

export const ApiKeyAuth = () =>
	applyDecorators(
		UseGuards(ApiKeyGuard),
		ApiSecurity('api-key'),
		ApiUnauthorizedResponse({ description: 'Invalid or missing API key' }),
	);

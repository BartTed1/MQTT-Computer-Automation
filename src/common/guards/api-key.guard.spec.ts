import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
	let configService: ConfigService;
	let guard: ApiKeyGuard;

	const createContext = (apiKey?: string): ExecutionContext =>
		({
			switchToHttp: () => ({
				getRequest: () => ({ query: { apiKey } }),
			}),
		} as unknown as ExecutionContext);

	beforeEach(() => {
		configService = { get: jest.fn() } as unknown as ConfigService;
		guard = new ApiKeyGuard(configService);
	});

	it('allows the request when the provided key matches the configured key', () => {
		(configService.get as jest.Mock).mockReturnValue('secret');

		expect(guard.canActivate(createContext('secret'))).toBe(true);
	});

	it('throws when no key is provided', () => {
		(configService.get as jest.Mock).mockReturnValue('secret');

		expect(() => guard.canActivate(createContext())).toThrow(
			UnauthorizedException,
		);
	});

	it('throws when the provided key does not match', () => {
		(configService.get as jest.Mock).mockReturnValue('secret');

		expect(() => guard.canActivate(createContext('wrong'))).toThrow(
			UnauthorizedException,
		);
	});

	it('throws when no API_KEY is configured', () => {
		(configService.get as jest.Mock).mockReturnValue(undefined);

		expect(() => guard.canActivate(createContext('anything'))).toThrow(
			UnauthorizedException,
		);
	});
});

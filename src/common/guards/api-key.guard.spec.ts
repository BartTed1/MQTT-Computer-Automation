import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeySystem } from './api-key-system.enum';

describe('ApiKeyGuard', () => {
	let configService: ConfigService;
	let reflector: Reflector;
	let guard: ApiKeyGuard;

	const createContext = (apiKey?: string): ExecutionContext =>
		({
			switchToHttp: () => ({
				getRequest: () => ({ query: { apiKey } }),
			}),
			getHandler: () => jest.fn(),
		} as unknown as ExecutionContext);

	beforeEach(() => {
		configService = { get: jest.fn() } as unknown as ConfigService;
		reflector = { get: jest.fn() } as unknown as Reflector;
		guard = new ApiKeyGuard(configService, reflector);
	});

	const mockAllowedSystems = (systems: ApiKeySystem[]) => {
		(reflector.get as jest.Mock).mockReturnValue(systems);
	};

	const mockConfiguredKey = (system: ApiKeySystem, value: string | undefined) => {
		(configService.get as jest.Mock).mockImplementation((key: string) =>
			key === `API_KEY_${system}` ? value : undefined,
		);
	};

	it('allows the request when the provided key matches the configured key for an allowed system', () => {
		mockAllowedSystems([ApiKeySystem.EXECUTION_SYS]);
		mockConfiguredKey(ApiKeySystem.EXECUTION_SYS, 'secret');

		expect(guard.canActivate(createContext('secret'))).toBe(true);
	});

	it('allows the request when the key matches any of multiple allowed systems', () => {
		mockAllowedSystems([
			ApiKeySystem.EXECUTION_SYS,
			ApiKeySystem.EXTERNAL_ORCHESTRATOR,
		]);
		(configService.get as jest.Mock).mockImplementation((key: string) => {
			if (key === `API_KEY_${ApiKeySystem.EXECUTION_SYS}`) return 'exec-secret';
			if (key === `API_KEY_${ApiKeySystem.EXTERNAL_ORCHESTRATOR}`)
				return 'orchestrator-secret';
			return undefined;
		});

		expect(guard.canActivate(createContext('orchestrator-secret'))).toBe(true);
	});

	it('throws when no key is provided', () => {
		mockAllowedSystems([ApiKeySystem.EXECUTION_SYS]);
		mockConfiguredKey(ApiKeySystem.EXECUTION_SYS, 'secret');

		expect(() => guard.canActivate(createContext())).toThrow(
			UnauthorizedException,
		);
	});

	it('throws when the provided key does not match', () => {
		mockAllowedSystems([ApiKeySystem.EXECUTION_SYS]);
		mockConfiguredKey(ApiKeySystem.EXECUTION_SYS, 'secret');

		expect(() => guard.canActivate(createContext('wrong'))).toThrow(
			UnauthorizedException,
		);
	});

	it('throws when the provided key belongs to a system not allowed for this resource', () => {
		mockAllowedSystems([ApiKeySystem.EXECUTION_SYS]);
		(configService.get as jest.Mock).mockImplementation((key: string) => {
			if (key === `API_KEY_${ApiKeySystem.EXECUTION_SYS}`) return 'exec-secret';
			if (key === `API_KEY_${ApiKeySystem.EXTERNAL_ORCHESTRATOR}`)
				return 'orchestrator-secret';
			return undefined;
		});

		expect(() =>
			guard.canActivate(createContext('orchestrator-secret')),
		).toThrow(UnauthorizedException);
	});

	it('throws when none of the allowed systems have a configured key', () => {
		mockAllowedSystems([ApiKeySystem.EXECUTION_SYS]);
		mockConfiguredKey(ApiKeySystem.EXECUTION_SYS, undefined);

		expect(() => guard.canActivate(createContext('anything'))).toThrow(
			UnauthorizedException,
		);
	});

	it('throws when no systems are allowed for this resource', () => {
		mockAllowedSystems([]);

		expect(() => guard.canActivate(createContext('anything'))).toThrow(
			UnauthorizedException,
		);
	});
});

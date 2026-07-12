import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { JsonEncryptionService } from './json-encryption.service';

describe('JsonEncryptionService', () => {
	const validKey = randomBytes(32).toString('hex');

	const createService = (configuredKey: string | undefined) => {
		const configService = {
			get: jest.fn().mockReturnValue(configuredKey),
		} as unknown as ConfigService;

		return new JsonEncryptionService(configService);
	};

	it('encrypts a payload into a token distinct from the plaintext', () => {
		const service = createService(validKey);
		const payload = { machineId: 'm-1', machineSecret: 's-1', issuedAt: 'now' };

		const token = service.encrypt(payload);

		expect(token).not.toContain('machineId');
		expect(token).not.toContain('m-1');
	});

	it('produces a different token for the same payload on each call', () => {
		const service = createService(validKey);
		const payload = { machineId: 'm-1' };

		expect(service.encrypt(payload)).not.toBe(service.encrypt(payload));
	});

	it('round-trips a payload through encrypt and decrypt', () => {
		const service = createService(validKey);
		const payload = { machineId: 'm-1', machineSecret: 's-1', issuedAt: 'now' };

		const token = service.encrypt(payload);

		expect(service.decrypt(token)).toEqual(payload);
	});

	it('throws when the key is not configured', () => {
		const service = createService(undefined);

		expect(() => service.encrypt({ a: 1 })).toThrow(
			'REGISTRATION_TOKEN_KEY is not configured',
		);
	});

	it('throws when the configured key is not 32 bytes', () => {
		const service = createService('deadbeef');

		expect(() => service.encrypt({ a: 1 })).toThrow(
			'REGISTRATION_TOKEN_KEY must be a 32-byte hex string',
		);
	});

	it('throws when decrypting a token with a mismatched key', () => {
		const encryptor = createService(validKey);
		const otherService = createService(randomBytes(32).toString('hex'));

		const token = encryptor.encrypt({ a: 1 });

		expect(() => otherService.decrypt(token)).toThrow();
	});
});

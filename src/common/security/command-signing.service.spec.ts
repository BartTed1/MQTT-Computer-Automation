import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, verify as cryptoVerify } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CommandSigningService } from './command-signing.service';

describe('CommandSigningService', () => {
	let tempDir: string;

	const writeKey = (fileName: string, pem: string): string => {
		const path = join(tempDir, fileName);
		writeFileSync(path, pem);
		return path;
	};

	const createService = (keyPath: string | undefined) => {
		const configService = {
			get: jest.fn().mockReturnValue(keyPath),
		} as unknown as ConfigService;

		return new CommandSigningService(configService);
	};

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'command-signing-spec-'));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it('signs data such that it verifies against the independently-derived public key', () => {
		const { privateKey, publicKey } = generateKeyPairSync('ed25519');
		const keyPath = writeKey(
			'key.pem',
			privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
		);
		const service = createService(keyPath);

		const signature = service.sign('some-canonical-payload');

		const verified = cryptoVerify(
			null,
			new Uint8Array(Buffer.from('some-canonical-payload', 'utf8')),
			publicKey,
			new Uint8Array(Buffer.from(signature, 'base64')),
		);
		expect(verified).toBe(true);
	});

	it('returns a PEM public key matching the one derivable from the same private key', () => {
		const { privateKey } = generateKeyPairSync('ed25519');
		const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
		const keyPath = writeKey('key.pem', privatePem);
		const service = createService(keyPath);

		const publicKeyPem = service.getPublicKeyPem();

		expect(publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
	});

	it('detects tampering with the signed data', () => {
		const { privateKey, publicKey } = generateKeyPairSync('ed25519');
		const keyPath = writeKey(
			'key.pem',
			privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
		);
		const service = createService(keyPath);

		const signature = service.sign('original-payload');

		const verified = cryptoVerify(
			null,
			new Uint8Array(Buffer.from('tampered-payload', 'utf8')),
			publicKey,
			new Uint8Array(Buffer.from(signature, 'base64')),
		);
		expect(verified).toBe(false);
	});

	it('throws when COMMAND_SIGNING_PRIVATE_KEY_PATH is not configured', () => {
		const service = createService(undefined);

		expect(() => service.sign('data')).toThrow(
			'COMMAND_SIGNING_PRIVATE_KEY_PATH is not configured',
		);
	});

	it('throws a descriptive error when the key file does not exist', () => {
		const service = createService(join(tempDir, 'missing.pem'));

		expect(() => service.sign('data')).toThrow(
			/Failed to read COMMAND_SIGNING_PRIVATE_KEY_PATH/,
		);
	});

	it('throws when the configured key is not an Ed25519 key', () => {
		const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
		const keyPath = writeKey(
			'key.pem',
			privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
		);
		const service = createService(keyPath);

		expect(() => service.sign('data')).toThrow(
			'COMMAND_SIGNING_PRIVATE_KEY_PATH must be an Ed25519 private key, got "rsa"',
		);
	});
});

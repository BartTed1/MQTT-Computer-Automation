import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class JsonEncryptionService {
	constructor(private readonly configService: ConfigService) {}

	encrypt(payload: unknown): string {
		const key = new Uint8Array(this.getKey());
		const iv = new Uint8Array(randomBytes(IV_LENGTH));
		const cipher = createCipheriv(ALGORITHM, key, iv);

		const update = new Uint8Array(
			cipher.update(JSON.stringify(payload), 'utf8'),
		);
		const final = new Uint8Array(cipher.final());
		const authTag = new Uint8Array(cipher.getAuthTag());

		return Buffer.concat([iv, authTag, update, final]).toString('base64url');
	}

	decrypt<T>(token: string): T {
		const key = new Uint8Array(this.getKey());
		const data = Buffer.from(token, 'base64url');
		const iv = new Uint8Array(data.subarray(0, IV_LENGTH));
		const authTag = new Uint8Array(
			data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH),
		);
		const ciphertext = new Uint8Array(data.subarray(IV_LENGTH + AUTH_TAG_LENGTH));

		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		const update = new Uint8Array(decipher.update(ciphertext));
		const final = new Uint8Array(decipher.final());

		return JSON.parse(
			Buffer.concat([update, final]).toString('utf8'),
		) as T;
	}

	private getKey(): Buffer {
		const configuredKey = this.configService.get<string>(
			'REGISTRATION_TOKEN_KEY',
		);
		if (!configuredKey) {
			throw new Error('REGISTRATION_TOKEN_KEY is not configured');
		}

		const key = Buffer.from(configuredKey, 'hex');
		if (key.length !== 32) {
			throw new Error('REGISTRATION_TOKEN_KEY must be a 32-byte hex string');
		}

		return key;
	}
}

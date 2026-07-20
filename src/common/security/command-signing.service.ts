import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey, createPublicKey, KeyObject, sign as cryptoSign } from 'crypto';
import { readFileSync } from 'fs';

@Injectable()
export class CommandSigningService {
	constructor(private readonly configService: ConfigService) {}

	sign(data: string): string {
		const privateKey = this.getPrivateKey();
		const dataBytes = new Uint8Array(Buffer.from(data, 'utf8'));
		return cryptoSign(null, dataBytes, privateKey).toString('base64');
	}

	getPublicKeyPem(): string {
		const publicKey = createPublicKey(this.getPrivateKey());
		return publicKey.export({ type: 'spki', format: 'pem' }) as string;
	}

	private getPrivateKey(): KeyObject {
		const keyPath = this.configService.get<string>(
			'COMMAND_SIGNING_PRIVATE_KEY_PATH',
		);
		if (!keyPath) {
			throw new Error('COMMAND_SIGNING_PRIVATE_KEY_PATH is not configured');
		}

		let pem: Buffer;
		try {
			pem = readFileSync(keyPath);
		} catch (err) {
			const cause = err instanceof Error ? err.message : String(err);
			throw new Error(
				`Failed to read COMMAND_SIGNING_PRIVATE_KEY_PATH ("${keyPath}"): ${cause}`,
			);
		}

		const privateKey = createPrivateKey(pem);
		if (privateKey.asymmetricKeyType !== 'ed25519') {
			throw new Error(
				`COMMAND_SIGNING_PRIVATE_KEY_PATH must be an Ed25519 private key, got "${privateKey.asymmetricKeyType}"`,
			);
		}

		return privateKey;
	}
}

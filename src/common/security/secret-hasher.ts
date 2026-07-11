import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export async function hashSecret(secret: string): Promise<string> {
	const salt = randomBytes(SALT_BYTES).toString('hex');
	const derivedKey = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;
	return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifySecret(
	secret: string,
	storedHash: string,
): Promise<boolean> {
	const [salt, key] = storedHash.split(':');
	if (!salt || !key) {
		return false;
	}

	const keyBuffer = Buffer.from(key, 'hex');
	const derivedKey = (await scrypt(secret, salt, keyBuffer.length)) as Buffer;

	return (
		keyBuffer.length === derivedKey.length &&
		timingSafeEqual(new Uint8Array(keyBuffer), new Uint8Array(derivedKey))
	);
}

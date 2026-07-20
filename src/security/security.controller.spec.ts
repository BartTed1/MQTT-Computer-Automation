import { SecurityController } from './security.controller';
import { CommandSigningService } from '../common/security/command-signing.service';

describe('SecurityController', () => {
	it('returns the server public key and algorithm', () => {
		const commandSigningService = {
			sign: jest.fn(),
			getPublicKeyPem: jest.fn().mockReturnValue('-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n'),
		} as unknown as jest.Mocked<CommandSigningService>;

		const controller = new SecurityController(commandSigningService);

		expect(controller.getPublicKey()).toEqual({
			publicKeyPem: '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n',
			algorithm: 'ed25519',
		});
	});
});

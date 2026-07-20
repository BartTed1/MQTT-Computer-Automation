import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandSigningService } from '../common/security/command-signing.service';

@ApiTags('security')
@Controller('security')
export class SecurityController {
	constructor(private readonly commandSigningService: CommandSigningService) {}

	@ApiOperation({
		summary: "Get the server's Ed25519 public key used to verify signed commands",
	})
	@Header('Cache-Control', 'public, max-age=3600')
	@Get('public-key')
	getPublicKey(): { publicKeyPem: string; algorithm: 'ed25519' } {
		return {
			publicKeyPem: this.commandSigningService.getPublicKeyPem(),
			algorithm: 'ed25519',
		};
	}
}

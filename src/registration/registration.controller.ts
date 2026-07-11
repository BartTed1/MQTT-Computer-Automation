import { Body, Controller, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SelfRegistrationRequestDto } from './interfaces/self-registration-request.dto';
import { ApiOperation } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { ApiKeyAuth } from '../common/decorators/api-key-auth.decorator';
import { ApiKeySystem } from '../common/guards/api-key-system.enum';

@Controller('registration')
export class RegistrationController {
	constructor(private readonly registrationService: RegistrationService) {}

	@ApiOperation({ summary: 'Register a new machine for self-service' })
	@ApiKeyAuth(ApiKeySystem.EXECUTION_SYS)
	@Post('self')
	@HttpCode(HttpStatus.CREATED)
	@Header('Cache-Control', 'no-store')
	async selfRegister(
		@Body() registrationData: SelfRegistrationRequestDto
	): Promise<void> {
		await this.registrationService.selfRegister(
			registrationData.machineId, 
			registrationData.machineSecret
		);
	}
}

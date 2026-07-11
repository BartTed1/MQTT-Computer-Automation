import { Body, Controller, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SelfRegistrationRequestDto } from './interfaces/self-registration-request.dto';
import { ApiOperation } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';

@Controller('registration')
export class RegistrationController {
	constructor(private readonly registrationService: RegistrationService) {}

	@ApiOperation({ summary: 'Register a new machine for self-service' })
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

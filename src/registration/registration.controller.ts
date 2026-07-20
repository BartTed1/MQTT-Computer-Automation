import { Body, Controller, Delete, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { SelfRegistrationRequestDto } from './interfaces/self-registration-request.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { ApiKeyAuth } from '../common/decorators/api-key-auth.decorator';
import { ApiKeySystem } from '../common/guards/api-key-system.enum';
import { RegistrationConfirmationRequestDto } from './interfaces/registration-confirmation-request.dto';
import { UUID } from 'crypto';

@ApiTags('registration')
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
	): Promise<{ token: string }> {
		const token = await this.registrationService.selfRegister(
			registrationData.machineId,
			registrationData.machineSecret
		);

		return { token };
	}

	@ApiOperation({ summary: 'Confirm registration from external orchestrator' })
	@ApiKeyAuth(ApiKeySystem.EXTERNAL_ORCHESTRATOR)
	@Post('confirm')
	@HttpCode(HttpStatus.OK)
	@Header('Cache-Control', 'no-store')
	async confirmRegistration(
		@Body() registrationData: RegistrationConfirmationRequestDto
	): Promise<{ machineId: UUID }> {
		return this.registrationService.confirmRegistration(registrationData.token);
	}

	@ApiOperation({ summary: 'Revoke registration from external orchestrator' })
	@ApiKeyAuth(ApiKeySystem.EXTERNAL_ORCHESTRATOR)
	@Delete('revoke/:machineId')
	@HttpCode(HttpStatus.OK)
	@Header('Cache-Control', 'no-store')
	async revokeRegistrationFromOrchestrator(
		@Param('machineId', new ParseUUIDPipe({ version: '4' })) machineId: UUID,
	): Promise<void> {
		await this.registrationService.revokeRegistration(machineId);
	}
}

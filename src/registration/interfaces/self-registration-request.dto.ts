import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';
import { UUID } from 'crypto';

export class SelfRegistrationRequestDto {
	@IsUUID('4', { message: 'machineId must be a valid UUID v4' })
	machineId: UUID;

	@IsNotEmpty({ message: 'machineSecret should not be empty' })
	@IsString({ message: 'machineSecret must be a string' })
	@Length(36, 36, { message: 'machineSecret must be exactly 36 characters long' })
	machineSecret: string;
}
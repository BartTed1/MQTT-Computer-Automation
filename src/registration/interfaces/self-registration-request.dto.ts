import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';
import { UUID } from 'crypto';

export class SelfRegistrationRequestDto {
	@ApiProperty({ example: '253f6e64-2a0e-4d72-a481-2b8858f1632e' })
	@IsUUID('4', { message: 'machineId must be a valid UUID v4' })
	machineId: UUID;

	@ApiProperty({ example: '03ec190b-f62b-4d69-af9c-2c34d797cfaf' })
	@IsNotEmpty({ message: 'machineSecret should not be empty' })
	@IsString({ message: 'machineSecret must be a string' })
	@Length(36, 36, { message: 'machineSecret must be exactly 36 characters long' })
	machineSecret: string;
}
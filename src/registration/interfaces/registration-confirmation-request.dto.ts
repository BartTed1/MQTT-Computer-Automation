import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegistrationConfirmationRequestDto {
	@IsNotEmpty({ message: 'token should not be empty' })
	@IsString({ message: 'token must be a string' })
	@Matches(/^[A-Za-z0-9_-]+$/, {
		message: 'token must be a valid base64url-encoded string',
	})
	token: string;
}
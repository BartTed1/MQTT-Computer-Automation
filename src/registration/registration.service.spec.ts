import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { RegistrationService } from './registration.service';
import { MachinesRepository } from '../persistence/interfaces/machines-repository.interface';
import { JsonEncryptionService } from '../common/security/json-encryption.service';
import { Machine } from '../persistence/interfaces/machine.interface';

describe('RegistrationService', () => {
	const machineId = '253f6e64-2a0e-4d72-a481-2b8858f1632e' as UUID;
	const machineSecret = '03ec190b-f62b-4d69-af9c-2c34d797cfaf';

	let machinesRepository: jest.Mocked<MachinesRepository>;
	let jsonEncryptionService: jest.Mocked<JsonEncryptionService>;
	let configService: ConfigService;
	let service: RegistrationService;

	const createService = (ttlMinutes: string | undefined) => {
		machinesRepository = {
			findAll: jest.fn(),
			findById: jest.fn(),
			findByMachineId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		};
		jsonEncryptionService = {
			encrypt: jest.fn(),
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<JsonEncryptionService>;
		configService = {
			get: jest.fn().mockReturnValue(ttlMinutes),
		} as unknown as ConfigService;

		return new RegistrationService(
			machinesRepository,
			jsonEncryptionService,
			configService,
		);
	};

	beforeEach(() => {
		service = createService('15');
	});

	describe('confirmRegistration', () => {
		const existingMachine: Machine = {
			id: 'internal-id',
			machineId,
			machineSecretHash: 'old-hash',
			registrationStatus: 'self',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		it('confirms the machine when the token was issued within the TTL', async () => {
			const issuedAt = new Date(Date.now() - 5 * 60_000).toISOString();
			jsonEncryptionService.decrypt.mockReturnValue({
				machineId,
				machineSecret,
				issuedAt,
			});
			machinesRepository.findByMachineId.mockReturnValue(existingMachine);

			await service.confirmRegistration('token');

			expect(machinesRepository.update).toHaveBeenCalledWith(
				existingMachine.id,
				expect.objectContaining({ registrationStatus: 'confirmed' }),
			);
		});

		it('rejects a token issued more than the configured TTL ago', async () => {
			const issuedAt = new Date(Date.now() - 16 * 60_000).toISOString();
			jsonEncryptionService.decrypt.mockReturnValue({
				machineId,
				machineSecret,
				issuedAt,
			});

			await expect(service.confirmRegistration('token')).rejects.toThrow(
				UnauthorizedException,
			);
			expect(machinesRepository.findByMachineId).not.toHaveBeenCalled();
		});

		it('throws when REGISTRATION_TOKEN_TTL_MINUTES is not configured', async () => {
			service = createService(undefined);
			jsonEncryptionService.decrypt.mockReturnValue({
				machineId,
				machineSecret,
				issuedAt: new Date().toISOString(),
			});

			await expect(service.confirmRegistration('token')).rejects.toThrow(
				'REGISTRATION_TOKEN_TTL_MINUTES is not configured',
			);
		});

		it('throws when the machine no longer exists', async () => {
			const issuedAt = new Date().toISOString();
			jsonEncryptionService.decrypt.mockReturnValue({
				machineId,
				machineSecret,
				issuedAt,
			});
			machinesRepository.findByMachineId.mockReturnValue(undefined);

			await expect(service.confirmRegistration('token')).rejects.toThrow(
				ConflictException,
			);
		});
	});
});

import {
	ConflictException,
	Inject,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, UUID } from 'crypto';
import { MachinesRepository } from '../persistence/interfaces/machines-repository.interface';
import { MACHINES_REPOSITORY } from '../persistence/persistence.tokens';
import { Machine } from '../persistence/interfaces/machine.interface';
import { hashSecret } from '../common/security/secret-hasher';
import { JsonEncryptionService } from '../common/security/json-encryption.service';

@Injectable()
export class RegistrationService {
	constructor(
		@Inject(MACHINES_REPOSITORY)
		private readonly machinesRepository: MachinesRepository,

		private readonly jsonEncryptionService: JsonEncryptionService,

		private readonly configService: ConfigService,
	) {}

	async selfRegister(machineId: UUID, machineSecret: string): Promise<string> {
		const existingMachine: Machine | undefined = this.machinesRepository.findByMachineId(machineId);
		if (existingMachine) {
			throw new ConflictException(`Machine with ID ${machineId} already exists.`);
		}

		const machineSecretHash = await hashSecret(machineSecret);

		this.machinesRepository.create({
			id: randomUUID(),
			machineId,
			machineSecretHash: machineSecretHash,
			registrationStatus: 'self',
		});

		return this.jsonEncryptionService.encrypt({
			machineId,
			machineSecret,
			issuedAt: new Date().toISOString(),
		});
	}

	async confirmRegistration(token: string) {
		const decryptedData = this.jsonEncryptionService.decrypt<{
			machineId: UUID;
			machineSecret: string;
			issuedAt: string;
		}>(token);

		this.assertTokenNotExpired(decryptedData.issuedAt);

		const existingMachine: Machine | undefined = this.machinesRepository.findByMachineId(decryptedData.machineId);
		if (!existingMachine) {
			throw new ConflictException(`Machine with ID ${decryptedData.machineId} does not exist.`);
		}

		if (existingMachine.registrationStatus === 'confirmed') {
			throw new ConflictException(`Machine with ID ${decryptedData.machineId} is already confirmed.`);
		}

		const machineSecretHash = await hashSecret(decryptedData.machineSecret);

		this.machinesRepository.update(existingMachine.id, {
			machineSecretHash,
			registrationStatus: 'confirmed',
		});
	}

	private assertTokenNotExpired(issuedAt: string): void {
		const ttlMinutes = Number(
			this.configService.get<string>('REGISTRATION_TOKEN_TTL_MINUTES'),
		);
		if (!ttlMinutes || Number.isNaN(ttlMinutes)) {
			throw new Error('REGISTRATION_TOKEN_TTL_MINUTES is not configured');
		}

		const expiresAt = new Date(issuedAt).getTime() + ttlMinutes * 60_000;
		if (Date.now() > expiresAt) {
			throw new UnauthorizedException('Registration token has expired');
		}
	}

	async revokeRegistration(machineId: UUID) {
		const existingMachine: Machine | undefined = this.machinesRepository.findByMachineId(machineId);
		if (!existingMachine) {
			throw new ConflictException(`Machine with ID ${machineId} does not exist.`);
		}

		if (existingMachine.registrationStatus === 'revoked') {
			throw new ConflictException(`Machine with ID ${machineId} is already revoked.`);
		}

		this.machinesRepository.update(existingMachine.id, {
			registrationStatus: 'revoked',
		});
	}
}
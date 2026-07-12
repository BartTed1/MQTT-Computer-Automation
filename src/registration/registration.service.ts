import { ConflictException, Inject, Injectable } from '@nestjs/common';
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
}
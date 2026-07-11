import { Inject, Injectable } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';
import { MachinesRepository } from '../persistence/interfaces/machines-repository.interface';
import { MACHINES_REPOSITORY } from '../persistence/persistence.tokens';

@Injectable()
export class RegistrationService {
	constructor(
		@Inject(MACHINES_REPOSITORY)
		private readonly machinesRepository: MachinesRepository,
	) {}

	async selfRegister(machineId: UUID, machineSecret: string): Promise<boolean> {
		this.machinesRepository.create({
			id: randomUUID(),
			machineId,
			machineSecretHash: machineSecret,
			registrationStatus: 'self',
		});

		return true;
	}
}
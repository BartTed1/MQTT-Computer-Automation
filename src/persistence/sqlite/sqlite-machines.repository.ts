import {
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
	CreateMachineInput,
	Machine,
	UpdateMachineInput,
} from '../interfaces/machine.interface';
import { MachinesRepository } from '../interfaces/machines-repository.interface';
import { machines } from '../schema';
import { DRIZZLE_CONNECTION, DrizzleDatabase } from './sqlite-connection.provider';

@Injectable()
export class SqliteMachinesRepository implements MachinesRepository {
	constructor(
		@Inject(DRIZZLE_CONNECTION) private readonly db: DrizzleDatabase,
	) {}

	findAll(): Machine[] {
		return this.db.select().from(machines).all() as Machine[];
	}

	findById(id: string): Machine | undefined {
		return this.db
			.select()
			.from(machines)
			.where(eq(machines.id, id))
			.get() as Machine | undefined;
	}

	findByMachineId(machineId: string): Machine | undefined {
		return this.db
			.select()
			.from(machines)
			.where(eq(machines.machineId, machineId))
			.get() as Machine | undefined;
	}

	create(input: CreateMachineInput): Machine {
		if (this.findById(input.id)) {
			throw new ConflictException(`Machine "${input.id}" already exists`);
		}

		const now = new Date().toISOString();
		const machine: Machine = {
			id: input.id,
			machineId: input.machineId,
			machineSecretHash: input.machineSecretHash,
			registrationStatus: input.registrationStatus,
			createdAt: now,
			updatedAt: now,
		};

		this.db.insert(machines).values(machine).run();

		return machine;
	}

	update(id: string, input: UpdateMachineInput): Machine {
		const existing = this.findById(id);
		if (!existing) {
			throw new NotFoundException(`Machine "${id}" not found`);
		}

		const updated: Machine = {
			...existing,
			...input,
			updatedAt: new Date().toISOString(),
		};

		this.db
			.update(machines)
			.set({
				machineId: updated.machineId,
				machineSecretHash: updated.machineSecretHash,
				updatedAt: updated.updatedAt,
			})
			.where(eq(machines.id, id))
			.run();

		return updated;
	}

	delete(id: string): void {
		this.db.delete(machines).where(eq(machines.id, id)).run();
	}
}

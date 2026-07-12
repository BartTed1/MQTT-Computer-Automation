import {
	CreateMachineInput,
	Machine,
	UpdateMachineInput,
} from './machine.interface';

export interface MachinesRepository {
	findAll(): Machine[];
	findById(id: string): Machine | undefined;
	findByMachineId(machineId: string): Machine | undefined;
	create(input: CreateMachineInput): Machine;
	update(id: string, input: UpdateMachineInput): Machine;
	delete(id: string): void;
}

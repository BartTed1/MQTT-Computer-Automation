export interface Machine {
	id: string;
	machineUUID: string;
	machineSecretHash: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateMachineInput {
	id: string;
	machineUUID: string;
	machineSecretHash: string;
}

export interface UpdateMachineInput {
	machineUUID?: string;
	machineSecretHash?: string;
}

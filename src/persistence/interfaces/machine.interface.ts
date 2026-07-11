export interface Machine {
	id: string;
	machineId: string;
	machineSecretHash: string;
	registrationStatus: 'self' | 'confirmed' | 'revoked';
	createdAt: string;
	updatedAt: string;
}

export interface CreateMachineInput {
	id: string;
	machineId: string;
	machineSecretHash: string;
	registrationStatus: 'self'
}

export interface UpdateMachineInput {
	machineId?: string;
	machineSecretHash?: string;
	registrationStatus?: 'self' | 'confirmed' | 'revoked';
}

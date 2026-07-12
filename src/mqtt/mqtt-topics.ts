export function machineInTopic(machineId: string): string {
	return `machines/${machineId}/in`;
}

export function machineOutTopic(machineId: string): string {
	return `machines/${machineId}/out`;
}

export interface SignableCommand {
	machineId: string;
	command: string;
	params: string[];
	timestamp: number;
}

// ASCII Unit Separator (0x1F): cannot realistically appear in a machineId
// (UUID) or command name, so field boundaries stay unambiguous.
const FIELD_SEPARATOR = '\u001f';

export function buildCanonicalCommandString(payload: SignableCommand): string {
	return [
		payload.machineId,
		payload.command,
		payload.params.join(','),
		String(payload.timestamp),
	].join(FIELD_SEPARATOR);
}

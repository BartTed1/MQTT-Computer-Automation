import { buildCanonicalCommandString, SignableCommand } from './command-canonical-payload';

describe('buildCanonicalCommandString', () => {
	const base: SignableCommand = {
		machineId: 'm-1',
		command: 'restart',
		params: ['a', 'b'],
		timestamp: 1753000000,
	};

	it('is deterministic for the same input', () => {
		expect(buildCanonicalCommandString(base)).toBe(buildCanonicalCommandString(base));
	});

	it('changes when machineId changes', () => {
		const other = { ...base, machineId: 'm-2' };
		expect(buildCanonicalCommandString(other)).not.toBe(buildCanonicalCommandString(base));
	});

	it('changes when command changes', () => {
		const other = { ...base, command: 'shutdown' };
		expect(buildCanonicalCommandString(other)).not.toBe(buildCanonicalCommandString(base));
	});

	it('changes when params change', () => {
		const other = { ...base, params: ['a', 'c'] };
		expect(buildCanonicalCommandString(other)).not.toBe(buildCanonicalCommandString(base));
	});

	it('changes when timestamp changes', () => {
		const other = { ...base, timestamp: base.timestamp + 1 };
		expect(buildCanonicalCommandString(other)).not.toBe(buildCanonicalCommandString(base));
	});
});

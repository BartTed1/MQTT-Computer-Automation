import { hashSecret, verifySecret } from './secret-hasher';

describe('secret-hasher', () => {
	it('produces a salt:hash pair distinct from the plain secret', async () => {
		const hash = await hashSecret('my-secret');

		expect(hash).not.toBe('my-secret');
		expect(hash.split(':')).toHaveLength(2);
	});

	it('produces a different hash for the same secret on each call', async () => {
		const first = await hashSecret('my-secret');
		const second = await hashSecret('my-secret');

		expect(first).not.toBe(second);
	});

	it('verifies a matching secret against its hash', async () => {
		const hash = await hashSecret('my-secret');

		await expect(verifySecret('my-secret', hash)).resolves.toBe(true);
	});

	it('rejects a non-matching secret', async () => {
		const hash = await hashSecret('my-secret');

		await expect(verifySecret('wrong-secret', hash)).resolves.toBe(false);
	});

	it('rejects a malformed stored hash', async () => {
		await expect(verifySecret('my-secret', 'not-a-valid-hash')).resolves.toBe(
			false,
		);
	});
});

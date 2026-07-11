import Database = require('better-sqlite3');
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as schema from '../schema';
import { createSchema, DrizzleDatabase } from './sqlite-connection.provider';
import { SqliteMachinesRepository } from './sqlite-machines.repository';

describe('SqliteMachinesRepository', () => {
	let sqlite: Database.Database;
	let db: DrizzleDatabase;
	let repository: SqliteMachinesRepository;

	beforeEach(() => {
		sqlite = new Database(':memory:');
		createSchema(sqlite);
		db = drizzle(sqlite, { schema });
		repository = new SqliteMachinesRepository(db);
	});

	afterEach(() => {
		sqlite.close();
	});

	it('creates and finds a machine by id', () => {
		const created = repository.create({
			id: 'pc-1',
			machineUUID: 'uuid-1',
			machineSecretHash: 'hash-1',
		});

		expect(created.machineUUID).toBe('uuid-1');
		expect(repository.findById('pc-1')).toEqual(created);
	});

	it('throws a conflict when creating a duplicate id', () => {
		repository.create({
			id: 'pc-1',
			machineUUID: 'uuid-1',
			machineSecretHash: 'hash-1',
		});

		expect(() =>
			repository.create({
				id: 'pc-1',
				machineUUID: 'uuid-2',
				machineSecretHash: 'hash-2',
			}),
		).toThrow(ConflictException);
	});

	it('returns all machines', () => {
		repository.create({
			id: 'pc-1',
			machineUUID: 'uuid-1',
			machineSecretHash: 'hash-1',
		});
		repository.create({
			id: 'pc-2',
			machineUUID: 'uuid-2',
			machineSecretHash: 'hash-2',
		});

		expect(repository.findAll()).toHaveLength(2);
	});

	it('updates an existing machine', () => {
		repository.create({
			id: 'pc-1',
			machineUUID: 'uuid-1',
			machineSecretHash: 'hash-1',
		});

		const updated = repository.update('pc-1', { machineSecretHash: 'hash-2' });

		expect(updated.machineSecretHash).toBe('hash-2');
		expect(repository.findById('pc-1')?.machineSecretHash).toBe('hash-2');
	});

	it('throws not found when updating an unknown machine', () => {
		expect(() =>
			repository.update('missing', { machineSecretHash: 'hash-2' }),
		).toThrow(NotFoundException);
	});

	it('deletes a machine', () => {
		repository.create({
			id: 'pc-1',
			machineUUID: 'uuid-1',
			machineSecretHash: 'hash-1',
		});

		repository.delete('pc-1');

		expect(repository.findById('pc-1')).toBeUndefined();
	});
});

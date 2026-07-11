import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const machines = sqliteTable('machines', {
	id: text('id').primaryKey(),
	machineUUID: text('machine_uuid').notNull(),
	machineSecretHash: text('machine_secret_hash').notNull(),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
});

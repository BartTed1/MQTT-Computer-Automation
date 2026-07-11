import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const REGISTRATION_STATUS = ['self', 'confirmed', 'revoked'] as const;
export type MachineStatus = (typeof REGISTRATION_STATUS)[number];

export const machines = sqliteTable('machines', {
	id: text('id').primaryKey(),
	machineId: text('machine_id').notNull(),
	machineSecretHash: text('machine_secret_hash').notNull(),
	registrationStatus: text('registration_status', { enum: REGISTRATION_STATUS }).notNull().default('self'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
});

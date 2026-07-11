import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database = require('better-sqlite3');
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from '../schema';

export const DRIZZLE_CONNECTION = Symbol('DRIZZLE_CONNECTION');

export type DrizzleDatabase = BetterSQLite3Database<typeof schema>;

export function createSchema(sqlite: Database.Database): void {
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS machines (
			id TEXT PRIMARY KEY,
			machine_id TEXT NOT NULL,
			machine_secret_hash TEXT NOT NULL,
			registration_status TEXT NOT NULL DEFAULT 'self',
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)
	`);
}

export const DrizzleConnectionProvider: FactoryProvider<DrizzleDatabase> = {
	provide: DRIZZLE_CONNECTION,
	inject: [ConfigService],
	useFactory: (configService: ConfigService) => {
		const databasePath =
			configService.get<string>('DATABASE_PATH') ?? './data/db.sqlite';
		if (databasePath !== ':memory:') {
			mkdirSync(dirname(databasePath), { recursive: true });
		}

		const sqlite = new Database(databasePath);
		sqlite.pragma('journal_mode = WAL');
		createSchema(sqlite);

		return drizzle(sqlite, { schema });
	},
};

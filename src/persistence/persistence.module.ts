import { Module } from '@nestjs/common';
import { DrizzleConnectionProvider } from './sqlite/sqlite-connection.provider';
import { SqliteMachinesRepository } from './sqlite/sqlite-machines.repository';
import { MACHINES_REPOSITORY } from './persistence.tokens';

@Module({
	providers: [
		DrizzleConnectionProvider,
		{ provide: MACHINES_REPOSITORY, useClass: SqliteMachinesRepository },
	],
	exports: [MACHINES_REPOSITORY],
})
export class PersistenceModule {}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ControlModule } from './../src/control/control.module';

describe('ControlController (e2e)', () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [ControlModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

	it('should bootstrap the application', () => {
		expect(app).toBeDefined();
	});
});

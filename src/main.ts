import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());

	const config = new DocumentBuilder()
		.setTitle('MQTT Windows Automation')
		.setDescription('API for triggering and observing MQTT-driven commands')
		.setVersion('1.0')
		.addApiKey({ type: 'apiKey', name: 'apiKey', in: 'query' }, 'api-key')
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('docs', app, document);

	await app.listen(3000);
}
bootstrap();

import { ConfigService } from '@nestjs/config';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ControlService } from './control.service';
import { MqttCommunication } from '../mqtt/interfaces/mqtt.interface';
import { CommandSigningService } from '../common/security/command-signing.service';
import { buildCanonicalCommandString } from './command-canonical-payload';

describe('ControlService', () => {
	let mqttCommunication: jest.Mocked<MqttCommunication>;
	let commandSigningService: jest.Mocked<CommandSigningService>;
	let configService: ConfigService;

	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	const createService = (timeoutSeconds: string | undefined) => {
		mqttCommunication = {
			publish: jest.fn(),
			subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
		};
		commandSigningService = {
			sign: jest.fn().mockReturnValue('mock-signature'),
			getPublicKeyPem: jest.fn(),
		} as unknown as jest.Mocked<CommandSigningService>;
		configService = {
			get: jest.fn().mockReturnValue(timeoutSeconds),
		} as unknown as ConfigService;

		return new ControlService(mqttCommunication, configService, commandSigningService);
	};

	it('publishes a signed, timestamped message and subscribes to the reply topic', () => {
		const service = createService('60');

		service.publishAndObserve('machine-1', 'restart', 'a,b').subscribe();

		expect(mqttCommunication.publish).toHaveBeenCalledTimes(1);
		const [topic, rawMessage, qos] = mqttCommunication.publish.mock.calls[0];
		expect(topic).toBe('machines/machine-1/in');
		expect(qos).toBe(1);

		const message = JSON.parse(rawMessage as string);
		expect(message.machineId).toBe('machine-1');
		expect(message.command).toBe('restart');
		expect(message.params).toEqual(['a', 'b']);
		expect(typeof message.timestamp).toBe('number');
		expect(Math.abs(Date.now() / 1000 - message.timestamp)).toBeLessThan(5);
		expect(message.signature).toBe('mock-signature');

		expect(mqttCommunication.subscribe).toHaveBeenCalledWith(
			'machines/machine-1/out',
			expect.any(Function),
			expect.any(Function),
		);
	});

	it('signs the exact canonical string derived from the request', () => {
		const service = createService('60');

		service.publishAndObserve('machine-1', 'restart', 'a,b').subscribe();

		const rawMessage = mqttCommunication.publish.mock.calls[0][1] as string;
		const { timestamp } = JSON.parse(rawMessage);
		const expectedCanonical = buildCanonicalCommandString({
			machineId: 'machine-1',
			command: 'restart',
			params: ['a', 'b'],
			timestamp,
		});

		expect(commandSigningService.sign).toHaveBeenCalledWith(expectedCanonical);
	});

	it('rejects a second concurrent command for the same machine', async () => {
		const service = createService('60');

		service.publishAndObserve('machine-1', 'restart', '').subscribe();

		await expect(
			firstValueFrom(service.publishAndObserve('machine-1', 'restart', '')),
		).rejects.toThrow('already in progress');
	});

	it('errors without publishing when COMMAND_TIMEOUT_SECONDS is not configured', async () => {
		const service = createService(undefined);

		await expect(
			firstValueFrom(service.publishAndObserve('machine-1', 'restart', '')),
		).rejects.toThrow('COMMAND_TIMEOUT_SECONDS is not configured');
		expect(mqttCommunication.publish).not.toHaveBeenCalled();
	});

	it('errors without publishing or locking when signing fails', async () => {
		const service = createService('60');
		commandSigningService.sign.mockImplementation(() => {
			throw new Error('COMMAND_SIGNING_PRIVATE_KEY_PATH is not configured');
		});

		await expect(
			firstValueFrom(service.publishAndObserve('machine-1', 'restart', '')),
		).rejects.toThrow('COMMAND_SIGNING_PRIVATE_KEY_PATH is not configured');
		expect(mqttCommunication.publish).not.toHaveBeenCalled();

		// the failed attempt above must not have left the machine locked
		commandSigningService.sign.mockReturnValue('mock-signature');
		service.publishAndObserve('machine-1', 'restart', '').subscribe();

		expect(mqttCommunication.publish).toHaveBeenCalledTimes(1);
	});

	it('completes when the machine publishes the completion sentinel', async () => {
		const service = createService('60');
		let deliver: (message: string) => void = () => undefined;
		mqttCommunication.subscribe.mockImplementation((_topic, onMessage) => {
			deliver = onMessage;
			return { unsubscribe: jest.fn() };
		});

		const observable = service.publishAndObserve('machine-1', 'restart', '');
		const resultPromise = lastValueFrom(observable, { defaultValue: undefined });

		deliver('ack: starting');
		deliver('==COMPLETED==');

		await expect(resultPromise).resolves.toEqual({ data: 'ack: starting' });
	});
});

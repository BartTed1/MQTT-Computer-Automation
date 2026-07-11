import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ControlService {
	publishAndObserve(
		machineId: string,
		command: string,
		params: string,
	): Observable<MessageEvent> {
		const paramsArray = params ? params.split(',') : [];
		return new Observable<MessageEvent>((subscriber) => {
			subscriber.next({
				data: { message: `Command published to ${machineId}: ${command} with params: ${paramsArray.join(', ')}` },
			});

			// Simulate a delay before completing the observable
			const timeout = setTimeout(() => {
				subscriber.complete();
			}, 1000);

			return () => clearTimeout(timeout);
		});
	}
}

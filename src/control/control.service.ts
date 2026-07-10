import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ControlService {
	publishAndObserve(): Observable<MessageEvent> {
		return new Observable<MessageEvent>((subscriber) => {
			subscriber.next({ data: { message: 'Command published' } });

			// Simulate a delay before completing the observable
			const timeout = setTimeout(() => {
				subscriber.complete();
			}, 1000);

			return () => clearTimeout(timeout);
		});
	}
}

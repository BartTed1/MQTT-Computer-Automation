import { Injectable, Logger } from '@nestjs/common';
import { MailMessage } from '../interfaces/mail-message.interface';
import { MailSender } from '../interfaces/mail-sender.interface';

@Injectable()
export class NoopMailSender implements MailSender {
	private readonly logger = new Logger(NoopMailSender.name);

	async send(message: MailMessage): Promise<void> {
		this.logger.warn(
			`No mail sender configured; dropping mail to "${message.to}" with subject "${message.subject}"`,
		);
	}
}

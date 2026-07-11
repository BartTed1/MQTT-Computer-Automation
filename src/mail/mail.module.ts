import { Module } from '@nestjs/common';
import { NoopMailSender } from './noop/noop-mail-sender';
import { MAIL_SENDER } from './mail.tokens';

@Module({
	providers: [{ provide: MAIL_SENDER, useClass: NoopMailSender }],
	exports: [MAIL_SENDER],
})
export class MailModule {}

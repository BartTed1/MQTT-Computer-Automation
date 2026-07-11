import { Module } from '@nestjs/common';
import { SmtpMailSender } from './smtp/smtp-mail-sender';
import { MAIL_SENDER } from './mail.tokens';

@Module({
	providers: [{ provide: MAIL_SENDER, useClass: SmtpMailSender }],
	exports: [MAIL_SENDER],
})
export class MailModule {}

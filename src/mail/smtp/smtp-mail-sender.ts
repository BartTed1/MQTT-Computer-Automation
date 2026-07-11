import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { MailMessage } from '../interfaces/mail-message.interface';
import { MailSender } from '../interfaces/mail-sender.interface';

@Injectable()
export class SmtpMailSender implements MailSender {
	private readonly transporter: Transporter;
	private readonly from: string;
	private readonly to: string;

	constructor(configService: ConfigService) {
		this.transporter = createTransport({
			host: configService.getOrThrow<string>('MAIL_HOST'),
			port: Number(configService.get<string>('MAIL_PORT', '587')),
			secure: configService.get<string>('MAIL_SECURE', 'false') === 'true',
			auth: {
				user: configService.getOrThrow<string>('MAIL_USER'),
				pass: configService.getOrThrow<string>('MAIL_PASSWORD'),
			},
		});
		this.from =
			configService.get<string>('MAIL_FROM') ??
			configService.getOrThrow<string>('MAIL_USER'); // Fallback to MAIL_USER if MAIL_FROM is not provided
		this.to = configService.getOrThrow<string>('MAIL_TO');
	}

	async send(message: MailMessage): Promise<void> {
		await this.transporter.sendMail({
			from: this.from,
			to: this.to,
			subject: message.subject,
			text: message.body,
		});
	}
}

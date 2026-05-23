import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailMessage, MailService } from './mail.service';

@Injectable()
export class ResendMailService extends MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger('MailService[resend]');

  constructor(config: ConfigService) {
    super();
    this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
    this.from = config.get('RESEND_FROM', 'noreply@orcivo.com.br');
  }

  async send(message: MailMessage): Promise<void> {
    const { error } = await this.resend.emails.send({ from: this.from, ...message });
    if (error) {
      this.logger.error(`Falha ao enviar e-mail: ${error.message}`);
      throw new Error(error.message);
    }
  }
}

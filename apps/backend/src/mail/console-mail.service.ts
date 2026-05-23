import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailService } from './mail.service';

@Injectable()
export class ConsoleMailService extends MailService {
  private readonly logger = new Logger('MailService[console]');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(`[DEV EMAIL] To: ${message.to} | Subject: ${message.subject}`);
    this.logger.log(`[DEV EMAIL] Body: ${message.html}`);
  }
}

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleMailService } from './console-mail.service';
import { MailService } from './mail.service';
import { ResendMailService } from './resend-mail.service';

@Global()
@Module({
  providers: [
    {
      provide: MailService,
      useFactory: (config: ConfigService) => {
        const provider = config.get('MAIL_PROVIDER', 'console');
        return provider === 'resend'
          ? new ResendMailService(config)
          : new ConsoleMailService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}

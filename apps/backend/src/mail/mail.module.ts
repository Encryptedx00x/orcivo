import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleMailService } from './console-mail.service';
import { MailService } from './mail.service';
import { ResendMailService } from './resend-mail.service';

/**
 * Mail provider selection (env only, no code change needed):
 *   MAIL_PROVIDER   console (default; e-mails only logged) | resend
 *   RESEND_API_KEY  Resend API key (placeholder until the owner provides it)
 *   RESEND_FROM     sender address, e.g. noreply@orcivo.com.br
 * If MAIL_PROVIDER=resend but RESEND_API_KEY is empty, falls back to console with a warning.
 * The real API key and DNS verification of orcivo.com.br are Level C (owner).
 * These variables are meant to be documented in .env.example, which is a protected path
 * and must be updated by the owner.
 */
export function createMailService(config: ConfigService): MailService {
  const provider = config.get<string>('MAIL_PROVIDER', 'console');
  if (provider !== 'resend') return new ConsoleMailService();

  const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
  if (!apiKey || apiKey === 're_xxx') {
    new Logger('MailModule').warn(
      'MAIL_PROVIDER=resend mas RESEND_API_KEY não está definida; usando provider console (e-mails não serão enviados).',
    );
    return new ConsoleMailService();
  }
  return new ResendMailService(config);
}

@Global()
@Module({
  providers: [
    {
      provide: MailService,
      useFactory: createMailService,
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}

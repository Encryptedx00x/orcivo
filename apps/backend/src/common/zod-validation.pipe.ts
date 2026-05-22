import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

interface SafeParseResult {
  success: boolean;
  data?: unknown;
  error?: { issues: Array<{ path: (string | number)[]; message: string }> };
}

interface ZodLike {
  safeParse(value: unknown): SafeParseResult;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodLike) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const messages = result.error!.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new BadRequestException({ message: 'Dados inválidos', errors: messages });
    }
    return result.data;
  }
}

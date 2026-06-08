import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

interface SafeParseResult {
  success: boolean;
  data?: unknown;
  // path aceita PropertyKey[] para compatibilizar Zod v3 (shared-types) e v4 (schemas locais)
  error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
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

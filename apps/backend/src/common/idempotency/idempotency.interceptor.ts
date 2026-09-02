import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const HEADER = 'x-client-request-id';

/**
 * Request idempotency for authenticated tenant mutations that carry
 * X-Client-Request-Id (mobile). See 03.1-P02-SUMMARY.md § T11.
 *
 * - completed record + same payload  -> replay stored response (no re-execution)
 * - record still in-flight            -> 409 (retry later, will replay)
 * - same key, different payload       -> 409 (key reuse is not allowed)
 * - concurrent claim race             -> 409 for the loser (exactly one effect)
 * - handler error                     -> claim released so a genuine retry works
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const key: string | undefined = req.headers?.[HEADER];
    const companyId: string | undefined = req.companyId;

    const path: string = (req.route?.path as string) ?? req.path ?? req.url;

    // Auth routes manage their own duplicate-submit semantics (jti, signupCompany
    // guard). They also run before a company exists.
    if (!MUTATION_METHODS.has(req.method) || !key || !companyId || path.startsWith('/auth')) {
      return next.handle();
    }

    // Multipart bodies are parsed by multer *inside* next.handle(), so req.body is
    // not available here — dedupe such requests by key alone (the client generates
    // one key per upload; see api.postFormData).
    const isMultipart = String(req.headers?.['content-type'] ?? '').includes('multipart/form-data');
    const requestHash = isMultipart
      ? 'multipart'
      : createHash('sha256')
          .update(`${req.method}\n${path}\n${stableStringify(req.body)}`)
          .digest('hex');
    const where = { company_id_key: { company_id: companyId, key } };
    const statusCode = this.resolveStatus(context, req.method);

    return from(this.prisma.requestIdempotency.findUnique({ where })).pipe(
      switchMap((existing) => {
        if (existing) {
          if (
            existing.request_hash !== 'multipart' &&
            requestHash !== 'multipart' &&
            existing.request_hash !== requestHash
          ) {
            throw new ConflictException(
              'X-Client-Request-Id reutilizado com um payload diferente.',
            );
          }
          if (existing.status_code == null) {
            throw new ConflictException(
              'Uma requisição com este X-Client-Request-Id ainda está em processamento.',
            );
          }
          res.status(existing.status_code);
          return of(existing.response_json ?? {});
        }

        return from(
          this.prisma.requestIdempotency
            .create({
              data: {
                company_id: companyId,
                key,
                method: req.method,
                path,
                request_hash: requestHash,
              },
            })
            .catch((e: unknown) => {
              if ((e as { code?: string }).code === 'P2002') {
                throw new ConflictException(
                  'Requisição concorrente com o mesmo X-Client-Request-Id.',
                );
              }
              throw e;
            }),
        ).pipe(
          switchMap(() =>
            next.handle().pipe(
              tap(async (body: unknown) => {
                await this.prisma.requestIdempotency.update({
                  where,
                  data: {
                    status_code: statusCode,
                    response_json: (body ?? {}) as never,
                    completed_at: new Date(),
                  },
                });
              }),
              catchError((err) =>
                from(this.prisma.requestIdempotency.delete({ where }).catch(() => undefined)).pipe(
                  switchMap(() => {
                    throw err;
                  }),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  /** The status Nest will apply: @HttpCode metadata, else POST=201 / others=200. */
  private resolveStatus(context: ExecutionContext, method: string): number {
    const httpCode = this.reflector.get<number>('__httpCode__', context.getHandler());
    if (httpCode) return httpCode;
    return method === 'POST' ? 201 : 200;
  }
}

/** Deterministic JSON: object keys sorted recursively. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

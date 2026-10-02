import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ZodError, z } from 'zod';

export class AppError extends HttpException {
  constructor(public readonly code: string, message: string, status = 409, details: unknown = null) {
    super({ code, message, details }, status);
  }
}
export function fail(code: string, message: string, status = 409): never { throw new AppError(code, message, status); }
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> { return schema.parse(input); }
export const uuid = z.uuid();
export const money = z.string().regex(/^(0|[1-9]\d{0,17})$/).refine(v => BigInt(v) <= 9_000_000_000_000_000_000n);
export const positiveMoney = money.refine(v => BigInt(v) > 0n);
export const version = z.number().int().positive();
export const reason = z.string().trim().min(3).max(2000);
export const pageQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const json = (value: unknown): any => JSON.parse(JSON.stringify(value, (_key, v) => typeof v === 'bigint' ? v.toString() : v));
export function paged<T>(data: T[], total: number, page: number, limit: number) { return { data, total, page, limit, pages: Math.ceil(total / limit) }; }

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & { requestId?: string }>();
    let status = 500;
    let body: any = { code: 'INTERNAL_ERROR', message: 'Ichki xatolik yuz berdi', details: null };
    if (exception instanceof ZodError) {
      status = 422;
      body = { code: 'VALIDATION_ERROR', message: 'Kiritilgan ma’lumotni tekshiring', details: exception.issues.map(i => ({ path: i.path.join('.'), message: i.message })) };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const value = exception.getResponse();
      body = typeof value === 'string' ? { code: `HTTP_${status}`, message: value, details: null } : value;
    } else if ((exception as any)?.code === 'P2002') {
      status = 409; body = { code: 'ALREADY_EXISTS', message: 'Bu yozuv allaqachon mavjud', details: null };
    } else {
      console.error(JSON.stringify({ level: 'error', request_id: request.requestId, type: (exception as any)?.constructor?.name, code: (exception as any)?.code ?? null }));
    }
    response.status(status).json({ ...body, request_id: request.requestId ?? null });
  }
}

import { CanActivate, createParamDecorator, ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { type Actor } from './permissions';
import { fail } from '../common/errors';

export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const CurrentActor = createParamDecorator((_data: unknown, context: ExecutionContext): Actor => context.switchToHttp().getRequest().actor);
export type ApiRequest = Request & { actor: Actor; requestId: string };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector, @Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    const token = bearer ?? req.cookies?.sihhat_access;
    if (typeof token !== 'string' || !token || token.length > 128) fail('UNAUTHENTICATED', 'Tizimga kiring', 401);
    const actor = await this.auth.authenticate(token, bearer ? 'MOBILE' : 'WEB');
    req.actor = actor;
    if (!bearer && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) await this.auth.csrf(actor.sessionId, req.header('X-CSRF-Token'), req.header('Origin'));
    if (actor.mustChangePassword && !['/auth/me', '/auth/activity', '/auth/change-password', '/auth/logout'].includes(req.path)) fail('PASSWORD_CHANGE_REQUIRED', 'Birinchi kirishda parolni almashtiring', 403);
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]);
    if (roles && !roles.includes(actor.kind)) fail('PERMISSION_DENIED', 'Bu sahifa uchun ruxsat yo‘q', 403);
    return true;
  }
}

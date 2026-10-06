import { Body, Controller, Get, Inject, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, staffLoginInput, otpRequestInput, otpVerifyInput, changePasswordInput } from './auth.service';
import { Public, CurrentActor, Roles, type ApiRequest } from './guard';
import type { Actor } from './permissions';
import { parse } from '../common/errors';

export const apiSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }) as any;
@ApiTags('Kirish va profil')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  private web(response: Response, result: any) {
    const secure = this.auth.config.NODE_ENV === 'production';
    const common = { secure, sameSite: 'lax' as const, path: '/' };
    response.cookie('sihhat_access', result.access_token, { ...common, httpOnly: true, expires: new Date(result.expires_at) });
    response.cookie('sihhat_refresh', result.refresh_token, { ...common, httpOnly: true, expires: new Date(result.refresh_expires_at) });
    response.cookie('sihhat_csrf', result.csrf_token, { ...common, httpOnly: false, expires: new Date(result.refresh_expires_at) });
    return { user: result.user, expires_at: result.expires_at, csrf_token: result.csrf_token };
  }
  @Public() @Post('staff/login') @ApiOperation({ summary: 'Xodim login; superadmin uchun MFA' }) @ApiBody({ schema: apiSchema(staffLoginInput) })
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.web(res, await this.auth.login(body, req.ip ?? 'unknown')); }
  @Public() @Post('customer/otp/request') @ApiBody({ schema: apiSchema(otpRequestInput) })
  requestOtp(@Body() body: unknown, @Req() req: Request) { return this.auth.requestOtp(body, req.ip ?? 'unknown'); }
  @Public() @Post('customer/otp/verify') @ApiBody({ schema: apiSchema(otpVerifyInput) })
  verifyOtp(@Body() body: unknown, @Req() req: Request) { return this.auth.verifyOtp(body, req.ip ?? 'unknown'); }
  @Public() @Post('refresh')
  async refresh(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (req.cookies?.sihhat_refresh) return this.web(res, await this.auth.refresh(req.cookies.sihhat_refresh, 'WEB', req.header('X-CSRF-Token'), req.header('Origin')));
    const input = parse(z.object({ refresh_token: z.string().min(32).max(128) }).strict(), body);
    return this.auth.refresh(input.refresh_token, 'MOBILE');
  }
  @Get('me')
  me(@CurrentActor() actor: Actor, @Req() req: ApiRequest) { return { ...actor, csrf_token: req.cookies?.sihhat_csrf ?? null }; }
  @Post('logout')
  async logout(@CurrentActor() actor: Actor, @Res({ passthrough: true }) res: Response) {
    for (const name of ['sihhat_access', 'sihhat_refresh', 'sihhat_csrf']) res.clearCookie(name, { path: '/' });
    return this.auth.logout(actor);
  }
  @Post('activity') @Roles('STAFF', 'SUPERADMIN')
  activity(@CurrentActor() actor: Actor) { return this.auth.activity(actor); }
  @Post('change-password') @ApiBody({ schema: apiSchema(changePasswordInput) })
  changePassword(@CurrentActor() actor: Actor, @Body() body: unknown) { return this.auth.changePassword(actor, body); }
  @Patch('profile')
  profile(@CurrentActor() actor: Actor, @Body() body: unknown) { return this.auth.profile(actor, body); }
  @Post('customer/phone-change/request') @Roles('CUSTOMER') phoneRequest(@CurrentActor() a:Actor,@Body() b:unknown){return this.auth.phoneChangeRequest(a,b);}
  @Post('customer/phone-change/confirm') @Roles('CUSTOMER') phoneConfirm(@CurrentActor() a:Actor,@Body() b:unknown){return this.auth.phoneChangeConfirm(a,b);}
}

import 'reflect-metadata';
import { Controller, Get, Global, Inject, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { json as expressJson } from 'express';
import { CONFIG, loadConfig, type Config } from './common/config';
import { Db } from './common/db';
import { ApiErrorFilter } from './common/errors';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { StaffController } from './auth/staff.controller';
import { StaffService } from './auth/staff.service';
import { AuthGuard, Public } from './auth/guard';
import { Sms } from './auth/sms';
import { SanatoriumService } from './sanatoriums/sanatorium.service';
import { SanatoriumController } from './sanatoriums/sanatorium.controller';
import { InventoryService } from './inventory/inventory.service';
import { InventoryController } from './inventory/inventory.controller';
import { PricingService } from './pricing/pricing.service';
import { BookingService } from './bookings/booking.service';
import { BookingController } from './bookings/booking.controller';
import { MediaService } from './media/media.service';
import { MediaController } from './media/media.controller';
import { PaymentService } from './payments/payment.service';
import { PaymentController } from './payments/payment.controller';
import { FinanceService } from './finance/finance.service';
import { FinanceController } from './finance/finance.controller';
import { BillingService } from './billing/billing.service';
import { BillingController } from './billing/billing.controller';
import { EngagementService } from './engagement/engagement.service';
import { EngagementController } from './engagement/engagement.controller';
import { CatalogService } from './catalog/catalog.service';
import { CatalogController } from './catalog/catalog.controller';
import { HomeService } from './catalog/home.service';
import { HomeController } from './catalog/home.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';
import { AiService } from './ai/ai.service';
import { OutboxService } from './outbox/outbox.service';
import { enrichOpenApi } from './common/openapi';
import { TelegramClient } from './telegram/client';
import { TelegramLinkService } from './telegram/link.service';
import { TelegramViews } from './telegram/views';
import { TelegramService } from './telegram/telegram.service';
import { TelegramController } from './telegram/telegram.controller';

@Global() @Module({ providers: [{ provide: CONFIG, useFactory: () => loadConfig() }, Db], exports: [CONFIG, Db] })
export class CoreModule {}
@Global() @Module({ providers: [AuthService, StaffService, Sms], controllers: [AuthController, StaffController], exports: [AuthService, StaffService, Sms] })
export class AuthModule {}
@Module({ providers: [SanatoriumService], controllers: [SanatoriumController], exports: [SanatoriumService] })
export class SanatoriumModule {}
@Global() @Module({ providers:[InventoryService,PricingService,BookingService,MediaService],controllers:[InventoryController,BookingController,MediaController],exports:[PricingService,BookingService,InventoryService] })
export class BookingModule {}
@Global() @Module({providers:[PaymentService,FinanceService],controllers:[PaymentController,FinanceController],exports:[PaymentService,FinanceService]})
export class FinanceModule {}
@Global() @Module({providers:[BillingService,EngagementService,CatalogService,HomeService,ReportsService,AiService,OutboxService,TelegramClient,TelegramLinkService,TelegramViews,TelegramService],controllers:[BillingController,EngagementController,CatalogController,HomeController,ReportsController,TelegramController],exports:[BillingService,EngagementService,CatalogService,ReportsService,AiService,OutboxService,TelegramClient,TelegramLinkService,TelegramService]})
export class OperationsModule {}
@Controller('health') @Public()
class HealthController {
  constructor(@Inject(Db) private readonly db: Db) {}
  @Get('live') live() { return { status: 'ok', service: 'sihhat-api' }; }
  @Get('ready') async ready() { await this.db.$queryRaw`SELECT 1`; return { status: 'ok', database: 'ready' }; }
}
@Module({ imports: [CoreModule, AuthModule, SanatoriumModule, BookingModule,FinanceModule,OperationsModule], controllers: [HealthController], providers: [{ provide: APP_GUARD, useClass: AuthGuard }] })
export class AppModule {}

export async function createApp(options: { quiet?: boolean; swagger?: boolean } = {}) {
  const app = await NestFactory.create(AppModule, { bodyParser:false, logger: options.quiet ? false : ['log','warn','error'] });
  const config = app.get<Config>(CONFIG);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(expressJson({limit:'12mb'}));
  const express = app.getHttpAdapter().getInstance();
  express.set('json replacer', (_key: string, value: unknown) => typeof value === 'bigint' ? value.toString() : value);
  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    req.requestId = randomUUID(); res.setHeader('X-Request-ID', req.requestId);
    const started = Date.now();
    if (!options.quiet) res.on('finish', () => console.log(JSON.stringify({ request_id: req.requestId, method: req.method, path: req.path, status: res.statusCode, elapsed_ms: Date.now()-started })));
    next();
  });
  app.enableCors({ origin: config.CORS_ORIGINS.split(','), credentials: true, allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token','Idempotency-Key'] });
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
  const definition = new DocumentBuilder().setTitle('Sihhat uz API').setDescription('UZS summalari tiyin birligida string. Staff: HttpOnly cookie + X-CSRF-Token; Android: Bearer.').setVersion('1.0').addBearerAuth().addCookieAuth('sihhat_access').build();
  const document = enrichOpenApi(SwaggerModule.createDocument(app, definition));
  if (options.swagger !== false) SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: '/openapi.json' });
  return { app, config, document };
}

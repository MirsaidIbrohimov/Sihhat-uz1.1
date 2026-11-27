import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db, audit, emit, lock } from '../common/db';
import { fail, parse, uuid, version, reason, pageQuery, paged, positiveMoney } from '../common/errors';
import { passwordHash } from '../common/crypto';
import { normalizeIp } from '../common/request-meta';
import { withMapLocation } from '../sanatoriums/maps';
import { AuthService, optionalEmailSchema, passwordSchema, phoneSchema, type AuthRequestMeta } from './auth.service';
import { EmailService } from './email';
import { allocateUserPublicId, resolveUserPublicId } from './public-id.util';
import { Actor, DIRECTOR, requirePlatform } from './permissions';

export const partnerUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username kamida 3 ta belgidan iborat bo‘lsin')
  .max(64, 'Username ko‘pi bilan 64 ta belgi bo‘lsin')
  .regex(/^[a-z0-9._-]+$/, 'Username faqat lotin harflari, raqamlar, nuqta (.), pastki chiziq (_) va tire (-) dan iborat bo‘lsin');

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(max).optional(),
  );

export const partnerRegistrationInput = z
  .object({
    applicant_name: z.string().trim().min(2, 'Ism va familiyani kiriting').max(120),
    username: partnerUsernameSchema,
    email: optionalEmailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    sanatorium_name: z.string().trim().min(2, 'Sanatoriya nomini kiriting').max(150),
    legal_name: optionalTrimmed(150),
    stir: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().regex(/^\d{9}$/, 'STIR aynan 9 ta raqamdan iborat bo‘lsin').optional(),
    ),
    region: z.string().trim().min(2, 'Viloyat yoki hududni tanlang').max(80),
    address: z.string().trim().min(5, 'To‘liq manzilni kiriting').max(500),
    description: z.string().trim().min(20, 'Sanatoriya tavsifi kamida 20 ta belgidan iborat bo‘lsin').max(5000),
    contact_phone: phoneSchema,
    map_url: optionalTrimmed(2048),
    check_in_time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Joylashish vaqtini HH:MM shaklida kiriting')
      .default('14:00'),
    check_out_time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Ketish vaqtini HH:MM shaklida kiriting')
      .default('12:00'),
    amenities: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
    services: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
    meals: z.string().trim().max(1000).default(''),
    starting_price: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim()),
      positiveMoney.optional(),
    ),
    room_type_name: optionalTrimmed(100),
    rooms_count: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number().int().min(1).max(200).optional(),
    ),
    terms_accepted: z.literal(true, {
      error: 'Hamkor shartlariga rozilik berish majburiy',
    }),
  })
  .strict();

export const partnerAvailabilityQuery = z
  .object({
    username: z.string().max(128).optional(),
    login: z.string().max(128).optional(),
    email: z.string().max(128).optional(),
  })
  .passthrough();

export const partnerApproveInput = z
  .object({
    version: version.optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const partnerRejectInput = z
  .object({
    version: version.optional(),
    reason,
  })
  .strict();

function sanitizeRegistration(row: any) {
  if (!row) return row;
  const { passwordHash: _secret, ...rest } = row;
  return {
    ...rest,
    startingPriceMinor: rest.startingPriceMinor !== null && rest.startingPriceMinor !== undefined
      ? String(rest.startingPriceMinor)
      : null,
  };
}

@Injectable()
export class PartnerRegistrationService {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(AuthService) readonly auth: AuthService,
    @Inject(EmailService) readonly email: EmailService,
  ) {}

  async checkAvailability(query: unknown, rateLimitIp: string) {
    if (this.auth.config.PUBLIC_DEMO_ENABLED) {
      fail('DEMO_ACCESS_DENIED', 'Demo serverda hamkor ro‘yxatdan o‘tishi yopiq', 403);
    }
    await this.auth.limit(`partner-reg-avail-ip:${rateLimitIp}`, 240, 900);
    const q = parse(partnerAvailabilityQuery, query);

    if (q.email !== undefined) {
      const normalizedEmail = q.email.trim().toLowerCase();
      if (!normalizedEmail) {
        return { field: 'email', email: '', valid: false, available: false, reason: 'EMPTY' as const };
      }
      if (!optionalEmailSchema.safeParse(normalizedEmail).success) {
        return { field: 'email', email: normalizedEmail, valid: false, available: false, reason: 'INVALID_FORMAT' as const };
      }
      let existingUser: { id: string } | null = null;
      try {
        existingUser = await this.db.user.findFirst({
          where: {
            OR: [
              { email: { equals: normalizedEmail, mode: 'insensitive' as const } },
              { login: { equals: normalizedEmail, mode: 'insensitive' as const } },
            ],
          },
          select: { id: true },
        });
      } catch {
        existingUser = await this.db.user.findFirst({
          where: { login: { equals: normalizedEmail, mode: 'insensitive' as const } },
          select: { id: true },
        });
      }
      const existingPending =
        !existingUser && typeof (this.db as any).partnerRegistration?.findFirst === 'function'
          ? await this.db.partnerRegistration
              .findFirst({
                where: {
                  status: 'PENDING',
                  email: { equals: normalizedEmail, mode: 'insensitive' as const },
                },
                select: { id: true },
              })
              .catch(() => null)
          : null;
      const taken = Boolean(existingUser || existingPending);
      return {
        field: 'email',
        email: normalizedEmail,
        login: normalizedEmail,
        valid: true,
        available: !taken,
        reason: taken ? ('TAKEN' as const) : null,
      };
    }

    const rawUsername = (q.username ?? q.login ?? '').trim().toLowerCase();
    if (!rawUsername) {
      return { field: 'username', username: '', login: '', valid: false, available: false, reason: 'EMPTY' as const };
    }
    if (!partnerUsernameSchema.safeParse(rawUsername).success) {
      return {
        field: 'username',
        username: rawUsername,
        login: rawUsername,
        valid: false,
        available: false,
        reason: 'INVALID_FORMAT' as const,
      };
    }

    let existingUser: { id: string } | null = null;
    try {
      existingUser = await this.db.user.findFirst({
        where: {
          OR: [
            { login: { equals: rawUsername, mode: 'insensitive' as const } },
            { email: { equals: rawUsername, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true },
      });
    } catch {
      existingUser = await this.db.user.findFirst({
        where: { login: { equals: rawUsername, mode: 'insensitive' as const } },
        select: { id: true },
      });
    }
    const existingPending =
      !existingUser && typeof (this.db as any).partnerRegistration?.findFirst === 'function'
        ? await this.db.partnerRegistration
            .findFirst({
              where: {
                status: 'PENDING',
                username: { equals: rawUsername, mode: 'insensitive' as const },
              },
              select: { id: true },
            })
            .catch(() => null)
        : null;

    const taken = Boolean(existingUser || existingPending);
    return {
      field: 'username',
      username: rawUsername,
      login: rawUsername,
      valid: true,
      available: !taken,
      reason: taken ? ('TAKEN' as const) : null,
    };
  }

  async submit(body: unknown, meta?: AuthRequestMeta) {
    if (this.auth.config.PUBLIC_DEMO_ENABLED) {
      fail('DEMO_ACCESS_DENIED', 'Demo serverda hamkor ro‘yxatdan o‘tishi yopiq', 403);
    }
    const rateLimitIp = meta?.rateLimitIp ?? 'unknown';
    const auditIp = normalizeIp(meta?.ipAddress ?? rateLimitIp);
    const deviceLabel = meta?.deviceLabel || 'Brauzer · Noma’lum qurilma';

    await this.auth.limit(`partner-reg-ip:${rateLimitIp}`, 10, 3600);
    const input = parse(partnerRegistrationInput, body);

    let validatedMapUrl: string | null = null;
    if (input.map_url) {
      const normalized = withMapLocation({ map_url: input.map_url });
      validatedMapUrl = normalized.map_url ?? null;
    }

    const encodedPassword = await passwordHash(input.password);

    const created = await this.db.atomic(async (tx) => {
      await lock(tx, `partner-reg:username:${input.username}`);
      await lock(tx, `partner-reg:email:${input.email}`);
      await lock(tx, `partner-reg:phone:${input.phone}`);

      const [userByLogin, pendingByUsername] = await Promise.all([
        tx.user.findFirst({
          where: {
            OR: [
              { login: { equals: input.username, mode: 'insensitive' as const } },
              { email: { equals: input.username, mode: 'insensitive' as const } },
            ],
          },
          select: { id: true },
        }),
        tx.partnerRegistration.findFirst({
          where: {
            status: 'PENDING',
            username: { equals: input.username, mode: 'insensitive' as const },
          },
          select: { id: true },
        }),
      ]);
      if (userByLogin || pendingByUsername) {
        fail('USERNAME_IN_USE', 'Bu username allaqachon band. Boshqa username kiriting', 409);
      }

      const [userByEmail, pendingByEmail] = await Promise.all([
        tx.user.findFirst({
          where: {
            OR: [
              { email: { equals: input.email, mode: 'insensitive' as const } },
              { login: { equals: input.email, mode: 'insensitive' as const } },
            ],
          },
          select: { id: true },
        }),
        tx.partnerRegistration.findFirst({
          where: {
            status: 'PENDING',
            email: { equals: input.email, mode: 'insensitive' as const },
          },
          select: { id: true },
        }),
      ]);
      if (userByEmail || pendingByEmail) {
        fail('EMAIL_IN_USE', 'Bu elektron pochta allaqachon ro‘yxatdan o‘tgan. Boshqa email kiriting', 409);
      }

      const [userByPhone, pendingByPhone] = await Promise.all([
        tx.user.findFirst({
          where: { phone: input.phone },
          select: { id: true },
        }),
        tx.partnerRegistration.findFirst({
          where: { status: 'PENDING', phone: input.phone },
          select: { id: true },
        }),
      ]);
      if (userByPhone || pendingByPhone) {
        fail('PHONE_IN_USE', 'Bu telefon raqami boshqa hisob yoki kutilayotgan arizaga biriktirilgan', 409);
      }

      const reg = await tx.partnerRegistration.create({
        data: {
          status: 'PENDING',
          applicantName: input.applicant_name,
          username: input.username,
          email: input.email,
          phone: input.phone,
          passwordHash: encodedPassword,
          sanatoriumName: input.sanatorium_name,
          legalName: input.legal_name ?? null,
          stir: input.stir ?? null,
          region: input.region,
          address: input.address,
          description: input.description,
          contactPhone: input.contact_phone,
          mapUrl: validatedMapUrl,
          checkInTime: input.check_in_time,
          checkOutTime: input.check_out_time,
          amenities: [...new Set(input.amenities)],
          services: [...new Set(input.services)],
          meals: input.meals,
          startingPriceMinor: input.starting_price ? BigInt(input.starting_price) : null,
          roomTypeName: input.room_type_name ?? null,
          roomsCount: input.rooms_count ?? null,
          submittedIp: auditIp,
          submittedDevice: deviceLabel,
        },
      });

      const admins = await tx.user.findMany({
        where: { kind: 'SUPERADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      const adminIds = admins.map((a) => a.id);

      const alertPayload = {
        recipient_ids: adminIds,
        registration_id: reg.id,
        sanatorium_name: reg.sanatoriumName,
        region: reg.region,
        address: reg.address,
        applicant_name: reg.applicantName,
        username: reg.username,
        email: reg.email,
        phone: reg.phone,
        contact_phone: reg.contactPhone,
        ip: auditIp,
        device: deviceLabel,
        submitted_at: reg.createdAt.toISOString(),
      };

      const ev = await emit(tx, 'partner.registration_submitted', alertPayload);
      if (adminIds.length && ev?.id && (tx as any).notificationDelivery?.createMany) {
        const now = new Date();
        await (tx as any).notificationDelivery.createMany({
          data: adminIds.map((userId) => ({
            eventId: ev.id,
            userId,
            channel: 'IN_APP',
            status: 'SENT',
            sentAt: now,
            payload: { topic: 'partner.registration_submitted', ...alertPayload },
          })),
          skipDuplicates: true,
        });
      }

      await audit(tx, null, 'partner.registration_submitted', reg.id, undefined, undefined, {
        sanatorium_name: reg.sanatoriumName,
        region: reg.region,
        applicant_name: reg.applicantName,
        username: reg.username,
        email: reg.email,
        ip: auditIp,
        device: deviceLabel,
      });

      return reg;
    });

    return {
      success: true,
      registration: sanitizeRegistration(created),
      message:
        'Arizangiz muvaffaqiyatli yuborildi! Superadmin tasdiqlaganidan so‘ng hisobingiz ochiladi, sanatoriyangiz ro‘yxatga qo‘shiladi va email manzilingizga xabar yuboriladi.',
    };
  }

  async list(actor: Actor, query: unknown) {
    requirePlatform(actor, 'sanatoriums.manage');
    const i = parse(
      pageQuery
        .extend({
          status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
          q: z.string().trim().max(120).optional(),
        })
        .strict(),
      query,
    );

    const where: Record<string, any> = {
      ...(i.status ? { status: i.status } : {}),
    };
    if (i.q) {
      where.OR = [
        { sanatoriumName: { contains: i.q, mode: 'insensitive' } },
        { applicantName: { contains: i.q, mode: 'insensitive' } },
        { username: { contains: i.q, mode: 'insensitive' } },
        { email: { contains: i.q, mode: 'insensitive' } },
        { phone: { contains: i.q.replace(/[\s()-]/g, '') } },
        { region: { contains: i.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      this.db.partnerRegistration.findMany({
        where,
        skip: (i.page - 1) * i.limit,
        take: i.limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.db.partnerRegistration.count({ where }),
      this.db.partnerRegistration.count({ where: { status: 'PENDING' } }),
      this.db.partnerRegistration.count({ where: { status: 'APPROVED' } }),
      this.db.partnerRegistration.count({ where: { status: 'REJECTED' } }),
    ]);

    return {
      ...paged(rows.map(sanitizeRegistration), total, i.page, i.limit),
      pending_count: pendingCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
    };
  }

  async get(actor: Actor, id: string) {
    requirePlatform(actor, 'sanatoriums.manage');
    parse(uuid, id);
    const row = await this.db.partnerRegistration.findUnique({ where: { id } });
    if (!row) fail('NOT_FOUND', 'Hamkor arizasi topilmadi', 404);
    return sanitizeRegistration(row);
  }

  async approve(actor: Actor, id: string, body: unknown) {
    requirePlatform(actor, 'sanatoriums.manage');
    parse(uuid, id);
    const input = parse(partnerApproveInput, body ?? {});

    const outcome = await this.db.atomic(async (tx) => {
      await lock(tx, `partner-reg:${id}`);
      const reg = await tx.partnerRegistration.findUnique({ where: { id } });
      if (!reg) fail('NOT_FOUND', 'Hamkor arizasi topilmadi', 404);
      if (reg.status !== 'PENDING' || (input.version !== undefined && reg.version !== input.version)) {
        fail('VERSION_CONFLICT', 'Ariza holati allaqachon o‘zgargan');
      }

      await lock(tx, `partner-reg:username:${reg.username}`);
      await lock(tx, `partner-reg:email:${reg.email}`);
      await lock(tx, `partner-reg:phone:${reg.phone}`);

      const takenLogin = await tx.user.findFirst({
        where: {
          OR: [
            { login: { equals: reg.username, mode: 'insensitive' as const } },
            { email: { equals: reg.username, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true },
      });
      if (takenLogin) {
        fail('USERNAME_IN_USE', `«@${reg.username}» logini bazada band bo‘lib qolgan`, 409);
      }

      const takenEmail = await tx.user.findFirst({
        where: {
          OR: [
            { email: { equals: reg.email, mode: 'insensitive' as const } },
            { login: { equals: reg.email, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true },
      });
      if (takenEmail) {
        fail('EMAIL_IN_USE', `«${reg.email}» email manzili boshqa hisobga ulangan`, 409);
      }

      const takenPhone = await tx.user.findFirst({
        where: { phone: reg.phone },
        select: { id: true },
      });
      if (takenPhone) {
        fail('PHONE_IN_USE', `«${reg.phone}» telefon raqami boshqa hisobga ulangan`, 409);
      }

      const now = new Date();
      const publicId = await allocateUserPublicId(tx);

      const user = await tx.user.create({
        data: {
          publicId,
          kind: 'STAFF',
          status: 'ACTIVE',
          name: reg.applicantName,
          login: reg.username,
          email: reg.email,
          phone: reg.phone,
          passwordHash: reg.passwordHash,
          mustChangePassword: false,
        },
      });

      const sanatorium = await tx.sanatorium.create({
        data: {
          name: reg.sanatoriumName,
          status: 'ACTIVE',
          paymentReady: true,
          subscriptionRequired: false,
        },
      });

      const profileData = {
        name: reg.sanatoriumName,
        description: reg.description,
        legal_name: reg.legalName || reg.sanatoriumName,
        stir: reg.stir || '000000000',
        region: reg.region,
        address: reg.address,
        ...(reg.mapUrl ? { map_url: reg.mapUrl } : {}),
        contact_phone: reg.contactPhone,
        check_in_time: reg.checkInTime || '14:00',
        check_out_time: reg.checkOutTime || '12:00',
        amenities: reg.amenities ?? [],
        services: reg.services ?? [],
        meals: reg.meals ?? '',
        child_rules: '',
        medical_requirements: '',
        directions: '',
        required_documents: '',
        photo_ids: [] as string[],
        document_ids: [] as string[],
        terms_accepted: true,
      };

      const revision = await tx.sanatoriumRevision.create({
        data: {
          sanatoriumId: sanatorium.id,
          status: 'APPROVED',
          submittedAt: reg.createdAt,
          approvedAt: now,
          data: profileData,
          createdBy: user.id,
        },
      });

      const publishedSanatorium = await tx.sanatorium.update({
        where: { id: sanatorium.id },
        data: {
          publicRevisionId: revision.id,
          paymentReady: true,
          version: { increment: 1 },
        },
      });

      if ((reg.startingPriceMinor && reg.startingPriceMinor > 0n) || reg.roomTypeName || reg.roomsCount) {
        const roomType = await tx.roomType.create({
          data: {
            sanatoriumId: sanatorium.id,
            name: reg.roomTypeName || 'Standart xona',
            maxGuests: 2,
            maxAdults: 2,
            maxChildren: 1,
            active: true,
          },
        });
        const count = Math.min(Math.max(reg.roomsCount ?? 1, 1), 20);
        for (let idx = 1; idx <= count; idx++) {
          await tx.room.create({
            data: {
              sanatoriumId: sanatorium.id,
              roomTypeId: roomType.id,
              code: String(100 + idx),
              active: true,
            },
          });
        }
        if (reg.startingPriceMinor && reg.startingPriceMinor > 0n) {
          let policy = await tx.refundPolicy.findFirst({
            where: { active: true },
            orderBy: { createdAt: 'asc' },
          });
          if (!policy) {
            policy = await tx.refundPolicy.create({
              data: {
                name: 'Standart qaytarish sharti',
                kind: 'FULL_BEFORE_CUTOFF',
                cutoffHours: 24,
                active: true,
              },
            });
          }
          await tx.ratePlan.create({
            data: {
              sanatoriumId: sanatorium.id,
              roomTypeId: roomType.id,
              name: 'Asosiy yo‘llanma tarifi',
              mode: 'PERSON',
              baseAmount: reg.startingPriceMinor,
              policyId: policy.id,
              active: true,
            },
          });
        }
      }

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          sanatoriumId: sanatorium.id,
          role: 'DIRECTOR',
          status: 'ACTIVE',
          ceiling: DIRECTOR,
          invitedBy: actor.id,
        },
      });

      const updatedReg = await tx.partnerRegistration.update({
        where: { id: reg.id },
        data: {
          status: 'APPROVED',
          reviewedBy: actor.id,
          reviewedAt: now,
          decisionReason: input.reason ?? null,
          createdUserId: user.id,
          createdSanatoriumId: sanatorium.id,
          version: { increment: 1 },
        },
      });

      const welcomePayload = {
        recipient_ids: [user.id],
        registration_id: reg.id,
        sanatorium_id: sanatorium.id,
        sanatorium_name: sanatorium.name,
        username: user.login,
        email: user.email,
      };
      const ev = await emit(tx, 'partner.registration_approved', welcomePayload);
      if (ev?.id && (tx as any).notificationDelivery?.createMany) {
        await (tx as any).notificationDelivery.createMany({
          data: [
            {
              eventId: ev.id,
              userId: user.id,
              channel: 'IN_APP',
              status: 'SENT',
              sentAt: now,
              payload: { topic: 'partner.registration_approved', ...welcomePayload },
            },
          ],
          skipDuplicates: true,
        });
      }

      await audit(tx, actor.id, 'partner.registration_approved', reg.id, sanatorium.id, { status: 'PENDING' }, {
        status: 'APPROVED',
        userId: user.id,
        sanatoriumId: sanatorium.id,
        username: user.login,
        email: user.email,
        sanatorium_name: sanatorium.name,
        membership_id: membership.id,
        reason: input.reason ?? null,
      });

      return {
        registration: updatedReg,
        user,
        sanatorium: publishedSanatorium,
        membership,
      };
    });

    const emailStatus = await this.email.sendPartnerAccountApproved({
      id: outcome.registration.id,
      email: outcome.registration.email,
      applicantName: outcome.registration.applicantName,
      username: outcome.registration.username,
      publicId: resolveUserPublicId(outcome.user),
      sanatoriumName: outcome.sanatorium.name,
      region: outcome.registration.region,
    });

    return {
      success: true,
      registration: sanitizeRegistration(outcome.registration),
      user: this.auth.publicUser(outcome.user),
      sanatorium: outcome.sanatorium,
      email_status: emailStatus,
    };
  }

  async reject(actor: Actor, id: string, body: unknown) {
    requirePlatform(actor, 'sanatoriums.manage');
    parse(uuid, id);
    const input = parse(partnerRejectInput, body);

    const updated = await this.db.atomic(async (tx) => {
      await lock(tx, `partner-reg:${id}`);
      const reg = await tx.partnerRegistration.findUnique({ where: { id } });
      if (!reg) fail('NOT_FOUND', 'Hamkor arizasi topilmadi', 404);
      if (reg.status !== 'PENDING' || (input.version !== undefined && reg.version !== input.version)) {
        fail('VERSION_CONFLICT', 'Ariza holati allaqachon o‘zgargan');
      }
      const next = await tx.partnerRegistration.update({
        where: { id: reg.id },
        data: {
          status: 'REJECTED',
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          decisionReason: input.reason,
          version: { increment: 1 },
        },
      });
      await audit(tx, actor.id, 'partner.registration_rejected', reg.id, undefined, { status: 'PENDING' }, {
        status: 'REJECTED',
        username: reg.username,
        email: reg.email,
        sanatorium_name: reg.sanatoriumName,
        reason: input.reason,
      });
      return next;
    });

    const emailStatus = await this.email.sendPartnerAccountRejected({
      id: updated.id,
      email: updated.email,
      applicantName: updated.applicantName,
      username: updated.username,
      sanatoriumName: updated.sanatoriumName,
      reason: input.reason,
    });

    return {
      success: true,
      registration: sanitizeRegistration(updated),
      email_status: emailStatus,
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CONFIG, type Config } from '../common/config';
import { Db, audit } from '../common/db';
import { parse, uuid, fail } from '../common/errors';
import { type Actor, scope } from '../auth/permissions';
import { AuthService } from '../auth/auth.service';
import { adPublicationStatus } from '../billing/ad-publication';

type SharpFn = (input?: Buffer) => any;
let cachedSharp: SharpFn | null | undefined;
function getSharp(): SharpFn | null {
  if (cachedSharp !== undefined) return cachedSharp;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('sharp');
    const fn: any = mod?.default ?? mod;
    if (typeof fn === 'function') {
      if (typeof fn.cache === 'function') fn.cache(false);
      if (typeof fn.concurrency === 'function') fn.concurrency(2);
      cachedSharp = fn;
      return fn;
    }
  } catch {
    // Optional native optimizer in minimal environments
  }
  cachedSharp = null;
  return null;
}

const WIDTH_BUCKETS = [480, 640, 960, 1280, 1600] as const;
export function normalizeMediaWidth(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 64) return null;
  for (const bucket of WIDTH_BUCKETS) {
    if (num <= bucket) return bucket;
  }
  return WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const variantMemCache = new Map<string, { mime: string; bytes: Buffer }>();
let variantMemBytes = 0;

function getCachedVariant(cacheKey: string): { mime: string; bytes: Buffer } | undefined {
  const hit = variantMemCache.get(cacheKey);
  if (!hit) return undefined;
  variantMemCache.delete(cacheKey);
  variantMemCache.set(cacheKey, hit);
  return hit;
}

function putCachedVariant(cacheKey: string, value: { mime: string; bytes: Buffer }) {
  if (value.bytes.length > 2 * 1024 * 1024) return;
  const prev = variantMemCache.get(cacheKey);
  if (prev) {
    variantMemBytes -= prev.bytes.length;
    variantMemCache.delete(cacheKey);
  }
  while (variantMemBytes + value.bytes.length > MAX_CACHE_BYTES && variantMemCache.size > 0) {
    const oldestKey = variantMemCache.keys().next().value;
    if (!oldestKey) break;
    const oldest = variantMemCache.get(oldestKey)!;
    variantMemBytes -= oldest.bytes.length;
    variantMemCache.delete(oldestKey);
  }
  variantMemCache.set(cacheKey, value);
  variantMemBytes += value.bytes.length;
}

async function optimizeUploadedImage(bytes: Buffer, mime: string): Promise<Buffer> {
  if (bytes.length < 180 * 1024) return bytes;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return bytes;
  const sharp = getSharp();
  if (!sharp) return bytes;
  try {
    let pipeline = sharp(bytes).rotate().resize({
      width: 1920,
      height: 1920,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (mime === 'image/jpeg') {
      pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
    } else if (mime === 'image/webp') {
      pipeline = pipeline.webp({ quality: 82 });
    } else {
      pipeline = pipeline.png({ compressionLevel: 8 });
    }
    const out: Buffer = await pipeline.toBuffer();
    return out.length > 0 && out.length < bytes.length ? out : bytes;
  } catch {
    return bytes;
  }
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(CONFIG) readonly config: Config,
    @Inject(AuthService) readonly auth: AuthService,
  ) {}

  private s3() {
    return new S3Client({
      endpoint: this.config.S3_ENDPOINT || undefined,
      region: this.config.S3_REGION,
      forcePathStyle: !!this.config.S3_ENDPOINT,
      credentials: {
        accessKeyId: this.config.S3_ACCESS_KEY,
        secretAccessKey: this.config.S3_SECRET_KEY,
      },
    });
  }

  private path(key: string) {
    const root = resolve(this.config.STORAGE_PATH);
    const target = resolve(root, key);
    if (!target.startsWith(root + sep)) throw new Error('Storage path escaped');
    return target;
  }

  async upload(actor: Actor, body: unknown) {
    const rawBody = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const normalizedBody = rawBody
      ? (() => {
          let mime: unknown = typeof rawBody.mime === 'string' ? rawBody.mime.trim().toLowerCase() : rawBody.mime;
          if (mime === 'image/jpg' || mime === 'image/pjpeg') mime = 'image/jpeg';
          if (mime === 'image/x-png') mime = 'image/png';
          let base64: unknown = rawBody.base64;
          if (typeof rawBody.base64 === 'string') {
            let clean = rawBody.base64.trim();
            const match = /^data:([^;,]+)(?:;[^;,]+)*;base64,(.+)$/is.exec(clean);
            if (match) {
              if (!mime) {
                const fromData = match[1].trim().toLowerCase();
                mime =
                  fromData === 'image/jpg' || fromData === 'image/pjpeg'
                    ? 'image/jpeg'
                    : fromData === 'image/x-png'
                      ? 'image/png'
                      : fromData;
              }
              clean = match[2];
            }
            base64 = clean.replace(/\s+/g, '');
          }
          return {
            ...rawBody,
            mime,
            base64,
            revision_id:
              rawBody.revision_id === null || rawBody.revision_id === '' ? undefined : rawBody.revision_id,
          };
        })()
      : body;

    const i = parse(
      z
        .object({
          sanatorium_id: uuid,
          revision_id: uuid.optional(),
          visibility: z.enum(['PUBLIC', 'PRIVATE']),
          mime: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']),
          base64: z.string().min(8).max(12_000_000),
        })
        .passthrough(),
      normalizedBody,
    );
    scope(actor, i.sanatorium_id, 'sanatorium.profile.edit');
    await this.auth.limit(`media:${actor.id}`, 40, 3600);

    const rawBytes = Buffer.from(i.base64, 'base64');
    if (rawBytes.length > 8 * 1024 * 1024 || rawBytes.length < 8)
      fail('FILE_SIZE_INVALID', 'Fayl 8 MBdan oshmasin', 422);

    const valid =
      i.mime === 'image/png'
        ? rawBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : i.mime === 'image/jpeg'
          ? rawBytes[0] === 255 && rawBytes[1] === 216 && rawBytes[2] === 255
          : i.mime === 'image/webp'
            ? rawBytes.subarray(0, 4).toString() === 'RIFF' && rawBytes.subarray(8, 12).toString() === 'WEBP'
            : i.mime === 'image/gif'
              ? rawBytes.subarray(0, 6).toString() === 'GIF87a' ||
                rawBytes.subarray(0, 6).toString() === 'GIF89a'
              : rawBytes.subarray(0, 5).toString() === '%PDF-';

    if (!valid || (i.mime === 'application/pdf' && i.visibility === 'PUBLIC'))
      fail('FILE_TYPE_INVALID', 'Fayl turi yoki ko‘rinish darajasi noto‘g‘ri', 422);

    if (i.revision_id) {
      const r = await this.db.sanatoriumRevision.findFirst({
        where: {
          id: i.revision_id,
          sanatoriumId: i.sanatorium_id,
          status: { in: ['DRAFT', 'CHANGES_REQUESTED'] },
        },
      });
      if (!r) fail('NOT_FOUND', 'Tahrir topilmadi', 404);
    }

    const bytes = await optimizeUploadedImage(rawBytes, i.mime);
    const id = randomUUID();
    const key = `${i.sanatorium_id}/${id}`;
    if (this.config.STORAGE_ADAPTER === 's3') {
      const s3 = this.s3();
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: this.config.S3_BUCKET,
            Key: key,
            Body: bytes,
            ContentType: i.mime,
          }),
        );
      } finally {
        s3.destroy();
      }
    } else {
      const path = this.path(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes, { mode: 0o600 });
    }
    return this.db.atomic(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          id,
          sanatoriumId: i.sanatorium_id,
          revisionId: i.revision_id,
          key,
          mime: i.mime,
          size: bytes.length,
          visibility: i.visibility,
          uploadedBy: actor.id,
        },
      });
      await audit(tx, actor.id, 'media.uploaded', id, i.sanatorium_id, undefined, {
        mime: i.mime,
        size: bytes.length,
        visibility: i.visibility,
      });
      return { id: asset.id, url: `/media/${asset.id}`, mime: asset.mime, size: asset.size };
    });
  }

  private async buildResizedVariant(
    asset: { id: string; key: string; mime: string },
    originalBytes: Buffer,
    widthBucket: number,
  ): Promise<{ mime: string; bytes: Buffer }> {
    if (
      originalBytes.length < 2048 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mime)
    ) {
      return { mime: asset.mime, bytes: originalBytes };
    }
    const cacheKey = `${asset.key}:w${widthBucket}`;
    const memHit = getCachedVariant(cacheKey);
    if (memHit) return memHit;

    const sidecarPath =
      this.config.STORAGE_ADAPTER !== 's3' ? `${this.path(asset.key)}.w${widthBucket}.webp` : null;
    if (sidecarPath) {
      try {
        const diskBytes = await readFile(sidecarPath);
        if (diskBytes.length > 0) {
          const val = { mime: 'image/webp', bytes: diskBytes };
          putCachedVariant(cacheKey, val);
          return val;
        }
      } catch {
        // Sidecar not generated yet
      }
    }

    const sharp = getSharp();
    if (!sharp) return { mime: asset.mime, bytes: originalBytes };

    try {
      const quality = widthBucket <= 640 ? 76 : 82;
      const webpBytes: Buffer = await sharp(originalBytes)
        .rotate()
        .resize({ width: widthBucket, withoutEnlargement: true })
        .webp({ quality, effort: 3 })
        .toBuffer();
      if (webpBytes.length > 0 && webpBytes.length < originalBytes.length) {
        const val = { mime: 'image/webp', bytes: webpBytes };
        putCachedVariant(cacheKey, val);
        if (sidecarPath) {
          void writeFile(sidecarPath, webpBytes, { mode: 0o600 }).catch(() => undefined);
        }
        return val;
      }
    } catch {
      // Fallback to original bytes if sharp fails on unusual image data
    }
    return { mime: asset.mime, bytes: originalBytes };
  }

  async fetch(
    id: string,
    token?: string,
    channel: 'WEB' | 'MOBILE' = 'WEB',
    requestedWidth?: unknown,
  ) {
    parse(uuid, id);
    let asset: {
      id: string;
      sanatoriumId: string;
      revisionId: string | null;
      key: string;
      mime: string;
      visibility: string;
    } | null = null;
    let isSanatoriumPublic = false;

    if (typeof (this.db as any)?.$queryRaw === 'function') {
      const rows = await this.db.$queryRaw<
        Array<{
          id: string;
          sanatoriumId: string;
          revisionId: string | null;
          key: string;
          mime: string;
          visibility: string;
          sanatoriumPublic: boolean;
        }>
      >`
        SELECT
          m.id,
          m."sanatoriumId",
          m."revisionId",
          m.key,
          m.mime,
          m.visibility,
          COALESCE(
            m.visibility = 'PUBLIC'
            AND s.status = 'ACTIVE'
            AND jsonb_typeof(r.data->'photo_ids') = 'array'
            AND (r.data->'photo_ids') ? m.id::text,
            false
          ) AS "sanatoriumPublic"
        FROM "MediaAsset" m
        LEFT JOIN "Sanatorium" s ON s.id = m."sanatoriumId"
        LEFT JOIN "SanatoriumRevision" r ON r.id = s."publicRevisionId"
        WHERE m.id = ${id}::uuid
        LIMIT 1`;
      if (rows.length > 0) {
        asset = rows[0];
        isSanatoriumPublic = Boolean(rows[0].sanatoriumPublic);
      }
    } else {
      asset = await this.db.mediaAsset.findUnique({ where: { id } });
      if (asset && asset.visibility === 'PUBLIC') {
        const s = await this.db.sanatorium.findUnique({ where: { id: asset.sanatoriumId } });
        if (s?.status === 'ACTIVE' && s.publicRevisionId) {
          const r = await this.db.sanatoriumRevision.findUnique({ where: { id: s.publicRevisionId } });
          isSanatoriumPublic = !!(r?.data as any)?.photo_ids?.includes(id);
        }
      }
    }

    if (!asset) fail('NOT_FOUND', 'Fayl topilmadi', 404);

    let isPublic = isSanatoriumPublic;
    if (!isPublic && asset.visibility === 'PUBLIC' && asset.mime.startsWith('image/')) {
      const now = new Date();
      const ads = await this.db.adCampaign.findMany({
        where: {
          sanatoriumId: asset.sanatoriumId,
          status: 'APPROVED',
          startsAt: { lte: now },
          endsAt: { gt: now },
          data: { path: ['image_asset_id'], equals: id },
        },
      });
      for (const ad of ads) {
        if ((await adPublicationStatus(this.db, ad, now)) === 'LIVE') {
          isPublic = true;
          break;
        }
      }
    }

    if (!isPublic) {
      if (!token) fail('NOT_FOUND', 'Fayl topilmadi', 404);
      const actor = await this.auth.authenticate(token, channel);
      const recipients = await this.db.messageRecipient.findMany({
        where: { userId: actor.id },
        select: { messageId: true },
      });
      const shared = await this.db.message.findFirst({
        where: { id: { in: recipients.map((r) => r.messageId) }, assetIds: { has: asset.id } },
      });
      if (!shared) {
        scope(
          actor,
          asset.sanatoriumId,
          asset.visibility === 'PRIVATE' && !asset.revisionId
            ? 'reports.financial.read'
            : 'sanatorium.profile.edit',
        );
      }
    }

    const widthBucket = normalizeMediaWidth(requestedWidth);

    if (this.config.STORAGE_ADAPTER === 's3') {
      const s3 = this.s3();
      try {
        return {
          mime: asset.mime,
          url: await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: this.config.S3_BUCKET,
              Key: asset.key,
              ResponseContentType: asset.mime,
              ...(isSanatoriumPublic
                ? { ResponseCacheControl: 'public, max-age=86400, stale-while-revalidate=604800' }
                : {}),
            }),
            { expiresIn: isSanatoriumPublic ? 3600 : 60 },
          ),
          public: isPublic,
          sanatoriumPublic: isSanatoriumPublic,
          etag: `W/"${asset.id}"`,
        };
      } finally {
        s3.destroy();
      }
    }

    const origCacheKey = `${asset.key}:orig`;
    let originalBytes = getCachedVariant(origCacheKey)?.bytes;
    if (!originalBytes) {
      originalBytes = await readFile(this.path(asset.key));
      if (isPublic) {
        putCachedVariant(origCacheKey, { mime: asset.mime, bytes: originalBytes });
      }
    }

    if (widthBucket) {
      const variant = await this.buildResizedVariant(asset, originalBytes, widthBucket);
      return {
        mime: variant.mime,
        bytes: variant.bytes,
        public: isPublic,
        sanatoriumPublic: isSanatoriumPublic,
        widthBucket,
        etag: `W/"${asset.id}-w${widthBucket}-${variant.mime === 'image/webp' ? 'webp' : 'orig'}"`,
      };
    }

    return {
      mime: asset.mime,
      bytes: originalBytes,
      public: isPublic,
      sanatoriumPublic: isSanatoriumPublic,
      widthBucket: null,
      etag: `W/"${asset.id}"`,
    };
  }
}

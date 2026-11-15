import { Controller, Get, Headers, Inject, Injectable, Optional, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor, Public, Roles } from '../auth/guard';
import { type Actor, requirePlatform } from '../auth/permissions';
import { Db, emit, lock } from '../common/db';

const REPO_SLUG = 'MirsaidIbrohimov/Sihhat-uz1.1';
const GITHUB_LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO_SLUG}/releases/latest`;
const WEB_APK_DOWNLOAD_URL = 'https://www.sihhat.uz/api/download/apk';
const CACHE_TTL_MS = 5 * 60 * 1000;
const ANNOUNCE_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_BASELINE_BUILD = 8;

export interface ParsedReleaseTag {
  version: string;
  buildNumber: number;
}

export interface MobileReleaseInfo {
  platform: 'android';
  available: boolean;
  version: string | null;
  build_number: number;
  tag: string | null;
  download_url: string;
  web_download_url: string;
  release_notes: string | null;
  published_at: string | null;
  source: 'env' | 'github-release-api' | 'unavailable';
  checked_at: string;
}

export interface MobileVersionStatus extends MobileReleaseInfo {
  current_build: number | null;
  update_available: boolean;
  title: string;
  message: string;
}

interface CachedRelease {
  expiresAt: number;
  etag: string | null;
  release: MobileReleaseInfo;
}

export function validHttpsUrl(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export function parsePositiveInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === 'string' && /^\d{1,9}$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  return null;
}

export function parseReleaseTag(
  tag?: string | null,
  name?: string | null,
): ParsedReleaseTag | null {
  for (const candidate of [tag, name]) {
    if (!candidate) continue;
    const match = candidate
      .trim()
      .match(/v?(\d+\.\d+\.\d+)(?:-b|\+|(?:\s*\(build\s*))(\d+)\)?/i);
    if (match) {
      const buildNumber = Number(match[2]);
      if (Number.isSafeInteger(buildNumber) && buildNumber > 0) {
        return { version: match[1], buildNumber };
      }
    }
  }
  return null;
}

export function pickApkAsset(
  assets?: Array<{ name?: string; browser_download_url?: string }>,
): { name: string; url: string } | null {
  const valid = (assets ?? []).filter(
    (a): a is { name: string; browser_download_url: string } =>
      typeof a.name === 'string' &&
      a.name.toLowerCase().endsWith('.apk') &&
      validHttpsUrl(a.browser_download_url) !== null,
  );
  if (!valid.length) return null;
  const score = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'sihhat-uz.apk') return 3;
    if (lower.includes('release')) return 2;
    if (!lower.includes('demo')) return 1;
    return 0;
  };
  valid.sort((a, b) => score(b.name) - score(a.name));
  return {
    name: valid[0].name,
    url: validHttpsUrl(valid[0].browser_download_url)!,
  };
}

export function sanitizeReleaseNotes(body?: string | null): string | null {
  const text = (body ?? '').trim();
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('<!--') && !/^https?:\/\//i.test(l) && !/sha-?256/i.test(l));
  const summary = lines.slice(0, 4).join(' ').replace(/\s+/g, ' ').trim();
  if (!summary) return null;
  return summary.length > 260 ? `${summary.slice(0, 257)}...` : summary;
}

@Injectable()
export class AppVersionService {
  private cache: CachedRelease | null = null;
  private inflight: Promise<MobileReleaseInfo> | null = null;
  private lastAnnounceCheckAt = 0;

  constructor(
    @Optional() @Inject(Db) private readonly db?: Db,
  ) {}

  private envRelease(): MobileReleaseInfo | null {
    const version = process.env.MOBILE_LATEST_VERSION?.trim();
    const buildNumber = parsePositiveInt(process.env.MOBILE_LATEST_BUILD);
    if (!version || !buildNumber) return null;
    const downloadUrl =
      validHttpsUrl(process.env.MOBILE_APK_URL) ??
      validHttpsUrl(process.env.SIHHAT_APK_URL) ??
      WEB_APK_DOWNLOAD_URL;
    return {
      platform: 'android',
      available: true,
      version,
      build_number: buildNumber,
      tag: `v${version}-b${buildNumber}`,
      download_url: downloadUrl,
      web_download_url: WEB_APK_DOWNLOAD_URL,
      release_notes: process.env.MOBILE_RELEASE_NOTES?.trim() || null,
      published_at: null,
      source: 'env',
      checked_at: new Date().toISOString(),
    };
  }

  private unavailableRelease(): MobileReleaseInfo {
    const fallbackUrl =
      validHttpsUrl(process.env.MOBILE_APK_URL) ??
      validHttpsUrl(process.env.SIHHAT_APK_URL) ??
      WEB_APK_DOWNLOAD_URL;
    return {
      platform: 'android',
      available: false,
      version: null,
      build_number: 0,
      tag: null,
      download_url: fallbackUrl,
      web_download_url: WEB_APK_DOWNLOAD_URL,
      release_notes: null,
      published_at: null,
      source: 'unavailable',
      checked_at: new Date().toISOString(),
    };
  }

  async getLatestAndroidRelease(options?: {
    forceRefresh?: boolean;
    fetchImpl?: typeof fetch;
  }): Promise<MobileReleaseInfo> {
    const fromEnv = this.envRelease();
    if (fromEnv) return fromEnv;

    const now = Date.now();
    if (!options?.forceRefresh && this.cache && this.cache.expiresAt > now) {
      return this.cache.release;
    }

    if (this.inflight && !options?.forceRefresh) {
      return this.inflight;
    }

    const fetchFn = options?.fetchImpl ?? fetch;
    const load = async (): Promise<MobileReleaseInfo> => {
      try {
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Sihhat-uz-API',
        };
        if (this.cache?.etag && !options?.forceRefresh) {
          headers['If-None-Match'] = this.cache.etag;
        }
        const res = await fetchFn(GITHUB_LATEST_RELEASE_URL, {
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(4000),
        });
        if (res.status === 304 && this.cache) {
          const refreshed: MobileReleaseInfo = {
            ...this.cache.release,
            checked_at: new Date().toISOString(),
          };
          this.cache = {
            ...this.cache,
            expiresAt: Date.now() + CACHE_TTL_MS,
            release: refreshed,
          };
          return refreshed;
        }
        if (!res.ok) {
          return this.cache?.release ?? this.unavailableRelease();
        }
        const data = (await res.json()) as {
          tag_name?: string;
          name?: string;
          body?: string;
          published_at?: string;
          draft?: boolean;
          prerelease?: boolean;
          assets?: Array<{ name?: string; browser_download_url?: string }>;
        };
        if (data.draft || data.prerelease) {
          return this.cache?.release ?? this.unavailableRelease();
        }
        const parsed = parseReleaseTag(data.tag_name, data.name);
        const apkAsset = pickApkAsset(data.assets);
        if (!parsed || !apkAsset) {
          return this.cache?.release ?? this.unavailableRelease();
        }
        const release: MobileReleaseInfo = {
          platform: 'android',
          available: true,
          version: parsed.version,
          build_number: parsed.buildNumber,
          tag: data.tag_name?.trim() || `v${parsed.version}-b${parsed.buildNumber}`,
          download_url: apkAsset.url,
          web_download_url: WEB_APK_DOWNLOAD_URL,
          release_notes: sanitizeReleaseNotes(data.body),
          published_at: data.published_at ?? null,
          source: 'github-release-api',
          checked_at: new Date().toISOString(),
        };
        this.cache = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          etag: res.headers.get('etag'),
          release,
        };
        return release;
      } catch {
        return this.cache?.release ?? this.unavailableRelease();
      }
    };

    const task = load().finally(() => {
      if (this.inflight === task) this.inflight = null;
    });
    this.inflight = task;
    return task;
  }

  async getVersionStatus(params?: {
    currentBuild?: unknown;
    forceRefresh?: boolean;
    fetchImpl?: typeof fetch;
  }): Promise<MobileVersionStatus> {
    const release = await this.getLatestAndroidRelease({
      forceRefresh: params?.forceRefresh,
      fetchImpl: params?.fetchImpl,
    });
    const currentBuild = parsePositiveInt(params?.currentBuild);
    const updateAvailable = Boolean(
      release.available &&
        release.build_number > 0 &&
        currentBuild !== null &&
        release.build_number > currentBuild,
    );
    const title = release.version
      ? `Ilova yangilandi (v${release.version})`
      : 'Ilova yangilanishi';
    const message = release.version
      ? `Sihhat.uz ilovasining yangi ${release.version} versiyasi chiqdi. Eng so‘nggi versiyani yuklab oling.`
      : 'Eng so‘nggi versiyani yuklab oling.';
    return {
      ...release,
      current_build: currentBuild,
      update_available: updateAvailable,
      title,
      message,
    };
  }

  async checkAndAnnounceNewRelease(options?: {
    force?: boolean;
    fetchImpl?: typeof fetch;
  }): Promise<{ announced: boolean; reason?: string; tag?: string; recipients?: number }> {
    if (!this.db) return { announced: false, reason: 'no_db' };
    const now = Date.now();
    if (!options?.force && now - this.lastAnnounceCheckAt < ANNOUNCE_INTERVAL_MS) {
      return { announced: false, reason: 'throttled' };
    }
    this.lastAnnounceCheckAt = now;

    const release = await this.getLatestAndroidRelease({
      forceRefresh: options?.force,
      fetchImpl: options?.fetchImpl,
    });
    if (!release.available || release.build_number <= 0 || !release.version || !release.tag) {
      return { announced: false, reason: 'no_release' };
    }

    return this.db.atomic(async tx => {
      await lock(tx, 'mobile-release-announce');
      const priorLogs = await tx.auditLog.findMany({
        where: { action: 'mobile.release.announced' },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });

      const entityKey = `android:${release.tag}`;
      let maxAnnouncedBuild = 0;
      for (const row of priorLogs) {
        if (row.entityId === entityKey) {
          return { announced: false, reason: 'already_announced', tag: release.tag! };
        }
        const afterBuild = parsePositiveInt((row.after as Record<string, unknown> | null)?.build_number);
        const tagParsed = parseReleaseTag(row.entityId.replace(/^android:/, ''));
        const rowBuild = afterBuild ?? tagParsed?.buildNumber ?? 0;
        if (rowBuild > maxAnnouncedBuild) maxAnnouncedBuild = rowBuild;
      }

      if (maxAnnouncedBuild >= release.build_number && !options?.force) {
        return { announced: false, reason: 'not_newer', tag: release.tag! };
      }

      if (priorLogs.length === 0 && !options?.force && release.build_number <= INITIAL_BASELINE_BUILD) {
        await tx.auditLog.create({
          data: {
            action: 'mobile.release.announced',
            entityId: entityKey,
            after: {
              platform: 'android',
              version: release.version,
              build_number: release.build_number,
              tag: release.tag,
              baseline: true,
            },
          },
        });
        return { announced: false, reason: 'baseline_recorded', tag: release.tag! };
      }

      const [customers, mobileSessions] = await Promise.all([
        tx.user.findMany({
          where: { kind: 'CUSTOMER', status: 'ACTIVE' },
          select: { id: true },
        }),
        tx.session.findMany({
          where: {
            channel: 'MOBILE',
            revokedAt: null,
            refreshExpiresAt: { gt: new Date() },
          },
          select: { userId: true },
        }),
      ]);

      const recipientIds = [...new Set([
        ...customers.map(c => c.id),
        ...mobileSessions.map(s => s.userId),
      ])];

      await tx.auditLog.create({
        data: {
          action: 'mobile.release.announced',
          entityId: entityKey,
          after: {
            platform: 'android',
            version: release.version,
            build_number: release.build_number,
            tag: release.tag,
            download_url: release.download_url,
            recipient_count: recipientIds.length,
          },
        },
      });

      if (recipientIds.length > 0) {
        await emit(tx, 'app.update', {
          title: `Ilova yangilandi (v${release.version})`,
          summary: `Eng so‘nggi versiyani yuklab oling (v${release.version}).`,
          body: `Sihhat.uz ilovasining yangi ${release.version} (build ${release.build_number}) versiyasi chiqdi. Yangi imkoniyatlar va tuzatishlardan foydalanish uchun eng so‘nggi versiyani yuklab oling.`,
          version: release.version,
          target_version: release.version,
          build_number: release.build_number,
          target_build: release.build_number,
          tag: release.tag,
          download_url: release.download_url,
          web_download_url: release.web_download_url,
          recipient_ids: recipientIds,
        });
      }

      return {
        announced: true,
        tag: release.tag!,
        recipients: recipientIds.length,
      };
    });
  }
}

@ApiTags('Katalog va AI')
@Controller()
export class AppVersionController {
  constructor(@Inject(AppVersionService) private readonly versions: AppVersionService) {}

  @Public()
  @Get('mobile/app-version')
  mobileVersion(
    @Query('build') build?: string,
    @Headers('x-app-build') headerBuild?: string,
  ) {
    return this.versions.getVersionStatus({ currentBuild: build ?? headerBuild });
  }

  @Public()
  @Get('catalog/app-version')
  catalogVersion(
    @Query('build') build?: string,
    @Headers('x-app-build') headerBuild?: string,
  ) {
    return this.versions.getVersionStatus({ currentBuild: build ?? headerBuild });
  }

  @Post('superadmin/app-version/announce')
  @Roles('SUPERADMIN')
  announce(@CurrentActor() actor: Actor) {
    requirePlatform(actor, 'announcements.broadcast');
    return this.versions.checkAndAnnounceNewRelease({ force: true });
  }
}

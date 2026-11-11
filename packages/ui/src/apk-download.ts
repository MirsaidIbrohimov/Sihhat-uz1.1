import fs from "node:fs";
import path from "node:path";

const REPO_SLUG = "MirsaidIbrohimov/Sihhat-uz1.1";
const GITHUB_LATEST_ASSET_URL = `https://github.com/${REPO_SLUG}/releases/latest/download/sihhat-uz.apk`;
const GITHUB_LATEST_API_URL = `https://api.github.com/repos/${REPO_SLUG}/releases/latest`;
const FALLBACK_RAW_APK_URL = `https://github.com/${REPO_SLUG}/raw/main/ilova/Sihhat-uz-demo-0.1.1.apk`;

type ApkResolution =
  | { kind: "redirect"; source: string; url: string; filename: string }
  | { kind: "local"; source: string; filePath: string; size: number; filename: string };

function redirectNoStore(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}

function validHttpsUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

async function resolveGitHubDirectRelease(
  fetchImpl: typeof fetch,
): Promise<ApkResolution | null> {
  try {
    const res = await fetchImpl(GITHUB_LATEST_ASSET_URL, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    const location = res.headers.get("location");
    if (
      res.status === 200 ||
      (res.status >= 300 &&
        res.status < 400 &&
        location &&
        (/\/releases\/download\//.test(location) ||
          /githubusercontent\.com/.test(location)))
    ) {
      return {
        kind: "redirect",
        source: "github-release-direct",
        url: location ?? GITHUB_LATEST_ASSET_URL,
        filename: "sihhat-uz.apk",
      };
    }
  } catch {
    // Fall through to REST API or local fallback.
  }
  return null;
}

async function resolveGitHubApiRelease(
  fetchImpl: typeof fetch,
): Promise<ApkResolution | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "sihhat-uz-web",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchImpl(GITHUB_LATEST_API_URL, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      assets?: Array<{ name?: string; browser_download_url?: string }>;
    };
    const apkAssets = (data.assets ?? []).filter(
      (a) =>
        typeof a.name === "string" &&
        a.name.toLowerCase().endsWith(".apk") &&
        typeof a.browser_download_url === "string" &&
        a.browser_download_url.startsWith("https://"),
    );
    if (!apkAssets.length) return null;
    apkAssets.sort((a, b) => {
      const score = (name: string) => {
        const lower = name.toLowerCase();
        if (lower === "sihhat-uz.apk") return 3;
        if (lower.includes("release")) return 2;
        if (!lower.includes("demo")) return 1;
        return 0;
      };
      return score(b.name!) - score(a.name!);
    });
    const chosen = apkAssets[0];
    return {
      kind: "redirect",
      source: "github-release-api",
      url: chosen.browser_download_url!,
      filename: chosen.name!,
    };
  } catch {
    return null;
  }
}

function findLocalApk(): ApkResolution | null {
  const staticCandidates = [
    path.join(process.cwd(), "public", "downloads", "sihhat-uz.apk"),
    path.join(process.cwd(), "public", "sihhat-uz.apk"),
    path.join(process.cwd(), "..", "..", "ilova", "sihhat-uz.apk"),
    path.join(process.cwd(), "ilova", "sihhat-uz.apk"),
  ];
  const ilovaDirs = [
    path.join(process.cwd(), "..", "..", "ilova"),
    path.join(process.cwd(), "ilova"),
  ];
  for (const dir of ilovaDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const entries = fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith(".apk"))
        .sort()
        .reverse();
      for (const entry of entries) {
        staticCandidates.push(path.join(dir, entry));
      }
    } catch {
      // Ignore unreadable directory.
    }
  }

  for (const candidate of staticCandidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const stat = fs.statSync(candidate);
      if (stat.isFile() && stat.size > 1_000_000) {
        return {
          kind: "local",
          source: "local-file",
          filePath: candidate,
          size: stat.size,
          filename: path.basename(candidate),
        };
      }
    } catch {
      // Continue checking next candidate.
    }
  }
  return null;
}

export async function resolveLatestApk(
  fetchImpl: typeof fetch = fetch,
): Promise<ApkResolution> {
  const envUrl = validHttpsUrl(process.env.SIHHAT_APK_URL);
  if (envUrl) {
    return {
      kind: "redirect",
      source: "env-sihhat-apk-url",
      url: envUrl,
      filename: path.basename(new URL(envUrl).pathname) || "sihhat-uz.apk",
    };
  }

  const direct = await resolveGitHubDirectRelease(fetchImpl);
  if (direct) return direct;

  const fromApi = await resolveGitHubApiRelease(fetchImpl);
  if (fromApi) return fromApi;

  const local = findLocalApk();
  if (local) return local;

  return {
    kind: "redirect",
    source: "github-raw-fallback",
    url: FALLBACK_RAW_APK_URL,
    filename: "Sihhat-uz-demo-0.1.1.apk",
  };
}

export async function handleApkDownload(
  request?: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const resolution = await resolveLatestApk(fetchImpl);
  const url = request ? new URL(request.url) : null;

  if (url?.searchParams.get("info") === "1") {
    return Response.json(
      {
        source: resolution.source,
        filename: resolution.filename,
        url:
          resolution.kind === "redirect"
            ? resolution.url
            : "/api/download/apk",
        size: resolution.kind === "local" ? resolution.size : undefined,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  }

  if (resolution.kind === "redirect") {
    return redirectNoStore(resolution.url);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": 'attachment; filename="sihhat-uz.apk"',
    "Content-Length": resolution.size.toString(),
    "Cache-Control": "no-store, max-age=0, must-revalidate",
  };

  if (request?.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  const buffer = fs.readFileSync(resolution.filePath);
  return new Response(buffer, { status: 200, headers });
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { handleApkDownload } from "../packages/ui/src/apk-download.ts";

test("apk download: prefers SIHHAT_APK_URL env override when valid HTTPS", async () => {
  const prev = process.env.SIHHAT_APK_URL;
  process.env.SIHHAT_APK_URL = "https://cdn.example.uz/releases/sihhat-0.2.3.apk";
  try {
    const res = await handleApkDownload(new Request("https://sihhat.uz/api/download/apk"));
    assert.equal(res.status, 302);
    assert.equal(
      res.headers.get("location"),
      "https://cdn.example.uz/releases/sihhat-0.2.3.apk",
    );
    assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  } finally {
    if (prev === undefined) delete process.env.SIHHAT_APK_URL;
    else process.env.SIHHAT_APK_URL = prev;
  }
});

test("apk download: resolves direct GitHub latest release asset with verification", async () => {
  const prev = process.env.SIHHAT_APK_URL;
  delete process.env.SIHHAT_APK_URL;
  const called: string[] = [];
  const mockFetch = (async (input: string | URL) => {
    called.push(String(input));
    return new Response(null, {
      status: 302,
      headers: {
        location:
          "https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/download/v0.2.3-b6/sihhat-uz.apk",
      },
    });
  }) as typeof fetch;

  try {
    const res = await handleApkDownload(
      new Request("https://sihhat.uz/api/download/apk?info=1"),
      mockFetch,
    );
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.source, "github-release-direct");
    assert.equal(json.filename, "sihhat-uz.apk");
    assert.match(String(json.url), /v0\.2\.3-b6\/sihhat-uz\.apk$/);
    // Expects initial candidate lookup + verification hop
    assert.equal(called.length, 2);
  } finally {
    if (prev !== undefined) process.env.SIHHAT_APK_URL = prev;
  }
});

test("apk download: verifies candidate and falls back to sihhat-uz-release.apk if sihhat-uz.apk is 404", async () => {
  const prev = process.env.SIHHAT_APK_URL;
  delete process.env.SIHHAT_APK_URL;
  const called: string[] = [];
  const mockFetch = (async (input: string | URL) => {
    const u = String(input);
    called.push(u);
    if (u.includes("latest/download/sihhat-uz.apk")) {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/download/v0.2.4-b7/sihhat-uz.apk",
        },
      });
    }
    if (u.endsWith("v0.2.4-b7/sihhat-uz.apk")) {
      return new Response(null, { status: 404 });
    }
    if (u.includes("latest/download/sihhat-uz-release.apk")) {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/download/v0.2.4-b7/sihhat-uz-release.apk",
        },
      });
    }
    if (u.endsWith("v0.2.4-b7/sihhat-uz-release.apk")) {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://release-assets.githubusercontent.com/blob-storage-apk",
        },
      });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;

  try {
    const res = await handleApkDownload(
      new Request("https://sihhat.uz/api/download/apk?info=1"),
      mockFetch,
    );
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.source, "github-release-direct");
    assert.equal(json.filename, "sihhat-uz-release.apk");
    assert.equal(
      json.url,
      "https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/download/v0.2.4-b7/sihhat-uz-release.apk",
    );
  } finally {
    if (prev !== undefined) process.env.SIHHAT_APK_URL = prev;
  }
});

test("apk download: falls back to GitHub REST API and prefers release over demo asset", async () => {
  const prev = process.env.SIHHAT_APK_URL;
  delete process.env.SIHHAT_APK_URL;
  const mockFetch = (async (input: string | URL) => {
    const u = String(input);
    if (u.includes("/releases/latest/download/")) {
      return new Response(null, { status: 404 });
    }
    return Response.json({
      assets: [
        {
          name: "sihhat-demo.apk",
          browser_download_url: "https://github.com/org/repo/releases/download/v1/sihhat-demo.apk",
        },
        {
          name: "sihhat-uz-release.apk",
          browser_download_url: "https://github.com/org/repo/releases/download/v1/sihhat-uz-release.apk",
        },
      ],
    });
  }) as typeof fetch;

  try {
    const res = await handleApkDownload(
      new Request("https://sihhat.uz/api/download/apk"),
      mockFetch,
    );
    assert.equal(res.status, 302);
    assert.equal(
      res.headers.get("location"),
      "https://github.com/org/repo/releases/download/v1/sihhat-uz-release.apk",
    );
  } finally {
    if (prev !== undefined) process.env.SIHHAT_APK_URL = prev;
  }
});

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createApp } from "../src/app";
import { Db, bodyHash } from "../src/common/db";
import { MediaService } from "../src/media/media.service";
import { SanatoriumService } from "../src/sanatoriums/sanatorium.service";
import type { Actor } from "../src/auth/permissions";

const sources = [
  {
    name: "Chimyon — mahalliy demo",
    page: "https://chimyonsanatorium.uz/",
    urls: [
      "https://admin.chimyonsanatorium.uz/files/photomedias/file-2108135996094675.jpg",
      "https://admin.chimyonsanatorium.uz/files/photomedias/file-2076966643548505.webp",
      "https://admin.chimyonsanatorium.uz/files/photomedias/file-2076966768196565.webp",
      "https://admin.chimyonsanatorium.uz/files/photomedias/file-2076966900371930.webp",
    ],
  },
  {
    name: "Zomin — mahalliy demo",
    page: "https://zomin-san.uz/",
    urls: [
      "https://zomin-san.uz/admin/slider/uploads/1744980607_8214.jpg",
      "https://zomin-san.uz/admin/foto/uploads/1745043510_2413.jpg",
      "https://zomin-san.uz/admin/foto/uploads/1745043547_7093.jpg",
      "https://zomin-san.uz/admin/xona/uploads/1745055508_5411.jpg",
    ],
  },
];

let stage = "startup";
async function main() {
  const { app, config } = await createApp({ quiet: true, swagger: false });
  try {
    const url = new URL(config.DATABASE_URL);
    if (
      config.NODE_ENV !== "development" ||
      url.hostname !== "127.0.0.1" ||
      url.port !== "55432" ||
      url.pathname !== "/sihhat"
    )
      throw new Error("Local database required");
    const db = app.get(Db),
      media = app.get(MediaService),
      profiles = app.get(SanatoriumService);
    const admin = await db.user.findFirst({
      where: { kind: "SUPERADMIN", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!admin) throw new Error("Local administrator required");
    const actor: Actor = {
      id: admin.id,
      kind: "SUPERADMIN",
      name: admin.name,
      sessionId: "local-photos",
      mustChangePassword: false,
      memberships: [],
    };
    const evidencePath = resolve("../../.local/sanatorium-photo-import.json");
    let evidence: Record<
      string,
      { id: string; source: string; bytes: number }
    > = {};
    try {
      evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    } catch {
      /* First import. */
    }
    const persist = () =>
      writeFile(evidencePath, JSON.stringify(evidence, null, 2), {
        mode: 0o600,
      });
    await mkdir(resolve("../../.local"), { recursive: true });
    for (const source of sources) {
      stage = `${source.page} profile`;
      const site = await db.sanatorium.findFirst({
        where: {
          name: source.name,
          status: "ACTIVE",
          publicRevisionId: { not: null },
        },
      });
      if (!site) throw new Error("Seeded local sanatorium required");
      const published = await db.sanatoriumRevision.findUniqueOrThrow({
        where: { id: site.publicRevisionId! },
      });
      const records = source.urls.map((link) => evidence[`${site.id}:${link}`]);
      if (
        records.every(
          (r) => r && (published.data as any).photo_ids?.includes(r.id),
        )
      ) {
        console.log(
          JSON.stringify({
            name: source.name,
            photos: records.length,
            status: "already_imported",
          }),
        );
        continue;
      }
      let draft = await profiles.newDraft(actor, site.id);
      // Never publish an existing user edit as a side effect of importing demo photos.
      if (
        draft.status !== "DRAFT" ||
        bodyHash({ ...(draft.data as object), photo_ids: [] }) !==
          bodyHash({ ...(published.data as object), photo_ids: [] })
      )
        throw new Error("Existing profile edit needs review");
      const ids: string[] = [];
      for (const link of source.urls) {
        stage = `${source.page} photo ${ids.length + 1}`;
        const key = `${site.id}:${link}`;
        if (
          evidence[key] &&
          (await db.mediaAsset.findFirst({
            where: { id: evidence[key].id, sanatoriumId: site.id },
          }))
        ) {
          ids.push(evidence[key].id);
          continue;
        }
        const response = await fetch(link, {
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error("Photo source unavailable");
        const bytes = Buffer.from(await response.arrayBuffer());
        // Some official .jpg URLs return PNG bytes with a JPEG Content-Type.
        const mime = bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? "image/jpeg"
            : bytes.subarray(0, 4).toString() === "RIFF" &&
                bytes.subarray(8, 12).toString() === "WEBP"
              ? "image/webp"
              : undefined;
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(mime ?? "") ||
          bytes.length < 1024 ||
          bytes.length > 8 * 1024 * 1024
        )
          throw new Error("Invalid source photo");
        const asset = await media.upload(actor, {
          sanatorium_id: site.id,
          revision_id: draft.id,
          visibility: "PUBLIC",
          mime,
          base64: bytes.toString("base64"),
        });
        evidence[key] = {
          id: asset.id,
          source: source.page,
          bytes: bytes.length,
        };
        await persist();
        ids.push(asset.id);
      }
      const existing = await db.mediaAsset.findMany({
        where: {
          id: {
            in: (published.data as any).photo_ids ?? [],
            notIn: Object.values(evidence).map((record) => record.id),
          },
          size: { gt: 100 },
        },
        select: { id: true },
      });
      const photos = [...new Set([...ids, ...existing.map((p) => p.id)])].slice(
        0,
        30,
      );
      stage = `${source.page} save`;
      draft = await profiles.save(actor, draft.id, {
        version: draft.version,
        data: { photo_ids: photos },
      });
      draft = await profiles.submit(actor, draft.id, {
        version: draft.version,
      });
      stage = `${source.page} publish`;
      await profiles.moderate(actor, draft.id, true, {
        version: draft.version,
      });
      console.log(
        JSON.stringify({
          name: source.name,
          photos: photos.length,
          status: "published",
          source: source.page,
        }),
      );
    }
  } finally {
    await app.close();
  }
}
void main().catch((error) => {
  console.error(
    "Sanatoriya suratlarini import qilish tugamadi. Lokal profil va rasm manbalarini tekshiring.",
  );
  const known = [
    "Local database required",
    "Local administrator required",
    "Seeded local sanatorium required",
    "Existing profile edit needs review",
    "Photo source unavailable",
    "Invalid source photo",
  ];
  console.error(
    JSON.stringify({
      stage,
      ...(known.includes(error?.message) ? { reason: error.message } : {}),
      ...(typeof error?.code === "string" && /^[A-Z_0-9]+$/.test(error.code)
        ? { code: error.code }
        : {}),
    }),
  );
  process.exitCode = 1;
});

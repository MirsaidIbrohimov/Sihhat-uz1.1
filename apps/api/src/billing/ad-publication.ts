import type { Tx } from "../common/db";
import type { AdCampaign } from "../generated/prisma/client";
import { fail, uuid } from "../common/errors";
import { advertisementUrl } from "./ad-input";

type Ad = Pick<
  AdCampaign,
  | "sanatoriumId"
  | "status"
  | "startsAt"
  | "endsAt"
  | "invoiceId"
  | "amount"
  | "data"
>;
type AdDb = Pick<Tx, "sanatorium" | "mediaAsset" | "invoice">;

export function adVersion(ad: Pick<Ad, "data">): number {
  const value = (ad.data as any)?.content_version;
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

export function adTarget(ad: Pick<Ad, "sanatoriumId" | "data">) {
  const data = ad.data as any;
  return data?.target_kind === "URL"
    ? { kind: "URL" as const, url: data.target_url as string }
    : {
        kind: "SANATORIUM" as const,
        sanatorium_id: (data?.target_sanatorium_id ??
          ad.sanatoriumId) as string,
      };
}

export async function adDestinationAvailable(
  db: AdDb,
  ad: Pick<Ad, "sanatoriumId" | "data">,
) {
  const target = adTarget(ad);
  if (target.kind === "URL")
    return advertisementUrl.safeParse(target.url).success;
  if (!uuid.safeParse(target.sanatorium_id).success) return false;
  return !!(await db.sanatorium.findFirst({
    where: {
      id: target.sanatorium_id,
      status: "ACTIVE",
      publicRevisionId: { not: null },
    },
    select: { id: true },
  }));
}

export async function adImageAvailable(
  db: AdDb,
  ad: Pick<Ad, "sanatoriumId" | "data">,
) {
  const imageId = (ad.data as any)?.image_asset_id;
  if (!uuid.safeParse(imageId).success) return false;
  return !!(await db.mediaAsset.findFirst({
    where: {
      id: imageId,
      sanatoriumId: ad.sanatoriumId,
      visibility: "PUBLIC",
      mime: { startsWith: "image/" },
    },
    select: { id: true },
  }));
}

export async function assertAdPublishable(db: AdDb, ad: Ad, now = new Date()) {
  if (ad.endsAt <= now)
    fail(
      "AD_EXPIRED",
      "Reklama muddati tugagan. Tahrirlash orqali tugash sanasini yangilang.",
      422,
    );
  if (!(await adDestinationAvailable(db, ad))) {
    if (adTarget(ad).kind === "URL")
      fail(
        "AD_TARGET_INVALID",
        "Reklama ochadigan HTTPS havolasini tekshiring.",
        422,
      );
    fail(
      "SANATORIUM_NOT_PUBLIC",
      "Reklama ochadigan sanatoriya faol va tasdiqlangan bo‘lsin. Tahrirlash orqali boshqa sanatoriya yoki havola tanlang.",
      422,
    );
  }
  if (!(await adImageAvailable(db, ad)))
    fail(
      "AD_IMAGE_MISSING",
      "Reklama rasmini tahrirlash orqali qayta tanlang.",
      422,
    );
}

// Tenant ownership controls staff access. Publication follows the ad destination.
// Use the same rule for the panel, customer feed and anonymous image requests.
export async function adPublicationStatus(db: AdDb, ad: Ad, now = new Date()) {
  if (["REJECTED", "ARCHIVED"].includes(ad.status)) return ad.status;
  if (ad.status !== "APPROVED") return "WAITING_APPROVAL";
  if (ad.endsAt <= now) return "EXPIRED";
  if (ad.startsAt > now) return "SCHEDULED";
  if (!(await adDestinationAvailable(db, ad)))
    return adTarget(ad).kind === "URL" ? "TARGET_INVALID" : "SANATORIUM_HIDDEN";
  if (!(await adImageAvailable(db, ad))) return "IMAGE_MISSING";
  if (ad.amount === 0n && (ad.data as any)?.free === true && !ad.invoiceId)
    return "LIVE";
  if (
    ad.invoiceId &&
    (await db.invoice.findFirst({
      where: { id: ad.invoiceId, status: "PAID" },
      select: { id: true },
    }))
  )
    return "LIVE";
  return "WAITING_FREE_PUBLICATION";
}

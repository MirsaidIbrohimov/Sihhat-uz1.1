import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const TEZCHECK_BASE = "https://api.tezcheck.uz";
const BILLS_PATH = "/api/merchant/v1/bills";

// Reads TEZCHECK_* values from the environment, then from git-ignored local files.
// TEZCHECK_API_TOKEN is accepted as an alias of TEZCHECK_API_KEY.
function getTezCheckConfig() {
  const values: Record<string, string> = {};
  const candidates = [
    path.join(process.cwd(), ".local", "secrets", "providers.env"),
    path.join(process.cwd(), "..", "..", ".local", "secrets", "providers.env"),
    path.join(process.cwd(), "..", "..", ".env"),
  ];
  for (const file of candidates.reverse()) {
    if (!fs.existsSync(file)) continue;
    try {
      for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = /^\s*(TEZCHECK_[A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
        if (match && match[2]) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      // ignore unreadable local files
    }
  }
  const pick = (name: string) => process.env[name] || values[name] || "";
  return {
    apiKey: pick("TEZCHECK_API_KEY") || pick("TEZCHECK_API_TOKEN"),
    deskCode: pick("TEZCHECK_CASH_DESK_CODE"),
    returnUrl: pick("TEZCHECK_RETURN_URL"),
  };
}

function isTezcheckPayUrl(value: unknown): value is string {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:"
      && (url.hostname === "tezcheck.uz" || url.hostname.endsWith(".tezcheck.uz"))
      && url.pathname.startsWith("/pay/");
  } catch {
    return false;
  }
}

function failure(message: string, status: number, code?: string) {
  return NextResponse.json({ success: false, message, ...(code ? { code } : {}) }, { status });
}

// Preferred path: the API creates a real booking, a Tezcheck bill and confirms it via webhook/polling.
async function viaBackend(body: unknown) {
  const base = process.env.SIHHAT_API_URL;
  if (!base) return null;
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/payments/quick-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const json = await response.json().catch(() => null);
    if (response.ok && json && isTezcheckPayUrl(json.checkout_url)) return NextResponse.json(json);
    // Catalog mismatch (e.g. demo sanatorium ids) falls back to the direct bill below.
    if (response.status === 400 || response.status === 404) return null;
    const error = json?.error ?? json;
    return failure(error?.message || "To'lov hisobini yaratib bo'lmadi", response.status || 502, error?.code);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return failure("So'rov noto'g'ri", 400);
  }

  const backend = await viaBackend(body);
  if (backend) return backend;

  const guestName = (body.guest_name || "Mehmon").toString().trim().slice(0, 60);
  const nights = Math.min(30, Math.max(1, Number(body.nights) || 1));
  const sanatoriumId = String(body.sanatorium_id || "zomin-sanatorium");
  const ratePlanId = String(body.rate_plan_id || "");

  // Determine amount in tiyin (UZS * 100)
  let pricePerNightUzs = 5000; // Default Zomin arzon tarif: 5 000 UZS
  if (ratePlanId.includes("sh-1") || ratePlanId.includes("chirchiq") || sanatoriumId.includes("hayot")) {
    pricePerNightUzs = 250000;
  } else if (ratePlanId.includes("bs-1") || ratePlanId.includes("samarqand") || sanatoriumId.includes("bahor")) {
    pricePerNightUzs = 180000;
  } else if (ratePlanId.includes("tm-1") || ratePlanId.includes("buxoro") || sanatoriumId.includes("tomaris")) {
    pricePerNightUzs = 220000;
  }

  const totalAmountTiyin = pricePerNightUzs * 100 * nights;
  const totalAmountFormatted = `${(pricePerNightUzs * nights).toLocaleString("uz-UZ")} so'm`;
  const reference = `SH-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(1000, 10000)}`;

  const { apiKey, deskCode, returnUrl } = getTezCheckConfig();
  if (!apiKey || !deskCode) {
    return failure("Onlayn to'lov hozircha sozlanmagan. Keyinroq urinib ko'ring.", 503, "PAYMENT_UNAVAILABLE");
  }

  const payload = JSON.stringify({
    amount_minor: totalAmountTiyin,
    title: `Sihhat.uz bron ${reference} (${guestName})`,
    external_reference: reference,
    ...(returnUrl ? { return_url: returnUrl } : {}),
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto.createHash("sha256").update(payload).digest("hex");
  const signature = "v1=" + crypto
    .createHmac("sha256", apiKey)
    .update(`${timestamp}.POST.${BILLS_PATH}.${digest}`)
    .digest("hex");

  try {
    const response = await fetch(TEZCHECK_BASE + BILLS_PATH, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Cash-Desk-Code": deskCode,
        "X-TezCheck-Timestamp": String(timestamp),
        "X-TezCheck-Signature": signature,
        "Idempotency-Key": `sihhat.web.${reference}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: payload,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const resData = await response.json().catch(() => null);
    const paymentUrl = resData?.data?.payment_url;
    if (response.ok && isTezcheckPayUrl(paymentUrl)) {
      return NextResponse.json({
        success: true,
        checkout_url: paymentUrl,
        booking_id: reference,
        amount: totalAmountTiyin,
        amount_formatted: totalAmountFormatted,
      });
    }
    // Only the provider error code is logged; it never contains credentials.
    const code = typeof resData?.error?.code === "string" ? resData.error.code : `http_${response.status}`;
    console.error("TezCheck bill error:", code);
    return failure("Tezcheck to'lov hisobini yaratmadi. Keyinroq urinib ko'ring.", 502, code);
  } catch {
    console.error("TezCheck bill error: network");
    return failure("Tezcheck xizmatiga ulanib bo'lmadi. Keyinroq urinib ko'ring.", 503, "network");
  }
}

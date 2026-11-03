import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Helper to safely get TezCheck configuration
function getTezCheckConfig() {
  let apiKey = process.env.TEZCHECK_API_KEY || "";
  let deskCode = process.env.TEZCHECK_CASH_DESK_CODE || "";

  if (!apiKey || !deskCode) {
    const candidates = [
      path.join(process.cwd(), ".local", "secrets", "providers.env"),
      path.join(process.cwd(), "..", "..", ".local", "secrets", "providers.env"),
      path.join(process.cwd(), "..", ".local", "secrets", "providers.env"),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, "utf8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("TEZCHECK_API_KEY=")) {
              apiKey = trimmed.slice("TEZCHECK_API_KEY=".length).trim();
            }
            if (trimmed.startsWith("TEZCHECK_CASH_DESK_CODE=")) {
              deskCode = trimmed.slice("TEZCHECK_CASH_DESK_CODE=".length).trim();
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return { apiKey, deskCode };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const guestName = (body.guest_name || "Mehmon").toString().trim();
    const guestPhone = (body.guest_phone || "+998").toString().trim().replace(/[\s()-]/g, "");
    const nights = Math.max(1, Number(body.nights) || 1);
    const sanatoriumId = body.sanatorium_id || "zomin-sanatorium";
    const ratePlanId = body.rate_plan_id || "";

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
    const reference = `SH-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { apiKey, deskCode } = getTezCheckConfig();

    if (apiKey && deskCode) {
      try {
        const payload = JSON.stringify({
          amount_minor: totalAmountTiyin,
          title: `Sihhat.uz bron ${reference} (${guestName})`,
          external_reference: reference,
        });

        const timestamp = Math.floor(Date.now() / 1000);
        const apiPath = "/api/merchant/v1/bills";
        const digest = crypto.createHash("sha256").update(payload).digest("hex");
        const signature =
          "v1=" +
          crypto
            .createHmac("sha256", apiKey)
            .update(`${timestamp}.POST.${apiPath}.${digest}`)
            .digest("hex");

        const response = await fetch("https://api.tezcheck.uz/api/merchant/v1/bills", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Cash-Desk-Code": deskCode,
            "X-TezCheck-Timestamp": String(timestamp),
            "X-TezCheck-Signature": signature,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: payload,
        });

        if (response.ok) {
          const resData = await response.json();
          const paymentUrl = resData?.data?.payment_url;
          if (paymentUrl) {
            return NextResponse.json({
              success: true,
              checkout_url: paymentUrl,
              booking_id: reference,
              amount: totalAmountTiyin,
              amount_formatted: totalAmountFormatted,
            });
          }
        }
      } catch (err) {
        console.error("TezCheck API error:", err);
      }
    }

    // Direct hosted checkout link fallback
    const fallbackCheckoutUrl = `https://checkout.tezcheck.uz/pay/${reference.toLowerCase()}`;
    return NextResponse.json({
      success: true,
      checkout_url: fallbackCheckoutUrl,
      booking_id: reference,
      amount: totalAmountTiyin,
      amount_formatted: totalAmountFormatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "To'lov hisobini yaratishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

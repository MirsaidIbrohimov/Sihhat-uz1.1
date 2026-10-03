import { Inject, Injectable } from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { CONFIG, type Config } from "../common/config";
import { fail } from "../common/errors";

const minor = z.number().int().nonnegative().safe();
const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const billSchema = z.object({
  id: identifier,
  amount_minor: minor,
  currency: z.literal("UZS"),
  external_reference: z.string().nullable(),
  state: z.string(),
  available_until: z.string().nullable().optional(),
  paid: z.boolean().optional(),
  livemode: z.boolean().optional(),
  environment: z.string().nullable().optional(),
});
export const paymentSchema = z.object({
  id: identifier,
  state: z.string(),
  amount_minor: minor,
  fee_minor: minor,
  net_minor: minor,
  refunded_amount_minor: minor,
  currency: z.literal("UZS"),
  livemode: z.boolean(),
  environment: z.string(),
  succeeded_at: z.string().nullable().optional(),
  problem: z
    .object({ unknown_reason: z.string().nullable().optional() })
    .nullable()
    .optional(),
});
export type TezStatus = {
  bill: z.infer<typeof billSchema>;
  payment: z.infer<typeof paymentSchema> | null;
};

export class TezcheckError extends Error {
  constructor(
    readonly code: string,
    readonly status = 503,
  ) {
    super("Tezcheck so‘rovi bajarilmadi");
  }
}

@Injectable()
export class TezcheckClient {
  // The host cannot be supplied by an HTTP caller. Credentials never travel through redirects.
  readonly base = "https://api.tezcheck.uz/api/merchant/v1";
  fetcher: typeof fetch = (...args) => fetch(...args);
  private readonly signatures = new Map<string, number>();
  constructor(@Inject(CONFIG) readonly config: Config) {}

  async request(
    path: string,
    body?: unknown,
    options: { method?: "GET" | "POST"; desk?: string; key?: string } = {},
  ): Promise<any> {
    if (!this.config.TEZCHECK_API_KEY)
      throw new TezcheckError("not_configured");
    if (!/^\/[A-Za-z0-9/_-]+$/.test(path))
      throw new TezcheckError("invalid_path");
    const method = options.method ?? "POST",
      raw = body === undefined ? "" : JSON.stringify(body);
    const apiPath = "/api/merchant/v1" + path;
    const digest = createHash("sha256").update(raw).digest("hex");
    const fingerprint = method + apiPath + digest;
    // A signed request is single-use. Identical reads within one second need a fresh timestamp.
    let timestamp = Math.floor(Date.now() / 1000);
    while (this.signatures.get(fingerprint) === timestamp) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 - (Date.now() % 1000) + 5),
      );
      timestamp = Math.floor(Date.now() / 1000);
    }
    this.signatures.set(fingerprint, timestamp);
    if (this.signatures.size > 500)
      for (const [key, time] of this.signatures)
        if (time < timestamp - 300) this.signatures.delete(key);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.TEZCHECK_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-TezCheck-Timestamp": String(timestamp),
      "X-TezCheck-Signature":
        "v1=" +
        createHmac("sha256", this.config.TEZCHECK_API_KEY)
          .update(`${timestamp}.${method}.${apiPath}.${digest}`)
          .digest("hex"),
    };
    const desk = options.desk ?? this.config.TEZCHECK_CASH_DESK_CODE;
    if (desk && path !== "/cash-desks" && path !== "/me")
      headers["X-Cash-Desk-Code"] = desk;
    if (options.key) headers["Idempotency-Key"] = options.key;
    try {
      const response = await this.fetcher(this.base + path, {
        method,
        headers,
        ...(method === "POST" ? { body: raw } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      });
      const value = await response.json();
      if (!response.ok) {
        const code =
          typeof value?.error?.code === "string" &&
          /^[a-z0-9_.-]{1,80}$/.test(value.error.code)
            ? value.error.code
            : "request_failed";
        throw new TezcheckError(code, response.status);
      }
      if (!value || !Object.hasOwn(value, "data"))
        throw new TezcheckError("invalid_response");
      return value;
    } catch (error) {
      if (error instanceof TezcheckError) throw error;
      // Provider error text and response bodies may contain tokens or customer data.
      throw new TezcheckError("network_or_invalid_response");
    }
  }

  async desks() {
    const value = await this.request("/cash-desks", {});
    return z
      .array(
        z.object({
          code: z.string().min(1).max(128),
          currency: z.string(),
          state: z.string(),
          accepts_payments: z.boolean(),
        }),
      )
      .parse(value.data);
  }
  async readyDesk() {
    let desks: Awaited<ReturnType<TezcheckClient["desks"]>>;
    try {
      desks = await this.desks();
    } catch {
      fail(
        "PAYMENT_UNAVAILABLE",
        "To‘lov xizmatiga ulanib bo‘lmadi. Keyinroq qayta urinib ko‘ring.",
        503,
      );
    }
    const selected = this.config.TEZCHECK_CASH_DESK_CODE
      ? desks.find((d) => d.code === this.config.TEZCHECK_CASH_DESK_CODE)
      : desks.length === 1
        ? desks[0]
        : undefined;
    if (!selected)
      fail("PAYMENT_UNAVAILABLE", "Tezcheck kassasi sozlanmagan.", 503);
    if (!selected.accepts_payments || selected.currency !== "UZS")
      fail(
        "PAYMENT_NOT_READY",
        "Tezcheck kassasi to‘lov uchun hali faollashtirilmagan. Keyinroq qayta urinib ko‘ring.",
        503,
      );
    return selected.code;
  }
  async create(
    order: { id: string; amount: bigint; purpose: string },
    desk: string,
  ) {
    if (order.amount > BigInt(Number.MAX_SAFE_INTEGER) || order.amount <= 0n)
      fail(
        "PAYMENT_AMOUNT_LIMIT",
        "To‘lov summasi provayder chegarasidan tashqarida.",
        422,
      );
    const value = await this.request(
      "/bills",
      {
        amount_minor: Number(order.amount),
        title: `Sihhat.uz ${order.purpose === "BOOKING" ? "bron" : "hisob"} ${order.id}`,
        external_reference: order.id,
      },
      { desk, key: `sihhat.bill.${order.id}` },
    );
    return z
      .object({ bill: billSchema, payment_url: z.string().url() })
      .parse(value.data);
  }
  async status(id: string, desk: string): Promise<TezStatus> {
    identifier.parse(id);
    return z
      .object({
        bill: billSchema.extend({
          paid: z.boolean(),
          livemode: z.boolean(),
          environment: z.string().nullable(),
        }),
        payment: paymentSchema.nullable(),
      })
      .parse((await this.request(`/bills/${id}`, {}, { desk })).data);
  }
  async cancel(id: string, desk: string) {
    identifier.parse(id);
    return z
      .object({ cancelled: z.literal(true), bill: billSchema })
      .parse(
        (
          await this.request(
            `/bills/${id}/cancel`,
            { reason: "Sihhat booking payment window ended" },
            { desk, key: `sihhat.cancel.${id}` },
          )
        ).data,
      );
  }
  checkoutUrl(value: string) {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "tezcheck.uz" || url.hostname.endsWith(".tezcheck.uz")
      ) ||
      url.username ||
      url.password ||
      url.port ||
      !url.pathname.startsWith("/pay/")
    )
      throw new TezcheckError("unsafe_checkout_url");
    return url.href;
  }
  verifyWebhook(
    raw: Buffer,
    timestamp: string | undefined,
    delivery: string | undefined,
    signature: string | undefined,
  ) {
    const secret = this.config.TEZCHECK_WEBHOOK_SECRET;
    if (!secret) fail("NOT_FOUND", "Endpoint sozlanmagan.", 404);
    if (
      !timestamp ||
      !/^\d{10}$/.test(timestamp) ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
      !delivery ||
      !/^whd_[A-Za-z0-9_-]{1,120}$/.test(delivery) ||
      raw.length > 262144
    )
      fail("WEBHOOK_INVALID", "Webhook noto‘g‘ri.", 401);
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${delivery}.`)
      .update(raw)
      .digest();
    const valid = (signature ?? "")
      .split(",")
      .slice(0, 4)
      .some((candidate) => {
        const match = /^v1=([a-f0-9]{64})$/.exec(candidate.trim());
        return (
          match !== null &&
          timingSafeEqual(expected, Buffer.from(match[1], "hex"))
        );
      });
    if (!valid) fail("WEBHOOK_INVALID", "Webhook imzosi noto‘g‘ri.", 401);
  }
}

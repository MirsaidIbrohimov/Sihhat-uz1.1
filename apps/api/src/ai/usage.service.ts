import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { Db } from "../common/db";
import { CONFIG, type Config } from "../common/config";
import { parse, fail } from "../common/errors";
import { type Actor, requirePlatform } from "../auth/permissions";

export const usageQuery = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .strict();
const microRate = (rate: string) => {
  const [whole, decimal = ""] = rate.split(".");
  return BigInt(whole) * 1000000n + BigInt(decimal.padEnd(6, "0"));
};
const usd = (micro: bigint) =>
  `${micro / 1000000n}.${(micro % 1000000n).toString().padStart(6, "0")}`;

@Injectable()
export class AiUsageService {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(CONFIG) readonly config: Config,
  ) {}
  async report(actor: Actor, query: unknown) {
    requirePlatform(actor, "platform.reports");
    const q = parse(usageQuery, query);
    if (
      q.to <= q.from ||
      Date.parse(q.to) - Date.parse(q.from) > 366 * 86400000
    )
      fail("DATE_RANGE_INVALID", "Davr 1–366 kun bo‘lsin.", 422);
    const records = await this.db.aiUsage.groupBy({
      by: ["provider", "model", "outcome"],
      where: {
        createdAt: {
          gte: new Date(`${q.from}T00:00:00+05:00`),
          lt: new Date(`${q.to}T00:00:00+05:00`),
        },
      },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
      orderBy: [{ provider: "asc" }, { model: "asc" }, { outcome: "asc" }],
    });
    const priced =
      this.config.AI_INPUT_USD_PER_MILLION !== "" &&
      this.config.AI_OUTPUT_USD_PER_MILLION !== "";
    const groups = records.map((row) => {
      const input = row._sum.inputTokens ?? 0,
        output = row._sum.outputTokens ?? 0;
      const eligible =
        priced &&
        row.provider === "gemini" &&
        row.model === this.config.GEMINI_MODEL &&
        row.outcome === "SUCCESS";
      // These are configurable estimates using current rates, never provider invoices or ledger expenses.
      const cost = eligible
        ? (BigInt(input) * microRate(this.config.AI_INPUT_USD_PER_MILLION) +
            BigInt(output) * microRate(this.config.AI_OUTPUT_USD_PER_MILLION) +
            999999n) /
          1000000n
        : null;
      return {
        provider: row.provider,
        model: row.model,
        outcome: row.outcome,
        requests: row._count._all,
        input_tokens: input,
        output_tokens: output,
        estimated_cost_usd: cost === null ? null : usd(cost),
        token_usage_complete: row.outcome === "SUCCESS",
      };
    });
    return {
      period: { ...q, timezone: "Asia/Tashkent", to_exclusive: true },
      requests: groups.reduce((sum, g) => sum + g.requests, 0),
      input_tokens: groups.reduce((sum, g) => sum + g.input_tokens, 0),
      output_tokens: groups.reduce((sum, g) => sum + g.output_tokens, 0),
      unmetered_requests: groups
        .filter((g) => !g.token_usage_complete)
        .reduce((sum, g) => sum + g.requests, 0),
      pricing_basis: "configured_current_rates",
      pricing_model: priced ? this.config.GEMINI_MODEL : null,
      currency: "USD",
      groups,
    };
  }
}

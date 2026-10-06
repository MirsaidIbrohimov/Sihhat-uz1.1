import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { Db, audit, lock } from "../common/db";
import { fail, parse, uuid } from "../common/errors";
import { type Actor, scope } from "../auth/permissions";

const identifier = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const merchantSetupInput = z
  .object({
    version: z.number().int().nonnegative(),
    legal_name: z.string().trim().min(2).max(150),
    stir: z.string().regex(/^\d{9}$/),
    bank_revision_id: uuid.optional(),
    merchant_id: identifier.optional(),
    cash_desk_code: identifier.optional(),
  })
  .strict();

@Injectable()
export class MerchantSetupService {
  constructor(@Inject(Db) readonly db: Db) {}
  async get(actor: Actor, id: string) {
    parse(uuid, id);
    scope(actor, id, "bank.request");
    if (!(await this.db.sanatorium.findUnique({ where: { id } })))
      fail("NOT_FOUND", "Sanatoriya topilmadi.", 404);
    const setup = await this.db.merchantSetup.findUnique({
      where: { sanatoriumId: id },
    });
    return {
      setup,
      provider: "TEZCHECK",
      settlement_mode: "DIRECT",
      payments_enabled: false,
      message:
        "Sanatoriyaning o‘z yuridik nomidagi merchant hisobi, bank rekviziti va server ulanishi tekshirilgach to‘lov yoqiladi. API kalitini bu shaklga kiritmang.",
    };
  }
  async save(actor: Actor, id: string, body: unknown) {
    parse(uuid, id);
    scope(actor, id, "bank.request");
    const input = parse(merchantSetupInput, body);
    return this.db.atomic(async (tx) => {
      await lock(tx, `settlement:${id}`);
      if (!(await tx.sanatorium.findUnique({ where: { id } })))
        fail("NOT_FOUND", "Sanatoriya topilmadi.", 404);
      const prior = await tx.merchantSetup.findUnique({
        where: { sanatoriumId: id },
      });
      if ((prior?.version ?? 0) !== input.version)
        fail(
          "VERSION_CONFLICT",
          "To‘lov ulanishi o‘zgargan. Sahifani yangilang.",
        );
      if (input.bank_revision_id) {
        const bank = await tx.bankRevision.findFirst({
          where: {
            id: input.bank_revision_id,
            sanatoriumId: id,
            status: "APPROVED",
          },
        });
        if (!bank)
          fail(
            "BANK_NOT_APPROVED",
            "Sanatoriyaning tasdiqlangan bank rekvizitini tanlang.",
            422,
          );
        const data = bank.data as any;
        if (
          data.stir !== input.stir ||
          data.legal_name.trim().toLocaleLowerCase() !==
            input.legal_name.toLocaleLowerCase()
        )
          fail(
            "MERCHANT_OWNER_MISMATCH",
            "Merchant yuridik nomi va STIR bank rekvizitiga mos bo‘lsin.",
            422,
          );
      }
      const data = {
        legalName: input.legal_name,
        stir: input.stir,
        bankRevisionId: input.bank_revision_id ?? null,
        merchantId: input.merchant_id ?? null,
        cashDeskCode: input.cash_desk_code ?? null,
        status:
          input.merchant_id && input.cash_desk_code && input.bank_revision_id
            ? "WAITING_VERIFICATION"
            : "WAITING_MERCHANT",
        settlementMode: "DIRECT",
      };
      const saved = prior
        ? await tx.merchantSetup.update({
            where: { id: prior.id },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.merchantSetup.create({
            data: { sanatoriumId: id, ...data },
          });
      await audit(
        tx,
        actor.id,
        "merchant.setup_saved",
        saved.id,
        id,
        undefined,
        { status: saved.status, settlement_mode: "DIRECT" },
      );
      return { setup: saved, payments_enabled: false };
    });
  }
}

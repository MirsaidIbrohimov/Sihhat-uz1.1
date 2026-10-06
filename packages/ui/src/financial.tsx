"use client";
import { useState } from "react";
import { api, formatMoney } from "@sihhat/api-client";
import {
  Act,
  AddButton,
  Card,
  DataPanel,
  ErrorBox,
  Loading,
  PageHeading,
  Table,
  date,
  dateTime,
  label,
  list,
  moneyColumn,
  options,
  statusColumn,
  uploadAsset,
  useAction,
  usePortal,
  useRemote,
  type Row,
} from "./components";
import { AdvertisementFields, advertisementFields } from "./ad-fields";
export function Finance({ kind }: { kind: "refunds" | "payouts" }) {
  const ctx = usePortal(),
    action = useAction();
  const completed = useRemote(
      kind === "payouts" && ctx.admin
        ? `/superadmin/bookings?sanatorium_id=${ctx.tenant}&status=CHECKED_OUT&limit=100`
        : null,
      ctx.epoch,
    ),
    payments = useRemote(
      kind === "payouts" && ctx.admin
        ? `/superadmin/payments?sanatorium_id=${ctx.tenant}&limit=100`
        : null,
      ctx.epoch,
    );
  function payout() {
    const paid = list(payments.data)
        .filter((p) => p.status === "SUCCEEDED")
        .map((p) => p.bookingId),
      bookings = list(completed.data).filter((b) => paid.includes(b.id));
    ctx.form({
      title: "Sanatoriyaga o‘tkazma tayyorlash",
      description: ctx.tenants.find((s) => s.id === ctx.tenant)?.name,
      fields: [
        {
          key: "booking_ids",
          label: "Yakunlangan va onlayn to‘langan bronlar",
          type: "multi",
          required: true,
          options: bookings.map((b) => ({
            value: b.id,
            label: `${b.reference} · ${b.guest.name} · ${formatMoney(b.amount)}`,
          })),
          hint: "Faqat backend yaroqli deb topgan bronlar rezervlanadi.",
        },
      ],
      submit: (v) =>
        api("/superadmin/payouts", "POST", { sanatorium_id: ctx.tenant, ...v }),
      done: ctx.refresh,
    });
  }
  function verify(r: Row) {
    ctx.form({
      title: "Bank natijasini tasdiqlash",
      description: `${formatMoney(r.amount)} · ${r.bankSnapshot.legal_name} · ${r.bankSnapshot.account}`,
      fields: [
        {
          key: "bank_reference",
          label: "Bank o‘tkazma raqami",
          required: true,
          minLength: 5,
        },
        {
          key: "file",
          label: "Bank dalili",
          type: "file",
          accept: "application/pdf,image/png,image/jpeg",
          required: true,
        },
        {
          key: "verified",
          label: "Bank tekshiruvi",
          type: "checkbox",
          required: true,
          hint: "Bank natijasi va summa tekshirildi.",
        },
      ],
      submit: async (v) => {
        const file = await uploadAsset(v.file, r.sanatoriumId);
        return api(`/superadmin/payouts/${r.id}/verify-bank-result`, "POST", {
          bank_reference: v.bank_reference,
          evidence_asset_id: file.id,
          verified: true,
        });
      },
      done: ctx.refresh,
    });
  }
  return (
    <>
      <PageHeading
        title={
          kind === "refunds"
            ? "Pulni to‘liq qaytarish"
            : "Sanatoriyaga o‘tkazmalar"
        }
        subtitle={
          kind === "refunds"
            ? "Qaytarish provayder callbacki bilan yakunlanadi."
            : "Bank natijasi va dalil fayli tekshirilgach o‘tkazma to‘langan deb belgilanadi."
        }
      >
        {kind === "payouts" && ctx.admin && (
          <AddButton onClick={payout}>O‘tkazma tayyorlash</AddButton>
        )}
      </PageHeading>
      {kind === "refunds" ? (
        <>
          <div className="alert-note">
            Ma’qullangan refundni to‘lov provayderining merchant kabinetida
            boshlang. «Jarayonga olish» tugmasi pul qaytarilganini
            tasdiqlamaydi.
          </div>
          <DataPanel
            path="/superadmin/refunds"
            columns={[
              { label: "So‘ralgan", render: (r) => date(r.createdAt) },
              moneyColumn,
              statusColumn,
              { label: "Sabab", key: "reason" },
              { label: "Qaror", key: "decisionReason" },
            ]}
            actions={(r) => (
              <>
                {r.status === "REQUESTED" && (
                  <>
                    <Act
                      onClick={() =>
                        action(
                          "Refundni ma’qullash",
                          `/superadmin/refunds/${r.id}/approve`,
                          {},
                          [
                            {
                              key: "reason",
                              label: "Qaror sababi",
                              required: true,
                              minLength: 3,
                            },
                          ],
                        )
                      }
                    >
                      Ma’qullash
                    </Act>
                    <Act
                      danger
                      onClick={() =>
                        action(
                          "Refundni rad etish",
                          `/superadmin/refunds/${r.id}/reject`,
                          {},
                          [
                            {
                              key: "reason",
                              label: "Qaror sababi",
                              required: true,
                              minLength: 3,
                            },
                          ],
                        )
                      }
                    >
                      Rad etish
                    </Act>
                  </>
                )}
                {r.status === "APPROVED" && (
                  <Act
                    onClick={() =>
                      action(
                        "Refundni jarayonga olish",
                        `/superadmin/refunds/${r.id}/process`,
                      )
                    }
                  >
                    Jarayonga olish
                  </Act>
                )}
              </>
            )}
          />
        </>
      ) : (
        <DataPanel
          path={ctx.admin ? "/superadmin/payouts" : "/partner/payouts"}
          params={{ sanatorium_id: ctx.tenant }}
          columns={[
            {
              label: "Bank oluvchi",
              render: (r) => (
                <>
                  <strong>{r.bankSnapshot.legal_name}</strong>
                  <span className="subcell">{r.bankSnapshot.account}</span>
                </>
              ),
            },
            moneyColumn,
            statusColumn,
            { label: "Yaratilgan", render: (r) => date(r.createdAt) },
            {
              label: "Bank tasdig‘i",
              render: (r) => r.bankReference ?? "Kutilmoqda",
            },
          ]}
          actions={
            ctx.admin
              ? (r) => (
                  <>
                    {r.status === "DRAFT" && (
                      <Act
                        onClick={() =>
                          action(
                            "O‘tkazmani ma’qullash",
                            `/superadmin/payouts/${r.id}/approve`,
                          )
                        }
                      >
                        Ma’qullash
                      </Act>
                    )}
                    {["APPROVED", "PROCESSING"].includes(r.status) && (
                      <Act onClick={() => verify(r)}>Bank natijasi</Act>
                    )}
                    {["DRAFT", "APPROVED", "PROCESSING"].includes(r.status) && (
                      <Act
                        danger
                        onClick={() =>
                          action(
                            "O‘tkazma bajarilmadi",
                            `/superadmin/payouts/${r.id}/fail`,
                            {},
                            [
                              {
                                key: "reason",
                                label: "Sabab",
                                required: true,
                                minLength: 3,
                              },
                            ],
                          )
                        }
                      >
                        Bekor qilish
                      </Act>
                    )}
                    {r.evidenceAssetId && (
                      <a
                        className="text-button"
                        href={`/api/media/${r.evidenceAssetId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Dalil
                      </a>
                    )}
                  </>
                )
              : undefined
          }
        />
      )}
    </>
  );
}
export function Billing({ kind }: { kind: "billing" | "ads" }) {
  const ctx = usePortal(),
    action = useAction(),
    [tab, setTab] = useState("invoices"),
    [checkout, setCheckout] = useState<Row | null>(null);
  const plans = useRemote(
      kind === "billing" && ctx.admin ? "/superadmin/subscription-plans" : null,
      ctx.epoch,
    ),
    profile = useRemote(
      kind === "ads" ? `/partner/sanatoriums/${ctx.tenant}` : null,
      ctx.epoch,
    );
  function payInvoice(r: Row) {
    let result: any;
    ctx.form({
      title: "Hisobni to‘lash",
      description: `${formatMoney(r.amount)} · ${label[r.purpose]}`,
      fields: [],
      button: "To‘lovni ochish",
      submit: async () => {
        result = await api(`/partner/invoices/${r.id}/checkout`, "POST", {});
      },
      done: () => setCheckout(result),
    });
  }
  function requestAd() {
    const revision = profile.data?.revisions?.find(
      (r: Row) => r.id === profile.data.publicRevisionId,
    );
    const photos = revision?.data?.photo_ids ?? [];
    const uploaded = new Map<File, string>();
    ctx.form({
      title: "Reklama joylash",
      description:
        "Rasm va taklifni kiriting. Admin tasdiqlagach ilovada bepul chiqadi.",
      fields: advertisementFields,
      content: (
        <AdvertisementFields
          tenant={ctx.tenant}
          tenants={ctx.tenants}
          photos={photos}
        />
      ),
      button: "Tasdiqlashga yuborish",
      submit: async (values) => {
        const { photo_file, ...input } = values;
        let image = input.image_asset_id;
        if (photo_file instanceof File) {
          image = uploaded.get(photo_file);
          if (!image) {
            const result = await uploadAsset(
              photo_file,
              ctx.tenant,
              undefined,
              "PUBLIC",
            );
            image = result.id;
            uploaded.set(photo_file, image);
          }
        }
        if (!image)
          throw new Error(
            "Reklama rasmini yuklang yoki profil rasmini tanlang.",
          );
        return api("/partner/ad-campaigns", "POST", {
          sanatorium_id: ctx.tenant,
          ...input,
          image_asset_id: image,
        });
      },
      done: ctx.refresh,
    });
  }
  return (
    <>
      <PageHeading
        title={kind === "ads" ? "Reklama kampaniyalari" : "Abonent va hisoblar"}
        subtitle={
          kind === "ads"
            ? "Admin tasdiqlagan reklamalar belgilangan muddatda ilovada bepul chiqadi."
            : "Bron uchun komissiya olinmaydi. Platforma xizmatlari alohida hisob bilan to‘lanadi."
        }
      >
        {kind === "ads" && ctx.allowed("ads.request") && (
          <AddButton onClick={requestAd}>Reklama so‘rash</AddButton>
        )}
        {kind === "billing" && ctx.admin && tab === "plans" && (
          <AddButton
            onClick={() =>
              action(
                "Abonent tarifi yaratish",
                "/superadmin/subscription-plans",
                {},
                [
                  { key: "name", label: "Tarif nomi", required: true },
                  {
                    key: "amount",
                    label: "Narx (so‘m)",
                    type: "money",
                    required: true,
                  },
                  {
                    key: "period_days",
                    label: "Davr (kun)",
                    type: "number",
                    required: true,
                    min: 1,
                    max: 366,
                    value: 30,
                  },
                  {
                    key: "grace_days",
                    label: "Imtiyozli muddat (kun)",
                    type: "number",
                    required: true,
                    min: 0,
                    max: 30,
                    value: 3,
                  },
                  {
                    key: "features",
                    label: "Xizmatlar",
                    type: "string-list",
                    required: true,
                  },
                ],
              )
            }
          >
            Tarif yaratish
          </AddButton>
        )}
        {kind === "billing" && ctx.admin && tab === "subscriptions" && (
          <AddButton
            onClick={() =>
              action("Abonent biriktirish", "/superadmin/subscriptions", {}, [
                {
                  key: "sanatorium_id",
                  label: "Sanatoriya",
                  type: "select",
                  required: true,
                  value: ctx.tenant,
                  options: options(ctx.tenants),
                },
                {
                  key: "plan_id",
                  label: "Tarif",
                  type: "select",
                  required: true,
                  options: options(list(plans.data)),
                },
                {
                  key: "trial_days",
                  label: "Sinov muddati (kun)",
                  type: "number",
                  min: 0,
                  max: 30,
                  value: 0,
                },
              ])
            }
          >
            Abonent biriktirish
          </AddButton>
        )}
      </PageHeading>
      {checkout && (
        <div className="alert-note">
          <strong>To‘lov: {formatMoney(checkout.amount)}</strong>
          {checkout.mode === "local" ? (
            <>
              <p>Mahalliy sinov adapteri. Bu tugma haqiqiy pul o‘tkazmaydi.</p>
              <button
                className="button secondary"
                onClick={() =>
                  api(
                    `/payments/${checkout.order_id}/local-confirm`,
                    "POST",
                    {},
                  )
                    .then(() => {
                      setCheckout(null);
                      ctx.refresh();
                      ctx.notice("Mahalliy sinov to‘lovi tasdiqlandi");
                    })
                    .catch((e) => ctx.notice(e.message))
                }
              >
                Sinov to‘lovini tasdiqlash
              </button>
            </>
          ) : (
            <>
              <p>To‘lov holati provayder tasdig‘idan keyin yangilanadi.</p>
              <a
                className="button primary"
                href={checkout.checkout_url}
                target="_blank"
                rel="noreferrer"
              >
                Provayderga o‘tish
              </a>
              <button
                className="button secondary"
                onClick={() => {
                  ctx.refresh();
                  setCheckout(null);
                }}
              >
                Holatni yangilash
              </button>
            </>
          )}
        </div>
      )}
      {kind === "billing" && ctx.admin && (
        <div className="tabs">
          {[
            ["invoices", "Hisoblar"],
            ["plans", "Abonent tariflari"],
            ["subscriptions", "Abonentlar"],
            ["policies", "Refund shartlari"],
          ].map(([key, title]) => (
            <button
              className={`tab ${tab === key ? "active" : ""}`}
              key={key}
              onClick={() => setTab(key)}
            >
              {title}
            </button>
          ))}
        </div>
      )}
      {kind === "ads" ? (
        <DataPanel
          path={
            ctx.admin ? "/superadmin/ad-campaigns" : "/partner/ad-campaigns"
          }
          paged={false}
          filter={(r) => r.sanatoriumId === ctx.tenant}
          columns={[
            { label: "Kampaniya", key: "title" },
            {
              label: "Ilovadagi holati",
              render: (r) =>
                (
                  ({
                    WAITING_APPROVAL: "Admin tasdig‘i kutilmoqda",
                    REJECTED: "Rad etilgan",
                    ARCHIVED: "To‘xtatilgan",
                    WAITING_FREE_PUBLICATION: "Bepul joylashni bosing",
                    SCHEDULED: "Boshlanish sanasi kutilmoqda",
                    EXPIRED: "Muddati tugagan",
                    SANATORIUM_HIDDEN: "Sanatoriya ochiq emas",
                    LIVE: "Ilovada chiqmoqda",
                  }) as Record<string, string>
                )[r.publication_status] ?? r.publication_status,
            },
            {
              label: "Joylashuv",
              render: (r) =>
                r.placement === "POPUP"
                  ? "Kirishda qalqib chiqadi"
                  : "Bosh sahifa",
            },
            {
              label: "Davr",
              render: (r) => `${dateTime(r.startsAt)} — ${dateTime(r.endsAt)}`,
            },
            {
              label: "Ochadigan joy",
              render: (r) =>
                r.data?.target_kind === "URL" ? (
                  <a href={r.data.target_url} target="_blank" rel="noreferrer">
                    Havola
                  </a>
                ) : (
                  "Sanatoriya"
                ),
            },
            {
              label: "Chegirma",
              render: (r) =>
                r.data?.has_discount ? (
                  <span className="ad-discount">
                    {r.data.discount_percent
                      ? `${r.data.discount_percent}%`
                      : r.data.discount_text}
                  </span>
                ) : (
                  "Yo‘q"
                ),
            },
          ]}
          actions={
            ctx.admin
              ? (r) =>
                  ((r.status === "PENDING" ||
                    r.publication_status === "WAITING_FREE_PUBLICATION") && (
                    <>
                      <Act
                        onClick={() =>
                          action(
                            "Reklamani bepul joylash",
                            `/superadmin/ad-campaigns/${r.id}/approve`,
                            {},
                            [],
                          )
                        }
                      >
                        Ma’qullash
                      </Act>
                      {r.status === "PENDING" && (
                        <Act
                          danger
                          onClick={() =>
                            action(
                              "Reklamani rad etish",
                              `/superadmin/ad-campaigns/${r.id}/reject`,
                              {},
                              [
                                {
                                  key: "reason",
                                  label: "Sabab",
                                  required: true,
                                  minLength: 3,
                                },
                              ],
                            )
                          }
                        >
                          Rad etish
                        </Act>
                      )}
                    </>
                  )) ||
                  (r.status === "APPROVED" &&
                    r.publication_status !== "EXPIRED" && (
                      <Act
                        danger
                        onClick={() =>
                          action(
                            "Reklamani to‘xtatish",
                            `/partner/ad-campaigns/${r.id}/archive`,
                          )
                        }
                      >
                        To‘xtatish
                      </Act>
                    ))
              : (r) =>
                  r.status === "APPROVED" &&
                  r.publication_status !== "EXPIRED" && (
                    <Act
                      danger
                      onClick={() =>
                        action(
                          "Reklamani to‘xtatish",
                          `/partner/ad-campaigns/${r.id}/archive`,
                        )
                      }
                    >
                      To‘xtatish
                    </Act>
                  )
          }
        />
      ) : tab === "invoices" ? (
        <DataPanel
          path={ctx.admin ? "/superadmin/invoices" : "/partner/invoices"}
          params={{ sanatorium_id: ctx.tenant }}
          columns={[
            { label: "Xizmat", render: (r) => label[r.purpose] },
            {
              label: "Davr",
              render: (r) => `${date(r.startsAt)} — ${date(r.endsAt)}`,
            },
            moneyColumn,
            statusColumn,
          ]}
          actions={
            ctx.allowed("invoices.pay")
              ? (r) =>
                  r.status === "UNPAID" && (
                    <Act onClick={() => payInvoice(r)}>To‘lash</Act>
                  )
              : undefined
          }
        />
      ) : tab === "plans" ? (
        <DataPanel
          path="/superadmin/subscription-plans"
          paged={false}
          columns={[
            { label: "Tarif", key: "name" },
            moneyColumn,
            { label: "Davr (kun)", key: "periodDays" },
            { label: "Imtiyozli kunlar", key: "graceDays" },
            { label: "Xizmatlar", render: (r) => r.features.join(", ") },
          ]}
        />
      ) : tab === "subscriptions" ? (
        <DataPanel
          path="/superadmin/subscriptions"
          paged={false}
          columns={[
            {
              label: "Sanatoriya",
              render: (r) =>
                ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name,
            },
            {
              label: "Tarif",
              render: (r) =>
                list(plans.data).find((p) => p.id === r.planId)?.name,
            },
            statusColumn,
            { label: "Tugash", render: (r) => date(r.endsAt) },
          ]}
          actions={(r) => (
            <Act
              onClick={() =>
                action(
                  "Keyingi davr hisobini yaratish",
                  `/superadmin/subscriptions/${r.id}/invoice`,
                )
              }
            >
              Yangi hisob
            </Act>
          )}
        />
      ) : (
        <>
          <div className="alert-note">
            Bron yaratilganda qaytarish sharti o‘sha versiyasi bilan saqlanadi.
            Yangi shart avvalgi bron shartini o‘zgartirmaydi.
          </div>
          <AddButton
            onClick={() =>
              action(
                "Qaytarish sharti yaratish",
                "/superadmin/refund-policies",
                {},
                [
                  { key: "name", label: "Shart nomi", required: true },
                  {
                    key: "kind",
                    label: "Qaytarish usuli",
                    type: "select",
                    required: true,
                    options: [
                      {
                        value: "FULL_BEFORE_CUTOFF",
                        label: "Muddatgacha to‘liq qaytarish",
                      },
                      { value: "NON_REFUNDABLE", label: "Qaytarilmaydi" },
                    ],
                  },
                  {
                    key: "cutoff_hours",
                    label: "Kelishdan oldingi muddat (soat)",
                    type: "number",
                    required: true,
                    min: 0,
                    max: 720,
                    value: 24,
                  },
                ],
              )
            }
          >
            Yangi shart
          </AddButton>
        </>
      )}
    </>
  );
}

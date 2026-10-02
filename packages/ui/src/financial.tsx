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
      ctx.admin ? "/superadmin/subscription-plans" : null,
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
      ),
      photos = revision?.data?.photo_ids ?? [];
    action(
      "Reklama so‘rovi",
      "/partner/ad-campaigns",
      { sanatorium_id: ctx.tenant },
      [
        { key: "title", label: "Sarlavha", required: true },
        {
          key: "placement",
          label: "Joylashuv",
          type: "select",
          required: true,
          options: [
            { value: "HOME", label: "Bosh sahifa" },
            { value: "SEARCH", label: "Qidiruv" },
          ],
        },
        {
          key: "starts_at",
          label: "Boshlanish",
          type: "datetime-local",
          required: true,
        },
        {
          key: "ends_at",
          label: "Tugash",
          type: "datetime-local",
          required: true,
        },
        {
          key: "image_asset_id",
          label: "Tasdiqlangan profil rasmi",
          type: "select",
          required: true,
          options: photos.map((id: string, n: number) => ({
            value: id,
            label: `Rasm ${n + 1}`,
          })),
        },
        { key: "text", label: "Reklama matni", type: "textarea" },
      ],
    );
  }
  return (
    <>
      <PageHeading
        title={kind === "ads" ? "Reklama kampaniyalari" : "Abonent va hisoblar"}
        subtitle={
          kind === "ads"
            ? "Reklama narxi admin ma’qullaganda belgilanadi; ko‘rinish uchun to‘lov talab qilinadi."
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
                    type: "csv",
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
              label: "Joylashuv",
              render: (r) =>
                r.placement === "HOME" ? "Bosh sahifa" : "Qidiruv",
            },
            {
              label: "Davr",
              render: (r) => `${date(r.startsAt)} — ${date(r.endsAt)}`,
            },
            moneyColumn,
            statusColumn,
          ]}
          actions={
            ctx.admin
              ? (r) =>
                  r.status === "PENDING" && (
                    <>
                      <Act
                        onClick={() =>
                          action(
                            "Reklama narxini belgilash",
                            `/superadmin/ad-campaigns/${r.id}/approve`,
                            {},
                            [
                              {
                                key: "amount",
                                label: "Davr narxi (so‘m)",
                                type: "money",
                                required: true,
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
                    </>
                  )
              : undefined
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

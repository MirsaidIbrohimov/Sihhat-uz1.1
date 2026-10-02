"use client";
import { useState } from "react";
import { api, toMinor } from "@sihhat/api-client";
import {
  Act,
  AddButton,
  Badge,
  Card,
  DataPanel,
  Empty,
  ErrorBox,
  Loading,
  PageHeading,
  Table,
  date,
  list,
  options,
  statusColumn,
  uploadAsset,
  useAction,
  usePortal,
  useRemote,
  type Field,
  type Row,
} from "./components";
export function Communications({
  kind,
}: {
  kind: "messages" | "tasks" | "surveys";
}) {
  const ctx = usePortal(),
    action = useAction(),
    staff = useRemote(
      ctx.admin || ctx.allowed("staff.invite")
        ? "/partner/staff?limit=100"
        : null,
      ctx.epoch,
    );
  const people = list(staff.data).filter(
      (r) =>
        r.status === "ACTIVE" && (ctx.admin || r.sanatoriumId === ctx.tenant),
    ),
    recipients = people.map((r) => ({
      value: r.userId,
      label: `${r.user?.name} · ${r.role === "DIRECTOR" ? "Direktor" : "Resepshn"}`,
    }));
  function create() {
    if (kind === "messages")
      action(
        ctx.admin ? "E’lon yuborish" : "Xabar yuborish",
        ctx.admin ? "/superadmin/announcements" : "/messages",
        {},
        [
          { key: "title", label: "Sarlavha", required: true },
          { key: "body", label: "Xabar", type: "textarea", required: true },
          {
            key: "kind",
            label: "Turi",
            type: "select",
            required: true,
            value: "MESSAGE",
            options: [
              { value: "MESSAGE", label: "Xabar" },
              { value: "WARNING", label: "Ogohlantirish" },
            ],
          },
          ctx.admin
            ? {
                key: "sanatorium_ids",
                label: "Sanatoriyalar",
                type: "multi",
                options: options(ctx.tenants),
                hint: "Bo‘sh qoldirilsa barcha faol hamkorlarga yuboriladi.",
              }
            : {
                key: "recipient_ids",
                label: "Qabul qiluvchilar",
                type: "multi",
                required: true,
                options: recipients,
              },
        ],
      );
    if (kind === "tasks")
      action("Vazifa berish", "/tasks", { sanatorium_id: ctx.tenant }, [
        { key: "title", label: "Vazifa nomi", required: true },
        { key: "body", label: "Tavsif", type: "textarea", required: true },
        {
          key: "assigned_to",
          label: "Xodim",
          type: "select",
          required: true,
          options: recipients,
        },
        {
          key: "due_at",
          label: "Bajarish muddati",
          type: "datetime-local",
          required: true,
        },
      ]);
    if (kind === "surveys") {
      let count = 1;
      ctx.form({
        title: "Anketa — savollar soni",
        fields: [
          {
            key: "count",
            label: "Savollar soni",
            type: "number",
            required: true,
            min: 1,
            max: 30,
            value: 3,
          },
        ],
        submit: async (v) => {
          count = v.count;
        },
        done: () =>
          ctx.form({
            title: "Anketa yaratish",
            fields: [
              { key: "title", label: "Anketa nomi", required: true },
              {
                key: "recipient_ids",
                label: "Qabul qiluvchilar",
                type: "multi",
                required: true,
                options: recipients,
              },
              ...Array.from({ length: count }, (_, n): Field[] => [
                {
                  key: `question_${n}`,
                  label: `${n + 1}-savol`,
                  required: true,
                },
                {
                  key: `type_${n}`,
                  label: `${n + 1}-javob turi`,
                  type: "select",
                  required: true,
                  value: "TEXT",
                  options: [
                    { value: "TEXT", label: "Matn" },
                    { value: "BOOLEAN", label: "Ha / yo‘q" },
                    { value: "NUMBER", label: "Son" },
                  ],
                },
                {
                  key: `required_${n}`,
                  label: `${n + 1}-savol majburiy`,
                  type: "checkbox",
                  value: true,
                },
              ]).flat(),
            ],
            submit: (v) =>
              api("/superadmin/surveys", "POST", {
                title: v.title,
                recipient_ids: v.recipient_ids,
                questions: Array.from({ length: count }, (_, n) => ({
                  id: `question_${String.fromCharCode(97 + Math.floor(n / 26))}${String.fromCharCode(97 + (n % 26))}`,
                  label: v[`question_${n}`],
                  type: v[`type_${n}`],
                  required: v[`required_${n}`],
                })),
              }),
            done: ctx.refresh,
          }),
      });
    }
  }
  function answer(r: Row) {
    ctx.form({
      title: r.title,
      fields: r.questions.map((q: Row) => ({
        key: q.id,
        label: q.label,
        type:
          q.type === "BOOLEAN"
            ? "select"
            : q.type === "NUMBER"
              ? "number"
              : "textarea",
        required: q.required,
        ...(q.type === "BOOLEAN"
          ? {
              options: [
                { value: "true", label: "Ha" },
                { value: "false", label: "Yo‘q" },
              ],
            }
          : {}),
      })),
      submit: (v) => {
        for (const q of r.questions)
          if (q.type === "BOOLEAN" && v[q.id] !== undefined)
            v[q.id] = v[q.id] === "true";
        return api(`/surveys/${r.id}/responses`, "POST", {
          version: r.version,
          answers: v,
        });
      },
      done: ctx.refresh,
    });
  }
  return (
    <>
      <PageHeading
        title={
          kind === "messages"
            ? "Xabarlar"
            : kind === "tasks"
              ? "Jamoa vazifalari"
              : "Anketalar"
        }
        subtitle={
          kind === "messages"
            ? "Xabarlar faqat tegishli qabul qiluvchilarga ko‘rinadi."
            : kind === "tasks"
              ? "Vazifani qabul qilish va bajarish holati tarixda qayd etiladi."
              : "Har bir anketa versiyasiga alohida javob saqlanadi."
        }
      >
        {(ctx.admin ||
          (kind === "messages"
            ? ctx.allowed("messages.send")
            : kind === "tasks"
              ? ctx.allowed("tasks.manage")
              : false)) && (
          <AddButton onClick={create}>
            {kind === "messages"
              ? "Yuborish"
              : kind === "tasks"
                ? "Vazifa berish"
                : "Anketa yaratish"}
          </AddButton>
        )}
      </PageHeading>
      {kind === "messages" ? (
        <DataPanel
          path="/messages"
          columns={[
            {
              label: "Xabar",
              render: (r) => (
                <>
                  <strong>{r.message?.title}</strong>
                  <p className="section-text">{r.message?.body}</p>
                  {r.message?.assetIds?.map((id: string, n: number) => (
                    <a
                      key={id}
                      href={`/api/media/${id}`}
                      className="text-button"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Fayl {n + 1}
                    </a>
                  ))}
                </>
              ),
            },
            {
              label: "Turi",
              render: (r) =>
                r.message?.kind === "WARNING" ? "Ogohlantirish" : "Xabar",
            },
            {
              label: "Ko‘rilgan",
              render: (r) => (r.readAt ? date(r.readAt) : "Yangi"),
            },
            {
              label: "Qabul qilingan",
              render: (r) => (r.acceptedAt ? date(r.acceptedAt) : "Kutilmoqda"),
            },
          ]}
          actions={(r) =>
            !r.acceptedAt && (
              <Act
                onClick={() =>
                  action(
                    "Xabarni qabul qilish",
                    `/messages/${r.messageId}/receipt`,
                    { accepted: true },
                  )
                }
              >
                Qabul qildim
              </Act>
            )
          }
        />
      ) : kind === "tasks" ? (
        <DataPanel
          path="/tasks"
          paged={false}
          filter={(r) => r.sanatoriumId === ctx.tenant}
          columns={[
            {
              label: "Vazifa",
              render: (r) => (
                <>
                  <strong>{r.title}</strong>
                  <p className="section-text">{r.body}</p>
                  {r.reply && <span className="subcell">Javob: {r.reply}</span>}
                </>
              ),
            },
            {
              label: "Xodim",
              render: (r) =>
                people.find((p) => p.userId === r.assignedTo)?.user?.name ??
                (r.assignedTo === ctx.actor.id ? "Siz" : "Xodim"),
            },
            { label: "Muddat", render: (r) => date(r.dueAt) },
            statusColumn,
          ]}
          actions={(r) =>
            (r.assignedTo === ctx.actor.id || ctx.admin) && (
              <>
                {r.status === "ASSIGNED" && (
                  <Act
                    onClick={() =>
                      action(
                        "Vazifani qabul qilish",
                        `/tasks/${r.id}`,
                        { version: r.version, status: "ACCEPTED" },
                        [],
                        "PATCH",
                      )
                    }
                  >
                    Qabul qilish
                  </Act>
                )}
                {r.status === "ACCEPTED" && (
                  <Act
                    onClick={() =>
                      action(
                        "Vazifani yakunlash",
                        `/tasks/${r.id}`,
                        { version: r.version, status: "COMPLETED" },
                        [{ key: "reply", label: "Natija", type: "textarea" }],
                        "PATCH",
                      )
                    }
                  >
                    Bajarildi
                  </Act>
                )}
              </>
            )
          }
        />
      ) : (
        <DataPanel
          path="/surveys"
          paged={false}
          columns={[
            { label: "Anketa", key: "title" },
            { label: "Versiya", key: "version" },
            { label: "Savollar", render: (r) => r.questions.length },
            { label: "Yaratilgan", render: (r) => date(r.createdAt) },
          ]}
          actions={(r) =>
            r.recipientIds.includes(ctx.actor.id) ? (
              <Act onClick={() => answer(r)}>Javob berish</Act>
            ) : (
              <span className="muted">Yuborilgan</span>
            )
          }
        />
      )}
    </>
  );
}
export function Reviews() {
  const ctx = usePortal(),
    action = useAction();
  return (
    <>
      <PageHeading
        title="Mehmonlar sharhlari"
        subtitle="Sharh faqat yakunlangan yashashdan keyin yoziladi."
      />
      <DataPanel
        path="/partner/reviews"
        params={{ sanatorium_id: ctx.tenant }}
        columns={[
          { label: "Baho", render: (r) => `${r.rating} / 5` },
          {
            label: "Sharh",
            render: (r) => (
              <>
                {r.text}
                {r.reply && <p className="subcell">Javob: {r.reply}</p>}
              </>
            ),
          },
          statusColumn,
          { label: "Yozilgan", render: (r) => date(r.createdAt) },
        ]}
        actions={(r) => (
          <>
            <Act
              onClick={() =>
                action("Sharhga javob", `/partner/reviews/${r.id}/reply`, {}, [
                  {
                    key: "reply",
                    label: "Javob",
                    type: "textarea",
                    required: true,
                    minLength: 3,
                    value: r.reply,
                  },
                ])
              }
            >
              Javob yozish
            </Act>
            {ctx.admin && (
              <Act
                danger={r.status === "PUBLISHED"}
                onClick={() =>
                  action(
                    r.status === "PUBLISHED"
                      ? "Sharhni yashirish"
                      : "Sharhni qayta ko‘rsatish",
                    `/superadmin/reviews/${r.id}/moderate`,
                    {
                      status: r.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED",
                    },
                    [
                      {
                        key: "reason",
                        label: "Moderatsiya sababi",
                        required: true,
                        minLength: 3,
                      },
                    ],
                  )
                }
              >
                {r.status === "PUBLISHED" ? "Yashirish" : "Ko‘rsatish"}
              </Act>
            )}
          </>
        )}
      />
    </>
  );
}
export function Support() {
  const ctx = usePortal(),
    action = useAction(),
    [id, setId] = useState<string | null>(null),
    detail = useRemote(id ? `/support/tickets/${id}` : null, ctx.epoch),
    t = detail.data;
  return (
    <>
      <PageHeading
        title={t?.title ?? "Yordam xizmati"}
        subtitle="Bron va platforma bo‘yicha murojaatlar."
      >
        <AddButton
          onClick={() =>
            action(
              "Yangi murojaat",
              "/support/tickets",
              { sanatorium_id: ctx.tenant },
              [
                { key: "title", label: "Mavzu", required: true },
                {
                  key: "text",
                  label: "Murojaat matni",
                  type: "textarea",
                  required: true,
                  minLength: 3,
                },
              ],
            )
          }
        >
          Murojaat yaratish
        </AddButton>
      </PageHeading>
      {id ? (
        <>
          <button className="button secondary" onClick={() => setId(null)}>
            ← Murojaatlarga qaytish
          </button>
          {detail.loading ? (
            <Loading />
          ) : detail.error ? (
            <ErrorBox message={detail.error} />
          ) : (
            t && (
              <Card title="Suhbat" aside={<Badge value={t.status} />}>
                <div className="message-list">
                  {t.messages.map((m: Row) => (
                    <div className="message" key={m.id}>
                      <strong>
                        {m.userId === ctx.actor.id ? "Siz" : "Suhbatdosh"}
                      </strong>
                      <p className="message-body">{m.text}</p>
                      <div className="message-meta">{date(m.createdAt)}</div>
                    </div>
                  ))}
                  <Act
                    onClick={() =>
                      action(
                        "Murojaatga javob",
                        `/support/tickets/${id}/messages`,
                        {},
                        [
                          {
                            key: "text",
                            label: "Javob",
                            type: "textarea",
                            required: true,
                          },
                          ...(ctx.admin
                            ? [
                                {
                                  key: "close",
                                  label: "Murojaatni yopish",
                                  type: "checkbox" as const,
                                },
                              ]
                            : []),
                        ],
                      )
                    }
                  >
                    Javob yozish
                  </Act>
                </div>
              </Card>
            )
          )}
        </>
      ) : (
        <DataPanel
          path="/support/tickets"
          paged={false}
          columns={[
            { label: "Mavzu", key: "title" },
            statusColumn,
            { label: "Yaratilgan", render: (r) => date(r.createdAt) },
          ]}
          actions={(r) => <Act onClick={() => setId(r.id)}>Ochish</Act>}
        />
      )}
    </>
  );
}
const auditLabels: Record<string, string> = {
  "auth.bootstrap": "Admin hisobi yaratildi",
  "auth.staff_login": "Xodim kirdi",
  "staff.invited": "Xodim taklif qilindi",
  "staff.approved": "Xodim tasdiqlandi",
  "staff.permissions_updated": "Xodim ruxsatlari yangilandi",
  "sanatorium.created": "Sanatoriya yaratildi",
  "sanatorium.approved": "Profil tasdiqlandi",
  "sanatorium.draft_saved": "Profil saqlandi",
  "booking.hold_created": "Xona vaqtincha band qilindi",
  "booking.manual_created": "Qo‘lda bron yaratildi",
  "booking.checked_in": "Mehmon joylashtirildi",
  "booking.checked_out": "Yashash yakunlandi",
  "payment.performed": "To‘lov tasdiqlandi",
  "refund.requested": "Refund so‘raldi",
  "payout.bank_verified": "Bank o‘tkazmasi tekshirildi",
};
export function Audit() {
  const ctx = usePortal();
  return (
    <>
      <PageHeading
        title="Amallar tarixi"
        subtitle="Muhim o‘zgarishlar o‘chirilmaydigan audit yozuvlarida saqlanadi."
      />
      <DataPanel
        path="/superadmin/audit"
        columns={[
          { label: "Vaqt", render: (r) => date(r.createdAt) },
          {
            label: "Amal",
            render: (r) =>
              auditLabels[r.action] ?? r.action.replace(/[._]/g, " "),
          },
          {
            label: "Sanatoriya",
            render: (r) =>
              ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name ??
              "Platforma",
          },
          {
            label: "Manba",
            render: (r) => (r.actorId ? "Xodim" : "Provayder / tizim"),
          },
        ]}
      />
    </>
  );
}
export function Reconciliation() {
  const ctx = usePortal();
  function load() {
    ctx.form({
      title: "Provayder / bank reestrini yuklash",
      description:
        "CSV ustunlari: provider_id,order_id,amount,state,bank_reference,fee. Summalar so‘mda. 5000 satrgacha.",
      fields: [
        {
          key: "kind",
          label: "Reestr turi",
          type: "select",
          required: true,
          value: "PROVIDER",
          options: [
            { value: "PROVIDER", label: "To‘lov provayderi" },
            { value: "BANK", label: "Bank" },
          ],
        },
        {
          key: "register",
          label: "CSV reestr",
          type: "file",
          required: true,
          accept: ".csv,text/csv",
        },
        {
          key: "evidence",
          label: "Bank dalili (bank reestri uchun)",
          type: "file",
          accept: "application/pdf,image/png,image/jpeg",
        },
      ],
      submit: async (v) => {
        const text = await (v.register as File).text();
        const lines = text
            .replace(/^\uFEFF/, "")
            .trim()
            .split(/\r?\n/),
          headers = lines
            .shift()!
            .split(",")
            .map((s) => s.trim());
        const rows = lines.map((line) => {
          const values = line.split(",").map((s) => s.trim());
          const row = Object.fromEntries(headers.map((h, n) => [h, values[n]]));
          return {
            provider_id: row.provider_id,
            order_id: row.order_id,
            amount: toMinor(row.amount),
            state: Number(row.state),
            ...(row.bank_reference
              ? { bank_reference: row.bank_reference }
              : {}),
            fee: toMinor(row.fee || "0"),
          };
        });
        if (!rows.length || rows.length > 5000)
          throw new Error("Reestr 1–5000 satrdan iborat bo‘lsin.");
        let evidence;
        if (v.evidence) evidence = await uploadAsset(v.evidence, ctx.tenant);
        return api("/superadmin/reconciliation/imports", "POST", {
          kind: v.kind,
          rows,
          ...(evidence ? { evidence_asset_id: evidence.id } : {}),
        });
      },
      done: ctx.refresh,
    });
  }
  return (
    <>
      <PageHeading
        title="To‘lovlarni solishtirish"
        subtitle="Mos kelmagan summa yoki holat farq sifatida qayd etiladi."
      >
        <AddButton onClick={load}>Reestr import qilish</AddButton>
      </PageHeading>
      <DataPanel
        path="/superadmin/reconciliation/differences"
        paged={false}
        columns={[
          {
            label: "Natija",
            render: (r) => "Summa, holat yoki to‘lov mos kelmagan",
          },
          { label: "Reestr summasi (tiyin)", render: (r) => r.data.amount },
          { label: "Provayder holati", render: (r) => r.data.state },
          { label: "Aniqlangan", render: (r) => date(r.createdAt) },
        ]}
      />
    </>
  );
}
export function Notifications() {
  const action = useAction();
  const topics: Record<string, string> = {
    "message.created": "Yangi xabar",
    "task.assigned": "Yangi vazifa",
    "survey.created": "Yangi anketa",
    "booking.created": "Yangi bron",
    "sanatorium.moderated": "Profil tekshirildi",
    "staff.invited": "Yangi xodim taklifi",
    "refund.succeeded": "Pul qaytarildi",
  };
  return (
    <>
      <PageHeading
        title="Bildirishnomalar"
        subtitle="Sizga tegishli platforma hodisalari."
      />
      <DataPanel
        path="/notifications"
        paged={false}
        columns={[
          {
            label: "Hodisa",
            render: (r) => topics[r.payload?.topic] ?? "Platforma yangilanishi",
          },
          { label: "Holat", render: (r) => (r.readAt ? "O‘qilgan" : "Yangi") },
        ]}
        actions={(r) =>
          !r.readAt && (
            <Act
              onClick={() =>
                action("Bildirishnomani o‘qish", `/notifications/${r.id}/read`)
              }
            >
              O‘qilgan
            </Act>
          )
        }
      />
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  FileText,
  Mail,
  Star,
} from "lucide-react";
import { api, toMinor } from "@sihhat/api-client";
import {
  label,
  Act,
  AddButton,
  Badge,
  Card,
  DataPanel,
  Empty,
  ErrorBox,
  FeedItem,
  Loading,
  PageHeading,
  Table,
  date,
  dateTime,
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
    [selectedSurvey, setSelectedSurvey] = useState<Row | null>(null),
    staff = useRemote(
      ctx.tenant && (ctx.admin || ctx.allowed("staff.invite"))
        ? `/partner/staff?limit=100&sanatorium_id=${ctx.tenant}`
        : null,
      ctx.epoch,
    );
  const people = list(staff.data).filter(
      (r) => r.status === "ACTIVE" && r.sanatoriumId === ctx.tenant,
    ),
    recipients = people.map((r) => ({
      value: r.userId,
      label: `${r.user?.name} · ${label[r.role] ?? r.role}`,
    }));
  useEffect(() => setSelectedSurvey(null), [kind, ctx.tenant, ctx.epoch]);
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
                type: "checks",
                options: options(ctx.tenants),
                hint: "Bo‘sh qoldirilsa barcha faol hamkorlarga yuboriladi.",
              }
            : {
                key: "recipient_ids",
                label: "Qabul qiluvchilar",
                type: "checks",
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
                key: "sanatorium_ids",
                label: "Anketa yuboriladigan sanatoriyalar",
                type: "checks",
                required: true,
                options: options(ctx.tenants),
                hint: "Faqat belgilangan sanatoriyalarning faol xodimlariga yuboriladi.",
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
                sanatorium_ids: v.sanatorium_ids,
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
              ? "Xabar yuborish"
              : kind === "tasks"
                ? "Vazifa berish"
                : "Anketa yaratish"}
          </AddButton>
        )}
      </PageHeading>
      {kind === "messages" ? (
        <DataPanel
          path="/messages"
          title="Sizga yuborilgan xabarlar"
          renderRow={(r) => (
            <FeedItem
              icon={<Mail size={21} />}
              title={r.message?.title}
              status={
                <span
                  className={`badge ${r.acceptedAt ? "green" : r.message?.kind === "WARNING" ? "amber" : "blue"}`}
                >
                  {r.acceptedAt
                    ? "Qabul qilingan"
                    : r.message?.kind === "WARNING"
                      ? "Ogohlantirish"
                      : r.readAt
                        ? "O‘qilgan"
                        : "Yangi"}
                </span>
              }
              meta={
                <>
                  {r.readAt
                    ? `Ko‘rilgan: ${date(r.readAt)}`
                    : "Hali o‘qilmagan"}{" "}
                  ·{" "}
                  {r.acceptedAt
                    ? `Qabul qilingan: ${date(r.acceptedAt)}`
                    : "Qabul qilinmagan"}
                </>
              }
              actions={
                !r.acceptedAt && (
                  <button
                    className="button soft"
                    onClick={() =>
                      action(
                        "Xabarni qabul qilish",
                        `/messages/${r.messageId}/receipt`,
                        { accepted: true },
                      )
                    }
                  >
                    <Check size={17} />
                    Qabul qildim
                  </button>
                )
              }
            >
              <p>{r.message?.body}</p>
              {!!r.message?.assetIds?.length && (
                <div className="feed-attachments">
                  {r.message.assetIds.map((id: string, n: number) => (
                    <a
                      key={id}
                      href={`/api/media/${id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText size={15} />
                      Fayl {n + 1}
                    </a>
                  ))}
                </div>
              )}
            </FeedItem>
          )}
        />
      ) : kind === "tasks" ? (
        <DataPanel
          path="/tasks"
          title="Jamoa vazifalari"
          paged={false}
          filter={(r) => r.sanatoriumId === ctx.tenant}
          renderRow={(r) => (
            <FeedItem
              icon={<ClipboardList size={21} />}
              title={r.title}
              status={<Badge value={r.status} />}
              meta={
                <>
                  <span>
                    Xodim:{" "}
                    {people.find((p) => p.userId === r.assignedTo)?.user
                      ?.name ??
                      (r.assignedTo === ctx.actor.id ? "Siz" : "Xodim")}
                  </span>
                  <span>Muddat: {dateTime(r.dueAt)}</span>
                </>
              }
              actions={
                (r.assignedTo === ctx.actor.id || ctx.admin) && (
                  <>
                    {r.status === "ASSIGNED" && (
                      <button
                        className="button soft"
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
                      </button>
                    )}
                    {r.status === "ACCEPTED" && (
                      <button
                        className="button soft"
                        onClick={() =>
                          action(
                            "Vazifani yakunlash",
                            `/tasks/${r.id}`,
                            { version: r.version, status: "COMPLETED" },
                            [
                              {
                                key: "reply",
                                label: "Natija",
                                type: "textarea",
                              },
                            ],
                            "PATCH",
                          )
                        }
                      >
                        Bajarildi
                        <CheckCheck size={17} />
                      </button>
                    )}
                  </>
                )
              }
            >
              <p>{r.body}</p>
              {r.reply && (
                <div className="feed-reply">
                  <strong>Natija</strong>
                  <p>{r.reply}</p>
                </div>
              )}
            </FeedItem>
          )}
        />
      ) : (
        <>
          {selectedSurvey && (
            <Card
              title={`${selectedSurvey.title} · ${selectedSurvey.version}-versiya`}
              aside={<Act onClick={() => setSelectedSurvey(null)}>Yopish</Act>}
            >
              {ctx.admin && (
                <p className="section-text">
                  Javoblar: {selectedSurvey.response_count ?? 0} /{" "}
                  {selectedSurvey.recipientIds.length}
                </p>
              )}
              <Table
                rows={selectedSurvey.questions}
                columns={[
                  { label: "Savol", key: "label" },
                  {
                    label: "Turi",
                    render: (q) =>
                      q.type === "BOOLEAN"
                        ? "Ha / yo‘q"
                        : q.type === "NUMBER"
                          ? "Son"
                          : "Matn",
                  },
                  {
                    label: "Majburiy",
                    render: (q) => (q.required ? "Ha" : "Yo‘q"),
                  },
                  ...(selectedSurvey.answered
                    ? [
                        {
                          label: "Javobingiz",
                          render: (q: Row) => {
                            const value =
                              selectedSurvey.response?.answers?.[q.id];
                            return typeof value === "boolean"
                              ? value
                                ? "Ha"
                                : "Yo‘q"
                              : String(value ?? "—");
                          },
                        },
                      ]
                    : []),
                ]}
              />
            </Card>
          )}
          <DataPanel
            path="/surveys"
            title="Anketalar"
            paged={false}
            renderRow={(r) => (
              <FeedItem
                icon={<FileText size={21} />}
                title={r.title}
                status={
                  <span className={`badge ${r.answered ? "green" : "blue"}`}>
                    {r.answered ? "Javob berilgan" : "Javob kutilmoqda"}
                  </span>
                }
                meta={
                  <>
                    <span>
                      {date(r.createdAt)} · {r.version}-versiya
                    </span>
                    {ctx.admin && (
                      <span>
                        Javoblar: {r.response_count ?? 0} /{" "}
                        {r.recipientIds.length}
                      </span>
                    )}
                  </>
                }
                actions={
                  <>
                    <Act onClick={() => setSelectedSurvey(r)}>
                      {r.answered ? "Javobimni ko‘rish" : "Savollarni ko‘rish"}
                    </Act>
                    {r.answered ? (
                      <span className="muted">Javob berilgan</span>
                    ) : r.recipientIds.includes(ctx.actor.id) ? (
                      <Act onClick={() => answer(r)}>Javob berish</Act>
                    ) : (
                      <span className="muted">Yuborilgan</span>
                    )}
                  </>
                }
              >
                <p>
                  {r.questions.length} ta savol · Har bir versiya uchun alohida
                  javob saqlanadi.
                </p>
              </FeedItem>
            )}
          />
        </>
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
        title="Mehmonlar fikrlari"
        params={{ sanatorium_id: ctx.tenant }}
        renderRow={(r) => (
          <FeedItem
            icon={<Star size={21} />}
            title={
              <span
                className="review-rating"
                aria-label={`Baho: ${r.rating} / 5`}
              >
                {Array.from({ length: 5 }, (_, n) => (
                  <Star
                    key={n}
                    size={17}
                    className={n < r.rating ? "filled" : ""}
                    aria-hidden="true"
                  />
                ))}
                <span>{r.rating} / 5</span>
              </span>
            }
            status={<Badge value={r.status} />}
            meta={date(r.createdAt)}
            actions={
              <>
                <Act
                  onClick={() =>
                    action(
                      "Sharhga javob",
                      `/partner/reviews/${r.id}/reply`,
                      {},
                      [
                        {
                          key: "reply",
                          label: "Javob",
                          type: "textarea",
                          required: true,
                          minLength: 3,
                          value: r.reply,
                        },
                      ],
                    )
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
                          status:
                            r.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED",
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
            }
          >
            <p>{r.text}</p>
            {r.reply && (
              <div className="feed-reply">
                <strong>Sanatoriya javobi</strong>
                <p>{r.reply}</p>
              </div>
            )}
          </FeedItem>
        )}
      />
    </>
  );
}
export function Support() {
  const ctx = usePortal(),
    action = useAction(),
    [id, setId] = useState<string | null>(null),
    tickets = useRemote("/support/tickets", ctx.epoch),
    detail = useRemote(id ? `/support/tickets/${id}` : null, ctx.epoch),
    t = detail.data;
  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches)
      setId((selected) => selected ?? list(tickets.data)[0]?.id ?? null);
  }, [tickets.data]);
  return (
    <>
      <PageHeading
        title="Yordam xizmati"
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
      <div className={`support-layout ${id ? "has-selection" : ""}`}>
        <div className="support-ticket-list">
          <Card title="Murojaatlar">
            {tickets.loading ? (
              <Loading />
            ) : tickets.error ? (
              <ErrorBox message={tickets.error} retry={tickets.reload} />
            ) : (
              <Table
                layout="cards"
                rows={list(tickets.data)}
                columns={[
                  { label: "Mavzu", key: "title" },
                  statusColumn,
                  { label: "Yaratilgan", render: (row) => date(row.createdAt) },
                ]}
                actions={(row) => (
                  <Act onClick={() => setId(row.id)}>
                    {row.id === id ? "Tanlangan suhbat" : "Ochish"}
                  </Act>
                )}
              />
            )}
          </Card>
        </div>
        <div className="support-conversation">
          {id ? (
            <>
              <button
                className="button secondary support-back"
                onClick={() => setId(null)}
              >
                ← Murojaatlarga qaytish
              </button>
              {detail.loading ? (
                <Loading />
              ) : detail.error ? (
                <ErrorBox message={detail.error} retry={detail.reload} />
              ) : (
                t && (
                  <Card
                    title={t.title ?? "Suhbat"}
                    aside={<Badge value={t.status} />}
                  >
                    <div className="message-list">
                      {t.messages.map((m: Row) => (
                        <div
                          className={`message ${m.userId === ctx.actor.id ? "own" : ""}`}
                          key={m.id}
                        >
                          <strong>
                            {m.userId === ctx.actor.id ? "Siz" : "Suhbatdosh"}
                          </strong>
                          <p className="message-body">{m.text}</p>
                          <div className="message-meta">
                            {date(m.createdAt)}
                          </div>
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
            <Card>
              <Empty text="Suhbatni tanlang" />
            </Card>
          )}
        </div>
      </div>
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
  "sanatorium.featured_updated": "Mashhur sanatoriyalar tanlovi yangilandi",
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
        path={ctx.admin ? "/superadmin/audit" : "/partner/audit"}
        params={{ sanatorium_id: ctx.tenant || undefined }}
        columns={[
          { label: "Vaqt", render: (r) => dateTime(r.createdAt) },
          {
            label: "Amal",
            render: (r) =>
              (r.action === "staff.password_reset"
                ? "Xodim paroli tiklandi"
                : auditLabels[r.action]) ?? r.action.replace(/[._]/g, " "),
          },
          {
            label: "Sanatoriya",
            render: (r) =>
              ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name ??
              "Platforma",
          },
          {
            label: "Manba",
            render: (r) =>
              r.actor_name ?? (r.actorId ? "Xodim" : "Provayder / tizim"),
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
        "CSV ustunlari: provider,provider_id,order_id,amount,state,bank_reference,fee. provider: PAYME yoki TEZCHECK; bo‘sh bo‘lsa PAYME. Summalar so‘mda. 5000 satrgacha.",
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
            provider: row.provider || "PAYME",
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
        title="Bildirishnomalar lentasi"
        paged={false}
        renderRow={(r) => (
          <FeedItem
            icon={<Bell size={21} />}
            title={topics[r.payload?.topic] ?? "Platforma yangilanishi"}
            status={
              <span className={`badge ${r.readAt ? "gray" : "blue"}`}>
                {r.readAt ? "O‘qilgan" : "Yangi"}
              </span>
            }
            meta={dateTime(r.createdAt)}
            actions={
              !r.readAt && (
                <button
                  className="button soft"
                  onClick={() =>
                    action(
                      "Bildirishnomani o‘qish",
                      `/notifications/${r.id}/read`,
                    )
                  }
                >
                  <Check size={17} />
                  O‘qilgan
                </button>
              )
            }
          />
        )}
      />
    </>
  );
}

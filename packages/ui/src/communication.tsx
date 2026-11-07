"use client";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Smartphone,
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
    [messageTab, setMessageTab] = useState<"sent" | "inbox">(
      ctx.admin ? "sent" : "inbox",
    ),
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
        "POST",
        () => {
          setMessageTab("sent");
          ctx.refresh();
        },
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
      {kind === "messages" && (
        <div className="tabs" style={{ marginBottom: "16px" }}>
          <button
            type="button"
            className={`tab ${messageTab === "sent" ? "active" : ""}`}
            onClick={() => setMessageTab("sent")}
          >
            Yuborilgan e’lonlar va xabarlar
          </button>
          <button
            type="button"
            className={`tab ${messageTab === "inbox" ? "active" : ""}`}
            onClick={() => setMessageTab("inbox")}
          >
            Kiruvchi xabarlar
          </button>
        </div>
      )}
      {kind === "messages" ? (
        <DataPanel
          key={messageTab}
          path={`/messages?box=${messageTab}`}
          title={
            messageTab === "sent"
              ? "Yuborilgan e’lonlar va xabarlar"
              : "Sizga yuborilgan xabarlar"
          }
          renderRow={(r) => {
            const isSent = messageTab === "sent" || r.direction === "sent";
            const m = r.message ?? r;
            return (
              <FeedItem
                icon={<Mail size={21} />}
                title={m?.title}
                status={
                  isSent ? (
                    <span
                      className={`badge ${m?.kind === "WARNING" ? "amber" : "green"}`}
                    >
                      {m?.kind === "WARNING" ? "Ogohlantirish" : "Yuborilgan"}
                    </span>
                  ) : (
                    <span
                      className={`badge ${r.acceptedAt ? "green" : m?.kind === "WARNING" ? "amber" : "blue"}`}
                    >
                      {r.acceptedAt
                        ? "Qabul qilingan"
                        : m?.kind === "WARNING"
                          ? "Ogohlantirish"
                          : r.readAt
                            ? "O‘qilgan"
                            : "Yangi"}
                    </span>
                  )
                }
                meta={
                  isSent ? (
                    <>
                      <span>{date(r.createdAt || m?.createdAt)}</span>
                      <span> · </span>
                      <span>
                        {r.recipientCount != null
                          ? `${r.recipientCount} ta qabul qiluvchi`
                          : "Barcha xodimlar"}
                      </span>
                      {r.readCount != null && (
                        <>
                          <span> · </span>
                          <span>{r.readCount} ta o‘qildi</span>
                        </>
                      )}
                      {r.acceptedCount != null && r.acceptedCount > 0 && (
                        <>
                          <span> · </span>
                          <span>{r.acceptedCount} ta qabul qildi</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {r.readAt
                        ? `Ko‘rilgan: ${date(r.readAt)}`
                        : "Hali o‘qilmagan"}{" "}
                      ·{" "}
                      {r.acceptedAt
                        ? `Qabul qilingan: ${date(r.acceptedAt)}`
                        : "Qabul qilinmagan"}
                    </>
                  )
                }
                actions={
                  !isSent &&
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
                <p>{m?.body}</p>
                {!!m?.assetIds?.length && (
                  <div className="feed-attachments">
                    {m.assetIds.map((id: string, n: number) => (
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
            );
          }}
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
function getSenderDisplay(row?: Row | null) {
  if (!row) return { primary: "Murojaat", realName: null, phone: null, email: null, login: null, initial: "M", isCustomer: false, badgeText: "Mijoz" };
  const s = row.sender;
  const isCustomer = s?.kind === "CUSTOMER" || (!s && (row.title || "").toLowerCase().includes("ilova"));
  const realName = s?.name && s.name !== "Mijoz" && s.name !== "User" ? s.name : null;
  const phone = s?.phone || null;
  const login = s?.login || null;
  const email = s?.email || (login && login.includes("@") ? login : null);

  let fallbackPhone: string | null = null;
  let fallbackEmail: string | null = null;
  let fallbackName: string | null = null;
  if (Array.isArray(row.messages)) {
    for (const m of row.messages) {
      if (m.userId === row.userId) {
        if (!fallbackPhone && m.userPhone) fallbackPhone = m.userPhone;
        if (!fallbackEmail && (m.userEmail || (m.userLogin && m.userLogin.includes("@")))) fallbackEmail = m.userEmail || m.userLogin;
        if (!fallbackName && m.userName && m.userName !== "Mijoz") fallbackName = m.userName;
      }
    }
  }

  const finalName = realName || fallbackName;
  const finalPhone = phone || fallbackPhone;
  const finalEmail = email || fallbackEmail;
  const finalLogin = login;

  let primary = "";
  if (finalName) {
    primary = finalName;
  } else if (finalPhone) {
    primary = finalPhone;
  } else if (finalEmail) {
    primary = finalEmail;
  } else if (finalLogin) {
    primary = finalLogin;
  } else {
    primary = row.senderDisplay || (isCustomer ? "Mobil mijoz" : (row.title || "Murojaat"));
  }

  const initial = (primary || "M").replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "").slice(0, 1).toUpperCase() || "M";

  return {
    primary,
    realName: finalName,
    phone: finalPhone,
    email: finalEmail,
    login: finalLogin,
    initial,
    isCustomer,
    badgeText: isCustomer ? "📱 Mobil mijoz" : "🏢 Xodim",
  };
}

export function Support() {
  const ctx = usePortal(),
    action = useAction(),
    [id, setId] = useState<string | null>(null),
    [searchQuery, setSearchQuery] = useState(""),
    [replyText, setReplyText] = useState(""),
    [sending, setSending] = useState(false),
    messagesEndRef = useRef<HTMLDivElement>(null),
    tickets = useRemote("/support/tickets", ctx.epoch),
    detail = useRemote(id ? `/support/tickets/${id}` : null, ctx.epoch),
    [thread, setThread] = useState<Row | null>(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches)
      setId((selected) => selected ?? list(tickets.data)[0]?.id ?? null);
  }, [tickets.data]);

  useEffect(() => {
    if (detail.data) setThread(detail.data);
  }, [detail.data]);

  useEffect(() => {
    if (!id) {
      setThread(null);
      return;
    }
    const timer = setInterval(() => {
      api<Row>(`/support/tickets/${id}`)
        .then((fresh) => {
          if (fresh) setThread(fresh);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages?.length]);

  const selectTicket = (ticketId: string | null) => {
    setId(ticketId);
    setThread(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = replyText.trim();
    if (!text || !id || sending) return;
    setSending(true);
    try {
      await api(`/support/tickets/${id}/messages`, "POST", { text });
      setReplyText("");
      const fresh = await api<Row>(`/support/tickets/${id}`);
      if (fresh) setThread(fresh);
    } catch (err: any) {
      ctx.notice(err.message || "Xabar yuborishda xatolik");
    } finally {
      setSending(false);
    }
  };

  const allTickets = list(tickets.data);
  const filteredTickets = searchQuery.trim()
    ? allTickets.filter((row: Row) =>
        (row.title ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allTickets;

  const t = thread ?? detail.data;
  return (
    <>
      <PageHeading
        title="Yordam xizmati"
        subtitle="Mijozlar va sanatoriyalar bilan Telegram uslubidagi qulay chat."
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

      <div className={`tg-messenger ${id ? "has-selection" : ""}`}>
        <div className="tg-sidebar">
          <div className="tg-sidebar-header">
            <h3>Murojaatlar ({filteredTickets.length})</h3>
            <button
              className="button secondary"
              style={{ padding: "4px 10px", fontSize: "12px", minHeight: "32px" }}
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
              + Yangi
            </button>
          </div>
          <div className="tg-search-bar">
            <input
              type="text"
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {tickets.loading ? (
            <Loading />
          ) : tickets.error ? (
            <ErrorBox message={tickets.error} retry={tickets.reload} />
          ) : (
            <ul className="tg-chat-list">
              {!filteredTickets.length && (
                <li style={{ padding: "24px 16px", textAlign: "center", color: "#8ea69d", fontSize: "13px" }}>
                  Murojaat topilmadi
                </li>
              )}
              {filteredTickets.map((row: Row) => {
                const isSelected = row.id === id;
                const info = getSenderDisplay(row);
                return (
                  <li
                    key={row.id}
                    className={`tg-chat-item ${isSelected ? "active" : ""}`}
                    onClick={() => selectTicket(row.id)}
                    style={{ borderLeft: isSelected ? "3px solid #25e2a2" : "3px solid transparent" }}
                  >
                    <div className="tg-avatar" style={{ background: info.isCustomer ? "linear-gradient(135deg, #104233, #19694e)" : "#22352c", color: "#25e2a2", fontWeight: 700 }}>
                      {info.initial}
                    </div>
                    <div className="tg-chat-info">
                      <div className="tg-chat-top">
                        <span className="tg-chat-title" style={{ fontWeight: 600, color: "#eef7f2" }}>
                          {info.primary}
                        </span>
                        <span className="tg-chat-time">{date(row.createdAt)}</span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "2px 0", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "10px", background: "rgba(37,226,162,0.15)", color: "#25e2a2", padding: "1px 6px", borderRadius: "10px", fontWeight: 600 }}>
                          {info.badgeText}
                        </span>
                        {info.realName && info.phone && (
                          <span style={{ fontSize: "11px", color: "#8ea69d" }}>
                            {info.phone}
                          </span>
                        )}
                        {info.email && info.primary !== info.email && (
                          <span style={{ fontSize: "11px", color: "#8ea69d" }}>
                            {info.email}
                          </span>
                        )}
                        {row.booking && (
                          <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.06)", color: "#cbe5d8", padding: "1px 5px", borderRadius: "6px" }}>
                            #{row.booking.reference}
                          </span>
                        )}
                      </div>
                      <div className="tg-chat-bottom">
                        <span className="tg-chat-preview" style={{ color: "#7a9c8f" }}>
                          {row.lastMessage ?? (row.status === "RESOLVED" || row.status === "CLOSED" ? "Yakunlangan" : row.title || "Ochiq suhbat")}
                        </span>
                        <Badge value={row.status} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="tg-room">
          {id ? (
            <>
              {(() => {
                const roomInfo = getSenderDisplay(t);
                return (
                  <div className="tg-room-header" style={{ padding: "12px 18px", background: "#0a241a", borderBottom: "1px solid #19513e", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div className="tg-room-user" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: 1 }}>
                      <button
                        className="button secondary support-back"
                        style={{ marginRight: "4px", minHeight: "32px", padding: "4px 8px" }}
                        onClick={() => selectTicket(null)}
                      >
                        ←
                      </button>
                      <div className="tg-room-avatar" style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #104233, #25e2a2)", color: "#041610", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "17px" }}>
                        {roomInfo.initial}
                      </div>
                      <div style={{ flex: 1, minWidth: "220px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                            {roomInfo.primary}
                          </span>
                          {roomInfo.realName && roomInfo.phone && (
                            <span style={{ fontSize: "13px", color: "#66e1b9", fontWeight: 600 }}>
                              ({roomInfo.phone})
                            </span>
                          )}
                          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "rgba(37,226,162,0.15)", color: "#25e2a2", fontWeight: 600 }}>
                            {roomInfo.badgeText}
                          </span>
                          {roomInfo.phone && (
                            <a href={`tel:${roomInfo.phone}`} style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "8px", background: "rgba(37,226,162,0.12)", color: "#25e2a2", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Phone size={12} /> {roomInfo.phone}
                            </a>
                          )}
                          {roomInfo.email && (
                            <a href={`mailto:${roomInfo.email}`} style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "8px", background: "rgba(37,226,162,0.08)", color: "#a5e9d3", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              ✉️ {roomInfo.email}
                            </a>
                          )}
                          {roomInfo.login && !roomInfo.email && (
                            <span style={{ fontSize: "11px", color: "#8ea69d", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "6px" }}>
                              Login: {roomInfo.login}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px", fontSize: "12px", color: "#8ea69d", flexWrap: "wrap" }}>
                          <span>Mavzu: <strong style={{ color: "#d0e4da" }}>{t?.title ?? "Murojaat"}</strong></span>
                          {t?.sanatoriumName && (
                            <span>• 🏨 {t.sanatoriumName}</span>
                          )}
                          {t?.booking && (
                            <span style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "6px", color: "#25e2a2" }}>
                              🎫 Bron #{t.booking.reference} ({t.booking.status})
                            </span>
                          )}
                          {t?.userId && (
                            <span style={{ fontSize: "11px", color: "#6e8e81" }}>
                              ID: {t.userId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Badge value={t?.status} />
                      {ctx.admin && t?.status !== "RESOLVED" && t?.status !== "CLOSED" && (
                        <Act
                          onClick={() =>
                            action(
                              "Murojaatni yopish",
                              `/support/tickets/${id}/messages`,
                              {},
                              [
                                {
                                  key: "text",
                                  label: "Xulosa yoki yakuniy javob",
                                  type: "textarea",
                                  required: true,
                                  value: "Murojaat ko‘rib chiqildi va yakunlandi.",
                                },
                                {
                                  key: "close",
                                  label: "Murojaatni yopish",
                                  type: "checkbox" as const,
                                  value: true,
                                },
                              ],
                              "POST",
                              () => {
                                if (id) {
                                  api<Row>(`/support/tickets/${id}`)
                                    .then((fresh) => {
                                      if (fresh) setThread(fresh);
                                    })
                                    .catch(() => {});
                                }
                              },
                            )
                          }
                        >
                          Yopish
                        </Act>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="tg-viewport">
                {!t && detail.loading ? (
                  <Loading />
                ) : !t && detail.error ? (
                  <ErrorBox message={detail.error} retry={detail.reload} />
                ) : (
                  t && (
                    <>
                      {t.messages.map((m: Row) => {
                        const isOwn = m.userId === ctx.actor.id;
                        const senderInfo = m.userId === t?.userId ? getSenderDisplay(t) : null;
                        const rawName = (m.userName ?? "").trim();
                        const isPlaceholder = !rawName || rawName === "Mijoz" || rawName === "User";
                        const bubbleSenderName = !isPlaceholder
                          ? rawName
                          : (senderInfo?.primary || rawName || "Suhbatdosh");
                        const bubblePhone = m.userPhone || senderInfo?.phone;
                        const bubbleEmail = m.userEmail || senderInfo?.email;
                        return (
                          <div
                            key={m.id}
                            className={`tg-bubble-row ${isOwn ? "own" : "incoming"}`}
                          >
                            <div className={`tg-bubble ${isOwn ? "own" : "incoming"}`}>
                              {!isOwn && (
                                <div className="tg-bubble-sender" style={{ fontWeight: 700, fontSize: "12px", color: "#25e2a2", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <span>👤 {bubbleSenderName}</span>
                                  {bubblePhone && (
                                    <a href={`tel:${bubblePhone}`} style={{ fontSize: "11px", color: "#66e1b9", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                      <Phone size={10} /> {bubblePhone}
                                    </a>
                                  )}
                                  {bubbleEmail && (
                                    <span style={{ fontSize: "11px", color: "#8ea69d", fontWeight: 400 }}>
                                      ✉️ {bubbleEmail}
                                    </span>
                                  )}
                                  {(m.userKind === "CUSTOMER" || senderInfo?.isCustomer) && <span style={{ fontSize: "10px", background: "rgba(37,226,162,0.18)", color: "#25e2a2", padding: "0 5px", borderRadius: "6px" }}>Ilova</span>}
                                </div>
                              )}
                              <p className="tg-bubble-text">{m.text}</p>
                              <div className="tg-bubble-meta">
                                <span>{dateTime(m.createdAt).slice(11, 16)}</span>
                                {isOwn && <CheckCheck size={13} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )
                )}
              </div>
              <form className="tg-composer" onSubmit={handleSend}>
                <input
                  type="text"
                  className="tg-composer-input"
                  placeholder="Xabar yozing..."
                  value={replyText}
                  disabled={sending || t?.status === "RESOLVED"}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  className="tg-composer-send"
                  disabled={!replyText.trim() || sending || t?.status === "RESOLVED"}
                  aria-label="Xabar yuborish"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8ea69d" }}>
              <Empty text="Muloqotni ko‘rish uchun chap tarafdan suhbatni tanlang" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
const auditLabels: Record<string, string> = {
  "staff.password_reset": "Xodim paroli tiklandi",
  "auth.password_changed": "Parol yangilandi",
  "staff.invited": "Resepsion qo‘shildi",
  "staff.approved": "Resepsion tasdiqlandi",
  "auth.bootstrap": "Admin hisobi yaratildi",
  "auth.staff_login": "Xodim kirdi",
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
        subtitle="Parollar yangilanishi va resepsion qo‘shilishi tarixi."
      />
      <DataPanel
        path={ctx.admin ? "/superadmin/audit" : "/partner/audit"}
        params={{ sanatorium_id: ctx.tenant || undefined }}
        columns={[
          { label: "Vaqt", render: (r) => dateTime(r.createdAt) },
          {
            label: "Amal",
            render: (r) => {
              if (r.action === "staff.password_reset") return "Xodim paroli tiklandi";
              if (r.action === "auth.password_changed") return "Parol yangilandi";
              if (r.action === "staff.invited") {
                return (r.after as any)?.role === "ACCOUNTANT"
                  ? "Hisobchi qo‘shildi"
                  : "Resepsion qo‘shildi";
              }
              if (r.action === "staff.approved") {
                return (r.after as any)?.role === "ACCOUNTANT"
                  ? "Hisobchi tasdiqlandi"
                  : "Resepsion tasdiqlandi";
              }
              return auditLabels[r.action] ?? r.action.replace(/[._]/g, " ");
            },
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
    "payment.succeeded": "Bron to‘lovi tasdiqlandi",
    "ad.requested": "Yangi reklama arizasi",
    "ad.moderated": "Reklama moderatsiyasi",
    "support.opened": "Yangi murojaat",
    "support.replied": "Murojaatga javob",
    "sanatorium.moderated": "Profil tekshirildi",
    "staff.invited": "Yangi xodim taklifi",
    "refund.succeeded": "Pul qaytarildi",
  };
  return (
    <>
      <PageHeading
        title="Bildirishnomalar"
        subtitle="Sizga tegishli platforma hodisalari."
      >
        <button
          className="button secondary"
          onClick={() =>
            action(
              "Barchasini o‘qilgan deb belgilash",
              "/notifications/read-all",
              {},
              [],
              "POST",
            )
          }
        >
          <CheckCheck size={17} style={{ marginRight: 6 }} />
          Barchasini o‘qish
        </button>
      </PageHeading>
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

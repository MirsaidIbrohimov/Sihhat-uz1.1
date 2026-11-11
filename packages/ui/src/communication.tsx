"use client";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  CheckCheck,
  ClipboardList,
  Download,
  Edit2,
  FileText,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Smartphone,
  Star,
  Trash2,
  Users,
  Video,
  X,
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
          path="/messages"
          params={{ box: messageTab }}
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
    [attachedMedia, setAttachedMedia] = useState<{
      name: string;
      url: string;
      type: "image" | "video" | "file";
      sizeText?: string;
    } | null>(null),
    [attachMenuOpen, setAttachMenuOpen] = useState(false),
    [editingMessageId, setEditingMessageId] = useState<string | null>(null),
    [editingText, setEditingText] = useState(""),
    [sending, setSending] = useState(false),
    // New Ticket Modal State
    [newModalOpen, setNewModalOpen] = useState(false),
    [recipientType, setRecipientType] = useState<"CUSTOMER" | "PARTNER">("CUSTOMER"),
    [customers, setCustomers] = useState<Row[]>([]),
    [partners, setPartners] = useState<Row[]>([]),
    [loadingRecipients, setLoadingRecipients] = useState(false),
    [userSearch, setUserSearch] = useState(""),
    [partnerSearch, setPartnerSearch] = useState(""),
    [selectedUserId, setSelectedUserId] = useState<string | null>(null),
    [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(ctx.tenant ?? null),
    [newTitle, setNewTitle] = useState(""),
    [newText, setNewText] = useState(""),
    [creatingTicket, setCreatingTicket] = useState(false),
    // Refs
    attachMenuRef = useRef<HTMLDivElement>(null),
    imageInputRef = useRef<HTMLInputElement>(null),
    videoInputRef = useRef<HTMLInputElement>(null),
    docInputRef = useRef<HTMLInputElement>(null),
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

  // Click outside to close attachment menu
  useEffect(() => {
    if (!attachMenuOpen) return;
    const closeMenu = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [attachMenuOpen]);

  // Fetch recipients when new ticket modal opens
  useEffect(() => {
    if (!newModalOpen) return;
    let isMounted = true;
    setLoadingRecipients(true);
    Promise.all([
      api<any>("/superadmin/customers?limit=100").catch(() => []),
      api<any>((ctx.admin ? "/superadmin" : "/partner") + "/sanatoriums?limit=100").catch(() => []),
    ]).then(([cRes, pRes]) => {
      if (!isMounted) return;
      const cList = Array.isArray(cRes) ? cRes : (cRes?.data ?? cRes?.rows ?? []);
      const pList = Array.isArray(pRes) ? pRes : (pRes?.data ?? pRes?.rows ?? []);
      setCustomers(cList);
      setPartners(pList);
      setLoadingRecipients(false);
    });
    return () => {
      isMounted = false;
    };
  }, [newModalOpen, ctx.admin]);

  const selectTicket = (ticketId: string | null) => {
    setId(ticketId);
    setThread(null);
    setAttachedMedia(null);
    setAttachMenuOpen(false);
    setEditingMessageId(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      ctx.notice("Faqat rasm fayllari (JPEG, PNG, WebP) yuklanishi mumkin");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      ctx.notice("Rasm hajmi 8 MB dan oshmasligi kerak");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const c2d = canvas.getContext("2d");
        if (c2d) {
          c2d.drawImage(img, 0, 0, w, h);
          setAttachedMedia({
            name: file.name,
            url: canvas.toDataURL("image/jpeg", 0.82),
            type: "image",
          });
        } else {
          setAttachedMedia({
            name: file.name,
            url: raw,
            type: "image",
          });
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      ctx.notice("Faqat video fayllari (MP4, WebM, MOV) yuklanishi mumkin");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      ctx.notice("Video hajmi 15 MB dan oshmasligi kerak");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedMedia({
        name: file.name,
        url: reader.result as string,
        type: "video",
        sizeText: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      ctx.notice("Fayl hajmi 15 MB dan oshmasligi kerak");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedMedia({
        name: file.name,
        url: reader.result as string,
        type: "file",
        sizeText: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = replyText.trim();
    if ((!text && !attachedMedia) || !id || sending) return;
    setSending(true);
    try {
      const fallbackPlaceholder = attachedMedia
        ? attachedMedia.type === "video"
          ? "🎬 Video"
          : attachedMedia.type === "file"
            ? `📎 Fayl: ${attachedMedia.name}`
            : "📷 Rasm"
        : "";
      await api(`/support/tickets/${id}/messages`, "POST", {
        text: text || fallbackPlaceholder,
        imageUrl: attachedMedia?.url || undefined,
      });
      setReplyText("");
      setAttachedMedia(null);
      const fresh = await api<Row>(`/support/tickets/${id}`);
      if (fresh) setThread(fresh);
    } catch (err: any) {
      ctx.notice(err.message || "Xabar yuborishda xatolik");
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim() || creatingTicket) return;
    if (recipientType === "CUSTOMER" && !selectedUserId) {
      ctx.notice("Iltimos, ilova foydalanuvchisini tanlang");
      return;
    }
    if (recipientType === "PARTNER" && !selectedPartnerId) {
      ctx.notice("Iltimos, hamkor sanatoriyani tanlang");
      return;
    }
    setCreatingTicket(true);
    try {
      const payload: any = {
        title: newTitle.trim(),
        text: newText.trim(),
      };
      if (recipientType === "CUSTOMER") {
        payload.target_user_id = selectedUserId;
      } else {
        payload.sanatorium_id = selectedPartnerId;
      }
      const res = await api<Row>("/support/tickets", "POST", payload);
      ctx.notice("Yangi suhbat muvaffaqiyatli ochildi");
      setNewModalOpen(false);
      setNewTitle("");
      setNewText("");
      setSelectedUserId(null);
      await tickets.reload();
      if (res?.id) {
        selectTicket(res.id);
      }
    } catch (err: any) {
      ctx.notice(err.message || "Murojaat yaratishda xatolik yuz berdi");
    } finally {
      setCreatingTicket(false);
    }
  };

  const startEdit = (msg: Row) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEdit = async (msgId: string) => {
    const text = editingText.trim();
    if (!text || !id) return;
    try {
      await api(`/support/tickets/${id}/messages/${msgId}`, "PATCH", { text });
      cancelEdit();
      const fresh = await api<Row>(`/support/tickets/${id}`);
      if (fresh) setThread(fresh);
      ctx.notice("Xabar tahrirlandi");
    } catch (err: any) {
      ctx.notice(err.message || "Tahrirlashda xatolik");
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!id) return;
    if (!window.confirm("Haqiqatan ham bu xabarni o‘chirmoqchimisiz?")) return;
    try {
      await api(`/support/tickets/${id}/messages/${msgId}`, "DELETE");
      const fresh = await api<Row>(`/support/tickets/${id}`);
      if (fresh) setThread(fresh);
      ctx.notice("Xabar o‘chirildi");
    } catch (err: any) {
      ctx.notice(err.message || "O‘chirishda xatolik");
    }
  };

  const allTickets = list(tickets.data);
  const filteredTickets = searchQuery.trim()
    ? allTickets.filter((row: Row) =>
        (row.title ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allTickets;

  const filteredCustomers = customers.filter((c: Row) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.login ?? "").toLowerCase().includes(q)
    );
  });

  const filteredPartners = partners.filter((p: Row) => {
    if (!partnerSearch.trim()) return true;
    const q = partnerSearch.toLowerCase();
    return (
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.region ?? "").toLowerCase().includes(q)
    );
  });

  const selectedUser = customers.find((c: Row) => c.id === selectedUserId);
  const selectedPartner = partners.find((p: Row) => p.id === selectedPartnerId);

  const t = thread ?? detail.data;
  return (
    <>
      <PageHeading
        title="Yordam xizmati"
        subtitle="Mijozlar va sanatoriyalar bilan Telegram uslubidagi qulay chat."
      >
        <AddButton onClick={() => setNewModalOpen(true)}>
          Murojaat yaratish
        </AddButton>
      </PageHeading>

      {/* Recipient Selection Modal */}
      {newModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => !creatingTicket && setNewModalOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: "620px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading" style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#eef7f2" }}>Yangi xabar / murojaat</h2>
                <p className="muted" style={{ fontSize: "13px", margin: "4px 0 0" }}>Qabul qiluvchini tanlang va xabar yozing</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Yopish"
                disabled={creatingTicket}
                onClick={() => setNewModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Recipient Type Switcher Tabs */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#8ea69d", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
                  Qabul qiluvchi turi
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(0,0,0,0.25)", padding: "4px", borderRadius: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setRecipientType("CUSTOMER")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: recipientType === "CUSTOMER" ? "#25e2a2" : "transparent",
                      color: recipientType === "CUSTOMER" ? "#041610" : "#a2b8ad",
                    }}
                  >
                    <Smartphone size={16} />
                    <span>📱 Ilova foydalanuvchisi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType("PARTNER")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: recipientType === "PARTNER" ? "#25e2a2" : "transparent",
                      color: recipientType === "PARTNER" ? "#041610" : "#a2b8ad",
                    }}
                  >
                    <Building2 size={16} />
                    <span>🏥 Hamkor sanatoriya</span>
                  </button>
                </div>
              </div>

              {/* Customer Picker */}
              {recipientType === "CUSTOMER" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#8ea69d" }}>
                      Ilova foydalanuvchisini tanlang *
                    </label>
                    {selectedUser && (
                      <span style={{ fontSize: "11px", color: "#25e2a2", fontWeight: 600 }}>
                        Tanlandi: {selectedUser.name}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", marginBottom: "8px" }}>
                    <input
                      type="text"
                      placeholder="Foydalanuvchi ismi, telefon yoki emaili bo‘yicha qidirish..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px 9px 34px",
                        background: "#061d15",
                        border: "1px solid #1c523f",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                    <Search size={15} style={{ position: "absolute", left: "11px", top: "11px", color: "#8ea69d" }} />
                  </div>

                  <div
                    style={{
                      maxHeight: "160px",
                      overflowY: "auto",
                      border: "1px solid #194635",
                      borderRadius: "8px",
                      background: "#041610",
                      padding: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    {loadingRecipients ? (
                      <div style={{ padding: "16px", textAlign: "center", color: "#8ea69d", fontSize: "12px" }}>
                        Foydalanuvchilar yuklanmoqda...
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center", color: "#8ea69d", fontSize: "12px" }}>
                        Foydalanuvchi topilmadi
                      </div>
                    ) : (
                      filteredCustomers.map((cust: Row) => {
                        const isSel = selectedUserId === cust.id;
                        const cInit = (cust.name || "U").slice(0, 1).toUpperCase();
                        return (
                          <div
                            key={cust.id}
                            onClick={() => setSelectedUserId(cust.id)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              background: isSel ? "rgba(37,226,162,0.18)" : "transparent",
                              border: isSel ? "1px solid #25e2a2" : "1px solid transparent",
                              transition: "background 0.1s",
                            }}
                          >
                            <div
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                background: isSel ? "#25e2a2" : "#133f30",
                                color: isSel ? "#041610" : "#25e2a2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "12px",
                                flexShrink: 0,
                              }}
                            >
                              {cInit}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: isSel ? "#fff" : "#eef7f2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {cust.name || "Noma'lum foydalanuvchi"}
                              </div>
                              <div style={{ fontSize: "11px", color: "#8ea69d", display: "flex", gap: "8px" }}>
                                {cust.phone && <span>{cust.phone}</span>}
                                {cust.email && <span>{cust.email}</span>}
                              </div>
                            </div>
                            {isSel && <Check size={16} style={{ color: "#25e2a2" }} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Partner Picker */}
              {recipientType === "PARTNER" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#8ea69d" }}>
                      Hamkor sanatoriyani tanlang *
                    </label>
                    {selectedPartner && (
                      <span style={{ fontSize: "11px", color: "#25e2a2", fontWeight: 600 }}>
                        Tanlandi: {selectedPartner.name}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", marginBottom: "8px" }}>
                    <input
                      type="text"
                      placeholder="Sanatoriya nomi bo‘yicha qidirish..."
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px 9px 34px",
                        background: "#061d15",
                        border: "1px solid #1c523f",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                    <Search size={15} style={{ position: "absolute", left: "11px", top: "11px", color: "#8ea69d" }} />
                  </div>

                  <div
                    style={{
                      maxHeight: "160px",
                      overflowY: "auto",
                      border: "1px solid #194635",
                      borderRadius: "8px",
                      background: "#041610",
                      padding: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    {loadingRecipients ? (
                      <div style={{ padding: "16px", textAlign: "center", color: "#8ea69d", fontSize: "12px" }}>
                        Sanatoriyalar yuklanmoqda...
                      </div>
                    ) : filteredPartners.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center", color: "#8ea69d", fontSize: "12px" }}>
                        Sanatoriya topilmadi
                      </div>
                    ) : (
                      filteredPartners.map((san: Row) => {
                        const isSel = selectedPartnerId === san.id;
                        return (
                          <div
                            key={san.id}
                            onClick={() => setSelectedPartnerId(san.id)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              background: isSel ? "rgba(37,226,162,0.18)" : "transparent",
                              border: isSel ? "1px solid #25e2a2" : "1px solid transparent",
                            }}
                          >
                            <Building2 size={18} style={{ color: isSel ? "#25e2a2" : "#8ea69d", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: isSel ? "#fff" : "#eef7f2" }}>
                                {san.name}
                              </div>
                              {san.region && <div style={{ fontSize: "11px", color: "#8ea69d" }}>{san.region}</div>}
                            </div>
                            {isSel && <Check size={16} style={{ color: "#25e2a2" }} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Title / Mavzu */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#8ea69d", display: "block", marginBottom: "6px" }}>
                  Mavzu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mavzu (masalan: Xizmat ko‘rsatish / E’lon / Bron bo‘yicha)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "#061d15",
                    border: "1px solid #1c523f",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Text / Matn */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#8ea69d", display: "block", marginBottom: "6px" }}>
                  Xabar matni *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Xabarni shu yerga yozing..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#061d15",
                    border: "1px solid #1c523f",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={creatingTicket}
                  onClick={() => setNewModalOpen(false)}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    creatingTicket ||
                    !newTitle.trim() ||
                    !newText.trim() ||
                    (recipientType === "CUSTOMER" && !selectedUserId) ||
                    (recipientType === "PARTNER" && !selectedPartnerId)
                  }
                >
                  {creatingTicket ? "Yuborilmoqda..." : "Yuborish"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <div className={`tg-messenger ${id ? "has-selection" : ""}`}>
        <div className="tg-sidebar">
          <div className="tg-sidebar-header">
            <h3>Murojaatlar ({filteredTickets.length})</h3>
            <button
              className="button secondary"
              style={{ padding: "4px 10px", fontSize: "12px", minHeight: "32px" }}
              onClick={() => setNewModalOpen(true)}
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
                          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "rgba(37,226,162,0.15)", color: "#25e2a2", fontWeight: 600 }}>
                            {roomInfo.badgeText}
                          </span>
                          {ctx.admin && roomInfo.realName && roomInfo.phone && (
                            <span style={{ fontSize: "13px", color: "#66e1b9", fontWeight: 600 }}>
                              ({roomInfo.phone})
                            </span>
                          )}
                          {ctx.admin && roomInfo.phone && (
                            <a href={`tel:${roomInfo.phone}`} style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "8px", background: "rgba(37,226,162,0.12)", color: "#25e2a2", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Phone size={12} /> {roomInfo.phone}
                            </a>
                          )}
                          {ctx.admin && roomInfo.email && (
                            <a href={`mailto:${roomInfo.email}`} style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "8px", background: "rgba(37,226,162,0.08)", color: "#a5e9d3", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              ✉️ {roomInfo.email}
                            </a>
                          )}
                          {ctx.admin && roomInfo.login && !roomInfo.email && (
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
                          {ctx.admin && t?.userId && (
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
                        const bubblePhone = ctx.admin ? (m.userPhone || senderInfo?.phone) : null;
                        const bubbleEmail = ctx.admin ? (m.userEmail || senderInfo?.email) : null;
                        const isEditingThis = editingMessageId === m.id;
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
                              {m.isDeleted && (
                                <div style={{ fontSize: "11px", color: "#ff7b72", background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", padding: "3px 8px", borderRadius: "4px", marginBottom: "6px", fontWeight: 600 }}>
                                  ⚠️ [Yuboruvchi tomonidan o‘chirilgan xabar]
                                </div>
                              )}
                              {m.imageUrl && (
                                <div style={{ marginBottom: m.text && !["📷 Rasm", "🎬 Video"].includes(m.text) ? "8px" : "0" }}>
                                  {m.imageUrl.startsWith("data:video/") || m.imageUrl.endsWith(".mp4") || m.imageUrl.endsWith(".webm") || m.imageUrl.endsWith(".mov") ? (
                                    <video
                                      src={m.imageUrl}
                                      controls
                                      style={{
                                        maxWidth: "100%",
                                        maxHeight: "300px",
                                        borderRadius: "8px",
                                        display: "block",
                                        background: "#000",
                                      }}
                                    />
                                  ) : m.imageUrl.startsWith("data:application/") || m.imageUrl.startsWith("data:text/") || /\.(pdf|docx?|xlsx?|zip|txt)($|\?)/i.test(m.imageUrl) ? (
                                    <a
                                      href={m.imageUrl}
                                      download={m.text?.replace(/^📎 Fayl:\s*/, "") || "biriktirilgan_fayl"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        background: isOwn ? "rgba(4,22,16,0.3)" : "rgba(255,255,255,0.08)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        color: isOwn ? "#041610" : "#eef7f2",
                                        textDecoration: "none",
                                        fontWeight: 600,
                                        fontSize: "13px",
                                      }}
                                    >
                                      <FileText size={22} style={{ color: isOwn ? "#041610" : "#25e2a2", flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {m.text?.replace(/^📎 Fayl:\s*/, "") || "Yuklab olinadigan hujjat"}
                                        </div>
                                        <div style={{ fontSize: "11px", opacity: 0.75, fontWeight: 400 }}>Faylni yuklab olish</div>
                                      </div>
                                      <Download size={16} style={{ flexShrink: 0, opacity: 0.8 }} />
                                    </a>
                                  ) : (
                                    <img
                                      src={m.imageUrl}
                                      alt="Biriktirilgan rasm"
                                      onClick={() => window.open(m.imageUrl, "_blank")}
                                      style={{
                                        maxWidth: "100%",
                                        maxHeight: "280px",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        display: "block",
                                        objectFit: "cover",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                      }}
                                      title="Rasmni to‘liq ko‘rish"
                                    />
                                  )}
                                </div>
                              )}
                              {isEditingThis ? (
                                <div style={{ marginTop: "4px" }}>
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    style={{
                                      width: "100%",
                                      minHeight: "60px",
                                      padding: "8px",
                                      background: "#041610",
                                      color: "#fff",
                                      border: "1px solid #25e2a2",
                                      borderRadius: "6px",
                                      fontSize: "13px",
                                      boxSizing: "border-box",
                                      fontFamily: "inherit",
                                    }}
                                  />
                                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", justifyContent: "flex-end" }}>
                                    <button
                                      type="button"
                                      className="button secondary"
                                      style={{ padding: "2px 8px", fontSize: "12px", minHeight: "28px" }}
                                      onClick={cancelEdit}
                                    >
                                      Bekor qilish
                                    </button>
                                    <button
                                      type="button"
                                      className="button primary"
                                      style={{ padding: "2px 8px", fontSize: "12px", minHeight: "28px" }}
                                      onClick={() => saveEdit(m.id)}
                                    >
                                      Saqlash
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="tg-bubble-text">{m.text}</p>
                              )}
                              <div className="tg-bubble-meta" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
                                {m.isEdited && (
                                  <span style={{ fontSize: "10px", color: isOwn ? "rgba(4,22,16,0.75)" : "#8ea69d", fontStyle: "italic" }}>
                                    (tahrirlangan)
                                  </span>
                                )}
                                <span>{dateTime(m.createdAt).slice(11, 16)}</span>
                                {isOwn && <CheckCheck size={13} />}
                                {(isOwn || ctx.admin) && !m.isDeleted && !isEditingThis && (
                                  <span style={{ display: "inline-flex", gap: "6px", marginLeft: "6px" }}>
                                    {isOwn && (
                                      <button
                                        type="button"
                                        onClick={() => startEdit(m)}
                                        title="Xabarni tahrirlash"
                                        style={{ background: "transparent", border: "none", cursor: "pointer", color: isOwn ? "#041610" : "#8ea69d", padding: "1px 2px", opacity: 0.75 }}
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => deleteMessage(m.id)}
                                      title="Xabarni o‘chirish"
                                      style={{ background: "transparent", border: "none", cursor: "pointer", color: isOwn ? "#800" : "#ff7b72", padding: "1px 2px", opacity: 0.85 }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </span>
                                )}
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
              {attachedMedia && (
                <div style={{ padding: "8px 16px", background: "#0a241a", borderTop: "1px solid #19513e", display: "flex", alignItems: "center", gap: "10px" }}>
                  {attachedMedia.type === "image" ? (
                    <img
                      src={attachedMedia.url}
                      alt="Biriktirilgan rasm"
                      style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", border: "1px solid #25e2a2" }}
                    />
                  ) : attachedMedia.type === "video" ? (
                    <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "rgba(56,189,248,0.2)", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                      <Video size={20} />
                    </div>
                  ) : (
                    <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "rgba(251,191,36,0.2)", border: "1px solid #fbbf24", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
                      <FileText size={20} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", color: "#66e1b9", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {attachedMedia.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#8ea69d" }}>
                      {attachedMedia.type === "image" ? "Rasm biriktirildi" : attachedMedia.type === "video" ? `Video (${attachedMedia.sizeText || ""})` : `Hujjat / Fayl (${attachedMedia.sizeText || ""})`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedMedia(null)}
                    style={{ background: "transparent", border: "none", color: "#ff7b72", cursor: "pointer", padding: "4px" }}
                    title="Birikmani olib tashlash"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <form className="tg-composer" onSubmit={handleSend} style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleImageSelect}
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/mp4,video/webm,video/quicktime"
                  style={{ display: "none" }}
                  onChange={handleVideoSelect}
                />
                <input
                  type="file"
                  ref={docInputRef}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  style={{ display: "none" }}
                  onChange={handleDocSelect}
                />

                {/* Telegram-style + button and popup */}
                <div ref={attachMenuRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    title="Biriktirish (+)"
                    disabled={sending || t?.status === "RESOLVED" || t?.status === "CLOSED"}
                    onClick={() => setAttachMenuOpen((v) => !v)}
                    style={{
                      background: attachMenuOpen || attachedMedia ? "rgba(37,226,162,0.2)" : "transparent",
                      border: "1px solid",
                      borderColor: attachMenuOpen || attachedMedia ? "#25e2a2" : "rgba(255,255,255,0.12)",
                      borderRadius: "50%",
                      width: "36px",
                      height: "36px",
                      color: attachMenuOpen || attachedMedia ? "#25e2a2" : "#8ea69d",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: attachMenuOpen ? "rotate(45deg)" : "none",
                    }}
                  >
                    <Plus size={20} />
                  </button>

                  {attachMenuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "46px",
                        left: "0",
                        background: "#072017",
                        border: "1px solid #1c523f",
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 15px rgba(37,226,162,0.12)",
                        padding: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        minWidth: "175px",
                        zIndex: 60,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAttachMenuOpen(false);
                          imageInputRef.current?.click();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 12px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          color: "#eef7f2",
                          fontSize: "13px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37,226,162,0.14)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ color: "#25e2a2", display: "flex" }}><ImageIcon size={17} /></span>
                        <span>📷 Rasm</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAttachMenuOpen(false);
                          videoInputRef.current?.click();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 12px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          color: "#eef7f2",
                          fontSize: "13px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37,226,162,0.14)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ color: "#38bdf8", display: "flex" }}><Video size={17} /></span>
                        <span>🎬 Video</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAttachMenuOpen(false);
                          docInputRef.current?.click();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 12px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          color: "#eef7f2",
                          fontSize: "13px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37,226,162,0.14)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ color: "#fbbf24", display: "flex" }}><Paperclip size={17} /></span>
                        <span>📎 Fayl / Hujjat</span>
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  className="tg-composer-input"
                  placeholder={attachedMedia ? "Izoh yozing (ixtiyoriy)..." : "Xabar yozing..."}
                  value={replyText}
                  disabled={sending || t?.status === "RESOLVED" || t?.status === "CLOSED"}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  className="tg-composer-send"
                  disabled={(!replyText.trim() && !attachedMedia) || sending || t?.status === "RESOLVED" || t?.status === "CLOSED"}
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

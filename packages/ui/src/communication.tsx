"use client";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Bell,
  Building2,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit2,
  FileText,
  Image as ImageIcon,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Smartphone,
  SquarePen,
  Star,
  Trash2,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { api, toMinor } from "@sihhat/api-client";
import { AuthHistoryPanel } from "./auth-history";
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
const ANNOUNCEMENT_TEMPLATES = [
  {
    id: "users-promo",
    label: "📱 Users: Mavsumiy chegirma va yo‘llanmalar",
    target: "CUSTOMERS" as const,
    kind: "MESSAGE" as const,
    title: "Sihhat.uz ilovasida yangi mavsumiy yo‘llanmalar va chegirmalar!",
    body: "Hurmatli foydalanuvchi! O‘zbekistonning eng sara sanatoriyalariga onlayn bron qilish 0% komissiya bilan ochiq. Bo‘sh xonalar, davolash yo‘nalishlari va oilaviy yoki 1 kishilik joylarni ilova orqali tanlab band qilishingiz mumkin.",
  },
  {
    id: "partners-update",
    label: "🏥 Hamkorlar: Shaxmatka va tariflarni yangilash",
    target: "PARTNERS" as const,
    kind: "MESSAGE" as const,
    title: "Bo‘sh xonalar (Shaxmatka) va mavsumiy tariflarni yangilash bo‘yicha",
    body: "Hurmatli hamkor sanatoriya rahbariyati va resepshn xodimlari! Onlayn bronlar uzluksiz ishlashi uchun «Xonalar va tariflar» bo‘limidagi bandlik kalendari (Shaxmatka) hamda amaldagi narxlarni doimiy yangilab borishingizni so‘raymiz.",
  },
  {
    id: "system-warning",
    label: "⚠️ Muhim ogohlantirish: Tizim va xizmat intizomi",
    target: "ALL" as const,
    kind: "WARNING" as const,
    title: "Muhim: Tasdiqlangan bronlar va mehmonlarni qabul qilish tartibi",
    body: "Diqqat! Tasdiqlangan onlayn bronlar bo‘yicha mehmonlar kelganda QR-vaucher yoki bron raqami (#SH-...) orqali darhol joylashtirilishi (Check-in) va E-mehmon anketasi rasmiylashtirilishi shart.",
  },
  {
    id: "all-release",
    label: "🌐 Barchaga: Yangi imkoniyatlar ishga tushirildi",
    target: "ALL" as const,
    kind: "MESSAGE" as const,
    title: "Sihhat.uz platformasida yangi qulay funksiyalar ishga tushirildi",
    body: "Platformamizda davolash yo‘nalishlari bo‘yicha saralash, sherikli (koyka-o‘rin) yoki butun xona bron qilish, kunlik muolaja tartibi va tezkor jonli chat imkoniyatlari yangilandi.",
  },
];

function formatPublicIdChip(publicId?: number | null, fallbackId?: string | null): string {
  if (typeof publicId === "number" && publicId > 0) return `#${publicId}`;
  if (fallbackId && fallbackId.length >= 6) return `#${fallbackId.slice(0, 6).toUpperCase()}`;
  return "#------";
}

function AnnouncementsAndMessagesCenter({ embedded = false }: { embedded?: boolean }) {
  const ctx = usePortal();
  const canSend = ctx.admin || ctx.allowed("messages.send");
  const [activeTab, setActiveTab] = useState<"sent" | "inbox">(
    ctx.admin || canSend ? "sent" : "inbox",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<"ALL_FILTER" | "ALL" | "CUSTOMERS" | "PARTNERS">("ALL_FILTER");
  const [kindFilter, setKindFilter] = useState<"ALL_KIND" | "MESSAGE" | "WARNING">("ALL_KIND");

  // Compose Modal state
  const [composeOpen, setComposeOpen] = useState(false);
  const [target, setTarget] = useState<"ALL" | "CUSTOMERS" | "PARTNERS">(
    ctx.admin ? "ALL" : "PARTNERS",
  );
  const [customerMode, setCustomerMode] = useState<"ALL_CUSTOMERS" | "SELECTED_CUSTOMERS">("ALL_CUSTOMERS");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  const [partnerTargetMode, setPartnerTargetMode] = useState<"TEAM" | "SUPERADMIN">("TEAM");
  const [selectedSanatoriumIds, setSelectedSanatoriumIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState("");

  const [msgKind, setMsgKind] = useState<"MESSAGE" | "WARNING">("MESSAGE");
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeError, setComposeError] = useState("");

  // Delivery Inspector & Verification state
  const [inspectRow, setInspectRow] = useState<Row | null>(null);
  const [inspectTab, setInspectTab] = useState<"ALL" | "CUSTOMERS" | "PARTNERS">("ALL");
  const [inspectReadFilter, setInspectReadFilter] = useState<"ALL" | "READ" | "UNREAD">("ALL");
  const [inspectSearch, setInspectSearch] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [lastVerifySummary, setLastVerifySummary] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAllInbox, setMarkingAllInbox] = useState(false);

  const sentRemote = useRemote(
    canSend ? "/messages?box=sent&limit=50" : null,
    ctx.epoch,
  );
  const inboxRemote = useRemote("/messages?box=inbox&limit=50", ctx.epoch);
  const audienceRemote = useRemote("/support/recipients", ctx.epoch);

  const sentRows = list(sentRemote.data);
  const inboxRows = list(inboxRemote.data);
  const unreadInboxCount = inboxRows.filter((r) => !r.readAt).length;

  const allCustomers: Row[] = audienceRemote.data?.customers ?? [];
  const allStaff: Row[] = audienceRemote.data?.staff ?? [];
  const allSanatoriums: Row[] = audienceRemote.data?.sanatoriums ?? ctx.tenants ?? [];
  const allSuperadmins: Row[] = audienceRemote.data?.superadmins ?? [];

  const ownSanatoriumStaff = allStaff.filter(
    (s) => !ctx.tenant || s.sanatoriumId === ctx.tenant,
  );

  const totalCustomersCount =
    audienceRemote.data?.counts?.totalCustomers ?? allCustomers.length;
  const totalPartnersCount =
    audienceRemote.data?.counts?.totalPartners ??
    new Set(allStaff.map((s) => s.id)).size;
  const totalSanatoriumsCount =
    audienceRemote.data?.counts?.totalSanatoriums ?? allSanatoriums.length;

  // Aggregate Delivery KPIs across sent messages
  let aggCustomerTarget = 0;
  let aggCustomerDelivered = 0;
  let aggCustomerRead = 0;
  let aggPartnerTarget = 0;
  let aggPartnerDelivered = 0;
  let aggPartnerRead = 0;
  let aggPartnerAccepted = 0;
  let aggWarnings = 0;

  for (const r of sentRows) {
    const m = r.message ?? r;
    if (m?.kind === "WARNING") aggWarnings++;
    const cs = r.customerStats;
    const ps = r.partnerStats;
    if (cs) {
      aggCustomerTarget += Number(cs.total || 0);
      aggCustomerDelivered += Number(cs.delivered || 0);
      aggCustomerRead += Number(cs.read || 0);
    }
    if (ps) {
      aggPartnerTarget += Number(ps.total || 0);
      aggPartnerDelivered += Number(ps.delivered || 0);
      aggPartnerRead += Number(ps.read || 0);
      aggPartnerAccepted += Number(ps.accepted || 0);
    }
  }

  // Keep inspectRow in sync when sentRemote reloads
  useEffect(() => {
    if (!inspectRow) return;
    const updated = sentRows.find((r) => r.id === inspectRow.id);
    if (updated) setInspectRow(updated);
  }, [sentRemote.data]);

  const openComposeModal = () => {
    setTarget(ctx.admin ? "ALL" : "PARTNERS");
    setCustomerMode("ALL_CUSTOMERS");
    setSelectedCustomerIds([]);
    setCustomerSearch("");
    setPartnerTargetMode("TEAM");
    setSelectedSanatoriumIds([]);
    setSelectedRoles([]);
    setSelectedStaffIds([]);
    setStaffSearch("");
    setMsgKind("MESSAGE");
    setMsgTitle("");
    setMsgBody("");
    setComposeError("");
    setComposeOpen(true);
  };

  const applyTemplate = (tpl: (typeof ANNOUNCEMENT_TEMPLATES)[number]) => {
    if (ctx.admin) {
      setTarget(tpl.target);
    }
    setMsgKind(tpl.kind);
    setMsgTitle(tpl.title);
    setMsgBody(tpl.body);
    setComposeError("");
  };

  // Calculate live recipient estimate in Compose modal
  const estimatedRecipients = (() => {
    if (!ctx.admin) {
      if (partnerTargetMode === "SUPERADMIN") {
        return {
          customers: 0,
          partners: Math.max(1, allSuperadmins.length),
          total: Math.max(1, allSuperadmins.length),
          label: "Platforma Superadmini",
        };
      }
      const staffPool = ownSanatoriumStaff.filter((s) => s.id !== ctx.actor.id);
      const count = selectedStaffIds.length
        ? selectedStaffIds.length
        : staffPool.length;
      return {
        customers: 0,
        partners: count,
        total: count,
        label: `${count} ta sanatoriya xodimi`,
      };
    }

    let custCount = 0;
    let partCount = 0;

    if (target === "CUSTOMERS" || target === "ALL") {
      custCount =
        target === "CUSTOMERS" && customerMode === "SELECTED_CUSTOMERS"
          ? selectedCustomerIds.length
          : totalCustomersCount;
    }

    if (target === "PARTNERS" || target === "ALL") {
      if (target === "PARTNERS" && selectedStaffIds.length > 0) {
        partCount = selectedStaffIds.length;
      } else {
        const filteredStaff = allStaff.filter((s) => {
          const sanOk =
            !selectedSanatoriumIds.length ||
            selectedSanatoriumIds.includes(s.sanatoriumId);
          const roleOk =
            !selectedRoles.length || selectedRoles.includes(s.role);
          return sanOk && roleOk;
        });
        const uniqueStaffIds = new Set(filteredStaff.map((s) => s.id));
        partCount =
          !selectedSanatoriumIds.length && !selectedRoles.length
            ? Math.max(uniqueStaffIds.size, totalPartnersCount)
            : uniqueStaffIds.size;
      }
    }

    return {
      customers: custCount,
      partners: partCount,
      total: custCount + partCount,
      label: `📱 ${custCount} ta foydalanuvchi + 🏥 ${partCount} ta hamkor`,
    };
  })();

  const handleVerifySingle = async (messageId: string, silent = false) => {
    if (!messageId || verifyingId) return null;
    setVerifyingId(messageId);
    try {
      const res = await api<any>(`/messages/${messageId}/verify-delivery`, "POST", {});
      const summary = `API tasdiqladi: Usersga ${res.customers?.deliveredInApp ?? 0}/${res.customers?.total ?? 0} ta (o‘qildi: ${res.customers?.read ?? 0}), Hamkorlarga ${res.partners?.deliveredInApp ?? 0}/${res.partners?.total ?? 0} ta (o‘qildi: ${res.partners?.read ?? 0}, tasdiqladi: ${res.partners?.accepted ?? 0})${res.repairedDeliveries ? ` · ${res.repairedDeliveries} ta yetkazilish tiklandi` : ""}`;
      setLastVerifySummary(summary);
      if (!silent) ctx.notice(summary);
      sentRemote.reload();
      inboxRemote.reload();
      return res;
    } catch (err: any) {
      if (!silent) ctx.notice(err?.message || "Yetkazilishni tekshirishda xatolik");
      return null;
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAll = async () => {
    if (verifyingAll) return;
    setVerifyingAll(true);
    try {
      let checked = 0;
      let repaired = 0;
      let custDeliv = 0;
      let partDeliv = 0;
      for (const row of sentRows.slice(0, 15)) {
        const mid = row.messageId || row.id;
        if (!mid) continue;
        const res = await api<any>(`/messages/${mid}/verify-delivery`, "POST", {}).catch(() => null);
        if (res) {
          checked++;
          repaired += Number(res.repairedDeliveries || 0);
          custDeliv += Number(res.customers?.deliveredInApp || 0);
          partDeliv += Number(res.partners?.deliveredInApp || 0);
        }
      }
      sentRemote.reload();
      inboxRemote.reload();
      const msg = checked
        ? `✅ ${checked} ta e’lon API orqali tekshirildi: Usersga ${custDeliv} ta, Hamkorlarga ${partDeliv} ta bildirishnoma yetkazilgan${repaired ? ` (${repaired} ta tiklandi)` : " (100% sinxron)"}.`
        : "Tekshirish uchun yuborilgan e’lonlar topilmadi.";
      setLastVerifySummary(msg);
      ctx.notice(msg);
    } finally {
      setVerifyingAll(false);
    }
  };

  const handleSubmitCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (composeBusy) return;
    const cleanTitle = msgTitle.trim();
    const cleanBody = msgBody.trim();
    if (cleanTitle.length < 2) {
      setComposeError("Sarlavha kamida 2 ta belgidan iborat bo‘lishi kerak.");
      return;
    }
    if (!cleanBody) {
      setComposeError("E’lon yoki xabar matnini kiriting.");
      return;
    }

    setComposeBusy(true);
    setComposeError("");
    try {
      let created: any = null;
      if (ctx.admin) {
        if (target === "CUSTOMERS" && customerMode === "SELECTED_CUSTOMERS" && !selectedCustomerIds.length) {
          setComposeError("Iltimos, kamida 1 ta foydalanuvchini belgilang yoki «Barcha faol foydalanuvchilarga» rejimini tanlang.");
          setComposeBusy(false);
          return;
        }
        const payload: Record<string, any> = {
          target,
          title: cleanTitle,
          body: cleanBody,
          kind: msgKind,
        };
        if (target === "CUSTOMERS" && customerMode === "SELECTED_CUSTOMERS") {
          payload.recipient_ids = selectedCustomerIds;
        } else if (target === "PARTNERS") {
          if (selectedStaffIds.length > 0) {
            payload.recipient_ids = selectedStaffIds;
          } else {
            if (selectedSanatoriumIds.length > 0) {
              payload.sanatorium_ids = selectedSanatoriumIds;
            }
            if (selectedRoles.length > 0) {
              payload.roles = selectedRoles;
            }
          }
        } else if (target === "ALL") {
          if (selectedSanatoriumIds.length > 0) {
            payload.sanatorium_ids = selectedSanatoriumIds;
          }
          if (selectedRoles.length > 0) {
            payload.roles = selectedRoles;
          }
        }
        created = await api("/superadmin/announcements", "POST", payload);
      } else {
        let recipientIds: string[] = [];
        if (partnerTargetMode === "SUPERADMIN") {
          recipientIds = allSuperadmins.map((a) => a.id).filter(Boolean);
        } else {
          const pool = ownSanatoriumStaff
            .filter((s) => s.id !== ctx.actor.id)
            .map((s) => s.id);
          recipientIds = selectedStaffIds.length
            ? selectedStaffIds
            : [...new Set(pool)];
        }
        if (!recipientIds.length) {
          setComposeError("Qabul qiluvchi xodimlar topilmadi.");
          setComposeBusy(false);
          return;
        }
        created = await api("/messages", "POST", {
          title: cleanTitle,
          body: cleanBody,
          kind: msgKind,
          recipient_ids: [...new Set(recipientIds)],
        });
      }

      setComposeOpen(false);
      setActiveTab("sent");
      if (created?.id) {
        const verified = await handleVerifySingle(created.id, true);
        if (verified) {
          const summary = `✅ E’lon yuborildi! Usersga: ${verified.customers?.deliveredInApp ?? 0} ta, Hamkorlarga: ${verified.partners?.deliveredInApp ?? 0} ta yetkazildi.`;
          setLastVerifySummary(summary);
          ctx.notice(summary);
        } else {
          ctx.notice("E’lon muvaffaqiyatli yuborildi");
        }
      } else {
        ctx.notice("E’lon muvaffaqiyatli yuborildi");
      }
      sentRemote.reload();
      inboxRemote.reload();
      ctx.refresh();
    } catch (err: any) {
      setComposeError(err?.message || "E’lon yuborishda xatolik yuz berdi.");
    } finally {
      setComposeBusy(false);
    }
  };

  const handleDeleteMessage = async (row: Row) => {
    const mid = row.messageId || row.id;
    const title = row.message?.title ?? row.title ?? "E’lon";
    if (!mid || deletingId) return;
    if (!window.confirm(`«${title}» e’lonini o‘chirmoqchimisiz?`)) return;
    setDeletingId(mid);
    try {
      await api(`/messages/${mid}`, "DELETE");
      if (inspectRow && (inspectRow.id === mid || inspectRow.messageId === mid)) {
        setInspectRow(null);
      }
      ctx.notice("E’lon o‘chirildi");
      sentRemote.reload();
      inboxRemote.reload();
    } catch (err: any) {
      ctx.notice(err?.message || "O‘chirishda xatolik");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkInboxReceipt = async (row: Row, accepted: boolean) => {
    const mid = row.messageId || row.message?.id || row.id;
    if (!mid || markingId) return;
    setMarkingId(mid);
    try {
      await api(`/messages/${mid}/receipt`, "POST", { accepted });
      ctx.notice(
        accepted
          ? "E’lon qabul qilindi va tasdiqlandi"
          : "E’lon o‘qilgan deb belgilandi",
      );
      inboxRemote.reload();
      sentRemote.reload();
      ctx.refresh();
    } catch (err: any) {
      ctx.notice(err?.message || "Holatni yangilashda xatolik");
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllInboxRead = async () => {
    if (markingAllInbox || !unreadInboxCount) return;
    setMarkingAllInbox(true);
    try {
      await api("/notifications/read-all", "POST", {});
      for (const r of inboxRows.filter((item) => !item.readAt)) {
        const mid = r.messageId || r.message?.id;
        if (mid) {
          await api(`/messages/${mid}/receipt`, "POST", { accepted: false }).catch(() => {});
        }
      }
      ctx.notice("Barcha kiruvchi e’lon va xabarlar o‘qilgan deb belgilandi");
      inboxRemote.reload();
      sentRemote.reload();
      ctx.refresh();
    } finally {
      setMarkingAllInbox(false);
    }
  };

  const filteredSentRows = sentRows.filter((r) => {
    const m = r.message ?? r;
    if (audienceFilter !== "ALL_FILTER" && r.targetAudience !== audienceFilter) {
      return false;
    }
    if (kindFilter !== "ALL_KIND" && m?.kind !== kindFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = (m?.title ?? "").toLowerCase().includes(q);
      const inBody = (m?.body ?? "").toLowerCase().includes(q);
      const inRecipients = Array.isArray(r.recipients)
        ? r.recipients.some(
            (rec: Row) =>
              (rec.name ?? "").toLowerCase().includes(q) ||
              (rec.phone ?? "").toLowerCase().includes(q) ||
              (rec.sanatoriumName ?? "").toLowerCase().includes(q) ||
              String(rec.publicId ?? "").includes(q),
          )
        : false;
      return inTitle || inBody || inRecipients;
    }
    return true;
  });

  const filteredInboxRows = inboxRows.filter((r) => {
    const m = r.message ?? r;
    if (kindFilter !== "ALL_KIND" && m?.kind !== kindFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (m?.title ?? "").toLowerCase().includes(q) ||
        (m?.body ?? "").toLowerCase().includes(q) ||
        (r.sender?.name ?? "").toLowerCase().includes(q) ||
        (r.sender?.sanatoriumName ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const audienceBadge = (targetAud?: string) => {
    if (targetAud === "ALL") {
      return (
        <span className="badge green" title="Ham Users (ilova mijozlari), ham Hamkorlarga yuborilgan">
          🌐 Butun tizim (Users + Hamkorlar)
        </span>
      );
    }
    if (targetAud === "CUSTOMERS") {
      return (
        <span className="badge blue" title="Ilova foydalanuvchilariga (mijozlarga) yuborilgan">
          📱 Foydalanuvchilarga (Users)
        </span>
      );
    }
    if (targetAud === "PARTNERS") {
      return (
        <span className="badge green" title="Sanatoriya rahbarlari va xodimlariga yuborilgan">
          🏥 Hamkorlarga (Sanatoriyalar)
        </span>
      );
    }
    return <span className="badge gray">Qabul qiluvchisiz</span>;
  };

  return (
    <>
      {!embedded && (
        <PageHeading
          title="E’lonlar va xabarlar"
          subtitle="Ilova foydalanuvchilari (Users) va hamkor sanatoriyalarga tezkor e’lon yuborish hamda API yetkazilish nazorati."
        >
          {canSend && (
            <button
              type="button"
              className="button secondary"
              disabled={verifyingAll || sentRows.length === 0}
              onClick={handleVerifyAll}
              title="Yuborilgan xabarlar Users va Hamkorlarga borganini API orqali tekshirish"
            >
              <CheckCheck size={16} />
              {verifyingAll ? "Tekshirilmoqda..." : "API yetkazilishni tekshirish"}
            </button>
          )}
          {canSend && (
            <AddButton onClick={openComposeModal}>
              {ctx.admin ? "Yangi e’lon berish" : "Xabar yuborish"}
            </AddButton>
          )}
        </PageHeading>
      )}

      {/* 4 Live Control & Delivery KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div
          className="card"
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              📢 E’lonlar va xabarlar
            </span>
            <Megaphone size={17} style={{ color: "var(--green)" }} />
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)" }}>
            {canSend ? `${sentRows.length} ta yuborilgan` : `${inboxRows.length} ta kiruvchi`}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span>📥 Kiruvchi: <strong>{inboxRows.length}</strong> ({unreadInboxCount} yangi)</span>
            {canSend && <span>· ⚠️ Ogohlantirish: <strong>{aggWarnings}</strong></span>}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              📱 Users (Ilova mijozlari)
            </span>
            <Smartphone size={17} style={{ color: "var(--green)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)" }}>
              {aggCustomerDelivered} / {aggCustomerTarget}
            </span>
            <span className="badge green" style={{ fontSize: "11px" }}>
              {aggCustomerTarget > 0
                ? `${Math.round((aggCustomerDelivered / aggCustomerTarget) * 100)}% bordi`
                : `${totalCustomersCount} faol user`}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            Faol users: <strong>{totalCustomersCount} ta</strong> · O‘qilgan: <strong>{aggCustomerRead} ta</strong>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              🏥 Hamkorlar (Sanatoriyalar)
            </span>
            <Building2 size={17} style={{ color: "var(--green)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)" }}>
              {aggPartnerDelivered} / {aggPartnerTarget}
            </span>
            <span className="badge green" style={{ fontSize: "11px" }}>
              {aggPartnerTarget > 0
                ? `${Math.round((aggPartnerDelivered / aggPartnerTarget) * 100)}% bordi`
                : `${totalPartnersCount} faol xodim`}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {totalSanatoriumsCount} sanatoriya ({totalPartnersCount} xodim) · O‘qildi: <strong>{aggPartnerRead}</strong> · Qabul: <strong>{aggPartnerAccepted}</strong>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              🛡️ API Yetkazish Nazorati
            </span>
            <span className="badge green" style={{ fontSize: "11px" }}>IN_APP · TG Sinxron</span>
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--ink)", fontWeight: 600, lineHeight: 1.35 }}>
            {lastVerifySummary || "Har bir e’lon 0 ms kechikish bilan Users (/notifications) va Hamkorlarga yetkaziladi."}
          </div>
          {canSend && (
            <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
              <button
                type="button"
                className="button soft"
                style={{ fontSize: "12px", padding: "4px 10px", minHeight: "28px" }}
                disabled={verifyingAll || sentRows.length === 0}
                onClick={handleVerifyAll}
              >
                {verifyingAll ? "Tekshirilmoqda..." : "🔄 API qayta tekshirish"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs + Search + Filters + Action Buttons */}
      <div
        className="card"
        style={{
          padding: "14px 16px",
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div className="tabs" style={{ marginBottom: 0 }}>
            {canSend && (
              <button
                type="button"
                className={`tab ${activeTab === "sent" ? "active" : ""}`}
                onClick={() => setActiveTab("sent")}
              >
                📤 Yuborilgan e’lonlar ({sentRows.length})
              </button>
            )}
            <button
              type="button"
              className={`tab ${activeTab === "inbox" ? "active" : ""}`}
              onClick={() => setActiveTab("inbox")}
            >
              📥 Kiruvchi xabarlar ({inboxRows.length})
              {unreadInboxCount > 0 && (
                <span
                  className="badge blue"
                  style={{ marginLeft: "6px", padding: "1px 7px", fontSize: "11px" }}
                >
                  {unreadInboxCount} yangi
                </span>
              )}
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {activeTab === "inbox" && unreadInboxCount > 0 && (
              <button
                type="button"
                className="button secondary"
                disabled={markingAllInbox}
                onClick={handleMarkAllInboxRead}
              >
                <CheckCheck size={16} />
                {markingAllInbox ? "Belgilanmoqda..." : "Barchasini o‘qilgan deb belgilash"}
              </button>
            )}
            {embedded && canSend && (
              <>
                <button
                  type="button"
                  className="button secondary"
                  disabled={verifyingAll || sentRows.length === 0}
                  onClick={handleVerifyAll}
                >
                  <CheckCheck size={16} />
                  {verifyingAll ? "Tekshirilmoqda..." : "API tekshirish"}
                </button>
                <AddButton onClick={openComposeModal}>
                  {ctx.admin ? "Yangi e’lon berish" : "Xabar yuborish"}
                </AddButton>
              </>
            )}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="search"
              placeholder="Sarlavha, matn, mijoz yoki sanatoriya qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--soft)",
                color: "var(--ink)",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {activeTab === "sent" && (
            <select
              aria-label="Auditoriya filtri"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value as any)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--soft)",
                color: "var(--ink)",
                fontSize: "13px",
              }}
            >
              <option value="ALL_FILTER">👥 Barcha auditoriyalar</option>
              <option value="ALL">🌐 Butun tizim (Users + Hamkorlar)</option>
              <option value="CUSTOMERS">📱 Faqat Users (Foydalanuvchilar)</option>
              <option value="PARTNERS">🏥 Faqat Hamkorlar (Sanatoriyalar)</option>
            </select>
          )}

          <select
            aria-label="Xabar turi filtri"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as any)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: "var(--soft)",
              color: "var(--ink)",
              fontSize: "13px",
            }}
          >
            <option value="ALL_KIND">📋 Barcha turlar</option>
            <option value="MESSAGE">📢 Axborot e’loni / Xabar</option>
            <option value="WARNING">⚠️ Muhim ogohlantirish</option>
          </select>
        </div>
      </div>

      {/* Main Message List */}
      {activeTab === "sent" && canSend ? (
        sentRemote.loading ? (
          <Loading />
        ) : sentRemote.error ? (
          <ErrorBox message={sentRemote.error} retry={sentRemote.reload} />
        ) : filteredSentRows.length === 0 ? (
          <Card title="Yuborilgan e’lonlar va xabarlar">
            <Empty
              text={
                searchQuery || audienceFilter !== "ALL_FILTER" || kindFilter !== "ALL_KIND"
                  ? "Filtr bo‘yicha e’lon topilmadi"
                  : "Hozircha yuborilgan e’lonlar yo‘q"
              }
            />
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredSentRows.map((r) => {
              const m = r.message ?? r;
              const cs = r.customerStats ?? { total: 0, delivered: 0, read: 0 };
              const ps = r.partnerStats ?? {
                total: 0,
                delivered: 0,
                telegramSent: 0,
                read: 0,
                accepted: 0,
                sanatoriums: [],
              };
              const isVerifying = verifyingId === (r.messageId || r.id);
              const isDeleting = deletingId === (r.messageId || r.id);

              return (
                <article
                  key={r.id}
                  className="card"
                  style={{
                    padding: "16px 18px",
                    borderLeft:
                      m?.kind === "WARNING"
                        ? "4px solid #f59e0b"
                        : "4px solid var(--green)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {/* Top Header */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span className={`badge ${m?.kind === "WARNING" ? "amber" : "green"}`}>
                          {m?.kind === "WARNING" ? "⚠️ Muhim ogohlantirish" : "📢 E’lon / Xabar"}
                        </span>
                        {audienceBadge(r.targetAudience)}
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          🕒 {dateTime(r.createdAt || m?.createdAt)}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                        {m?.title}
                      </h3>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className="button soft"
                        onClick={() => {
                          setInspectRow(r);
                          setInspectTab("ALL");
                          setInspectReadFilter("ALL");
                          setInspectSearch("");
                        }}
                      >
                        <Users size={15} />
                        <span>Kimga bordi ({r.recipientCount ?? 0})</span>
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={isVerifying}
                        onClick={() => handleVerifySingle(r.messageId || r.id)}
                        title="Users va Hamkorlarga yetkazilganini API orqali tekshirish"
                      >
                        <CheckCircle2 size={15} />
                        <span>{isVerifying ? "Tekshirilmoqda..." : "Tekshirish"}</span>
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={isDeleting}
                        onClick={() => handleDeleteMessage(r)}
                        style={{ color: "#ef4444" }}
                        title="E’lonni o‘chirish"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "var(--soft)",
                      border: "1px solid var(--line)",
                      fontSize: "13.5px",
                      lineHeight: 1.55,
                      color: "var(--ink)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m?.body}
                  </div>

                  {/* Delivery Breakdown Boxes: Users vs Partners */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {/* Users (Customers) Delivery Status Box */}
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid var(--line)",
                        background: cs.total > 0 ? "var(--green-light)" : "var(--soft)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "12.5px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Smartphone size={15} style={{ color: "var(--green)" }} />
                          📱 Users (Ilova foydalanuvchilari)
                        </strong>
                        {cs.total > 0 ? (
                          <span className="badge green" style={{ fontSize: "11px" }}>
                            ✅ {cs.delivered}/{cs.total} ta yetkazildi
                          </span>
                        ) : (
                          <span className="badge gray" style={{ fontSize: "11px" }}>
                            Tanlanmagan
                          </span>
                        )}
                      </div>
                      {cs.total > 0 ? (
                        <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                          <span>Ilovaga bordi (IN_APP): <strong>{cs.delivered} ta</strong></span>
                          <span>👁️ O‘qidi: <strong>{cs.read} ta ({Math.round((cs.read / cs.total) * 100)}%)</strong></span>
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          Bu xabar faqat hamkor sanatoriyalarga yo‘naltirilgan.
                        </div>
                      )}
                    </div>

                    {/* Partners (Sanatorium Staff) Delivery Status Box */}
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid var(--line)",
                        background: ps.total > 0 ? "var(--green-light)" : "var(--soft)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "12.5px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Building2 size={15} style={{ color: "var(--green)" }} />
                          🏥 Hamkorlar (Sanatoriya xodimlari)
                        </strong>
                        {ps.total > 0 ? (
                          <span className="badge green" style={{ fontSize: "11px" }}>
                            ✅ {ps.delivered}/{ps.total} ta yetkazildi
                          </span>
                        ) : (
                          <span className="badge gray" style={{ fontSize: "11px" }}>
                            Tanlanmagan
                          </span>
                        )}
                      </div>
                      {ps.total > 0 ? (
                        <>
                          <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                            <span>Panelga bordi: <strong>{ps.delivered} ta</strong></span>
                            <span>👁️ O‘qidi: <strong>{ps.read} ta</strong></span>
                            <span>✅ Tasdiqladi: <strong>{ps.accepted} ta</strong></span>
                            {ps.telegramSent > 0 && <span>🤖 Telegram: <strong>{ps.telegramSent} ta</strong></span>}
                          </div>
                          {Array.isArray(ps.sanatoriums) && ps.sanatoriums.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                              {ps.sanatoriums.map((san: Row) => (
                                <span
                                  key={san.id}
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    background: "var(--surface)",
                                    border: "1px solid var(--line)",
                                    color: "var(--ink)",
                                  }}
                                >
                                  🏥 {san.name}: {san.read}/{san.total} o‘qildi
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          Bu xabar faqat ilova foydalanuvchilariga yo‘naltirilgan.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* INBOX TAB */
        inboxRemote.loading ? (
          <Loading />
        ) : inboxRemote.error ? (
          <ErrorBox message={inboxRemote.error} retry={inboxRemote.reload} />
        ) : filteredInboxRows.length === 0 ? (
          <Card title="Sizga yuborilgan e’lonlar va xabarlar">
            <Empty
              text={
                searchQuery || kindFilter !== "ALL_KIND"
                  ? "Filtr bo‘yicha kiruvchi xabar topilmadi"
                  : "Sizga yuborilgan e’lonlar hozircha yo‘q"
              }
            />
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredInboxRows.map((r) => {
              const m = r.message ?? r;
              const mid = r.messageId || m?.id || r.id;
              const isBusy = markingId === mid;
              return (
                <article
                  key={r.id}
                  className="card"
                  style={{
                    padding: "16px 18px",
                    borderLeft:
                      m?.kind === "WARNING"
                        ? "4px solid #f59e0b"
                        : !r.readAt
                          ? "4px solid #0284c7"
                          : "4px solid var(--green)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span
                          className={`badge ${
                            r.acceptedAt
                              ? "green"
                              : m?.kind === "WARNING"
                                ? "amber"
                                : r.readAt
                                  ? "gray"
                                  : "blue"
                          }`}
                        >
                          {r.acceptedAt
                            ? "✅ Tanishildi / Qabul qilindi"
                            : m?.kind === "WARNING"
                              ? "⚠️ Muhim ogohlantirish"
                              : r.readAt
                                ? "👁️ O‘qilgan"
                                : "🆕 Yangi e’lon"}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                          {r.sender?.kind === "SUPERADMIN"
                            ? "🛡️ Sihhat.uz Platforma Ma’muriyati"
                            : `🏥 ${r.sender?.name || "Ma’muriyat"}${r.sender?.sanatoriumName ? ` (${r.sender.sanatoriumName})` : ""}`}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          · 🕒 {dateTime(r.createdAt || m?.createdAt)}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                        {m?.title}
                      </h3>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {!r.readAt && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={isBusy}
                          onClick={() => handleMarkInboxReceipt(r, false)}
                        >
                          <Check size={15} />
                          <span>O‘qilgan deb belgilash</span>
                        </button>
                      )}
                      {!r.acceptedAt && (
                        <button
                          type="button"
                          className="button primary"
                          disabled={isBusy}
                          onClick={() => handleMarkInboxReceipt(r, true)}
                        >
                          <CheckCheck size={15} />
                          <span>{isBusy ? "Saqlanmoqda..." : "Tanishdim / Qabul qildim"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "var(--soft)",
                      border: "1px solid var(--line)",
                      fontSize: "13.5px",
                      lineHeight: 1.55,
                      color: "var(--ink)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m?.body}
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <span>
                      Holati: {r.readAt ? `Ko‘rilgan (${dateTime(r.readAt)})` : "Hali o‘qilmagan"}
                    </span>
                    <span>·</span>
                    <span>
                      Tasdiq: {r.acceptedAt ? `Qabul qilingan (${dateTime(r.acceptedAt)})` : "Tasdiqlanmagan"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {/* DELIVERY INSPECTOR MODAL ("Kimga bordi va kim o'qidi") */}
      {inspectRow && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1100 }}
          onClick={() => setInspectRow(null)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{
              maxWidth: "820px",
              width: "96%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-heading"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--ink)" }}>
                  📊 Yetkazilish va o‘qilish nazorati: «{inspectRow.message?.title ?? inspectRow.title}»
                </h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: "12.5px" }}>
                  Har bir User (ilova mijozi) va Hamkor (sanatoriya xodimi) bo‘yicha API yetkazilish holati
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Yopish"
                onClick={() => setInspectRow(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Summary Bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--soft)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>JAMI QABUL QILUVCHILAR</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                    {inspectRow.recipientCount ?? 0} ta
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                    O‘qildi: {inspectRow.readCount ?? 0} · Tasdiqladi: {inspectRow.acceptedCount ?? 0}
                  </div>
                </div>
                <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--soft)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>📱 USERS (MIJOZLAR)</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                    {inspectRow.customerStats?.delivered ?? 0} / {inspectRow.customerStats?.total ?? 0} ta
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--green)", fontWeight: 600 }}>
                    O‘qigan mijozlar: {inspectRow.customerStats?.read ?? 0} ta
                  </div>
                </div>
                <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--soft)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>🏥 HAMKORLAR (XODIMLAR)</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                    {inspectRow.partnerStats?.delivered ?? 0} / {inspectRow.partnerStats?.total ?? 0} ta
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--green)", fontWeight: 600 }}>
                    O‘qidi: {inspectRow.partnerStats?.read ?? 0} · Qabul: {inspectRow.partnerStats?.accepted ?? 0}
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search inside Inspector */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
                <div className="tabs" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className={`tab ${inspectTab === "ALL" ? "active" : ""}`}
                    onClick={() => setInspectTab("ALL")}
                  >
                    Barchasi ({inspectRow.recipients?.length ?? 0})
                  </button>
                  <button
                    type="button"
                    className={`tab ${inspectTab === "CUSTOMERS" ? "active" : ""}`}
                    onClick={() => setInspectTab("CUSTOMERS")}
                  >
                    📱 Users ({inspectRow.customerStats?.total ?? 0})
                  </button>
                  <button
                    type="button"
                    className={`tab ${inspectTab === "PARTNERS" ? "active" : ""}`}
                    onClick={() => setInspectTab("PARTNERS")}
                  >
                    🏥 Hamkorlar ({inspectRow.partnerStats?.total ?? 0})
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <select
                    value={inspectReadFilter}
                    onChange={(e) => setInspectReadFilter(e.target.value as any)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "var(--soft)",
                      color: "var(--ink)",
                      fontSize: "12.5px",
                    }}
                  >
                    <option value="ALL">Barcha holatlar</option>
                    <option value="READ">✅ O‘qiganlar</option>
                    <option value="UNREAD">⏳ Hali o‘qimaganlar</option>
                  </select>
                  <input
                    type="search"
                    placeholder="Ism, #ID, telefon yoki sanatoriya..."
                    value={inspectSearch}
                    onChange={(e) => setInspectSearch(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "var(--soft)",
                      color: "var(--ink)",
                      fontSize: "12.5px",
                      minWidth: "200px",
                    }}
                  />
                </div>
              </div>

              {/* Recipients Table */}
              {(() => {
                const rawList: Row[] = Array.isArray(inspectRow.recipients)
                  ? inspectRow.recipients
                  : [];
                const filtered = rawList.filter((rec) => {
                  if (inspectTab === "CUSTOMERS" && rec.kind !== "CUSTOMER") return false;
                  if (inspectTab === "PARTNERS" && rec.kind === "CUSTOMER") return false;
                  if (inspectReadFilter === "READ" && !rec.readAt) return false;
                  if (inspectReadFilter === "UNREAD" && rec.readAt) return false;
                  if (inspectSearch.trim()) {
                    const q = inspectSearch.toLowerCase();
                    return (
                      (rec.name ?? "").toLowerCase().includes(q) ||
                      (rec.phone ?? "").toLowerCase().includes(q) ||
                      (rec.email ?? "").toLowerCase().includes(q) ||
                      (rec.sanatoriumName ?? "").toLowerCase().includes(q) ||
                      String(rec.publicId ?? "").includes(q)
                    );
                  }
                  return true;
                });

                if (!filtered.length) {
                  return <Empty text="Tanlangan filtr bo‘yicha qabul qiluvchilar topilmadi" />;
                }

                return (
                  <Table
                    rows={filtered}
                    columns={[
                      {
                        label: "Qabul qiluvchi",
                        render: (rec) => (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong>{rec.name}</strong>
                              <span className="id-chip">{formatPublicIdChip(rec.publicId, rec.userId)}</span>
                            </div>
                            <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                              {[rec.phone, rec.email].filter(Boolean).join(" · ") || rec.login || "—"}
                            </span>
                          </div>
                        ),
                      },
                      {
                        label: "Auditoriya / Sanatoriya",
                        render: (rec) =>
                          rec.kind === "CUSTOMER" ? (
                            <span className="badge blue">📱 Ilova mijozi (User)</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span className="badge green">
                                🏥 {rec.sanatoriumName || "Hamkor"}
                              </span>
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                Lavozim: {rec.roleLabel || rec.role || "Xodim"}
                              </span>
                            </div>
                          ),
                      },
                      {
                        label: "API Yetkazilish",
                        render: (rec) => (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <span className="badge green" style={{ fontSize: "11px" }}>
                              ✅ Ilova/Veb: {rec.inAppStatus === "SENT" ? "Yetkazildi" : rec.inAppStatus}
                            </span>
                            {rec.telegramStatus && (
                              <span className="badge blue" style={{ fontSize: "11px" }}>
                                🤖 Telegram: {rec.telegramStatus}
                              </span>
                            )}
                          </div>
                        ),
                      },
                      {
                        label: "O‘qilgan / Qabul vaqti",
                        render: (rec) =>
                          rec.acceptedAt ? (
                            <span className="badge green">
                              ✅ Tasdiqlandi: {dateTime(rec.acceptedAt)}
                            </span>
                          ) : rec.readAt ? (
                            <span className="badge blue">
                              👁️ O‘qildi: {dateTime(rec.readAt)}
                            </span>
                          ) : (
                            <span className="badge gray">
                              ⏳ Yetkazilgan (hali ochilmagan)
                            </span>
                          ),
                      },
                    ]}
                  />
                );
              })()}
            </div>

            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="button secondary"
                disabled={verifyingId === (inspectRow.messageId || inspectRow.id)}
                onClick={() => handleVerifySingle(inspectRow.messageId || inspectRow.id)}
              >
                <CheckCircle2 size={16} />
                {verifyingId === (inspectRow.messageId || inspectRow.id)
                  ? "API tekshirilmoqda..."
                  : "🔄 API orqali qayta tekshirish va sinxronlash"}
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => setInspectRow(null)}
              >
                Yopish
              </button>
            </div>
          </section>
        </div>
      )}

      {/* COMPOSE ANNOUNCEMENT / MESSAGE MODAL */}
      {composeOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1100 }}
          onClick={() => !composeBusy && setComposeOpen(false)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{
              maxWidth: "700px",
              width: "96%",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-heading"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  {ctx.admin ? "📢 Yangi e’lon va xabar yuborish" : "📨 Yangi xabar yuborish"}
                </h2>
                <p className="muted" style={{ fontSize: "13px", margin: "4px 0 0" }}>
                  Auditoriyani tanlang, tayyor shablondan foydalaning yoki matn kiriting
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Yopish"
                disabled={composeBusy}
                onClick={() => setComposeOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitCompose}
              style={{
                padding: "18px 20px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* STEP 1: Audience Selection */}
              {ctx.admin ? (
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    1. Kimga yuborilsin? (Auditoriya tanlash) *
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {[
                      {
                        id: "ALL" as const,
                        title: "🌐 Butun tizimga",
                        desc: `Users (${totalCustomersCount}) + Hamkorlar (${totalPartnersCount})`,
                      },
                      {
                        id: "CUSTOMERS" as const,
                        title: "📱 Foydalanuvchilarga",
                        desc: `Ilova mijozlariga (${totalCustomersCount} ta user)`,
                      },
                      {
                        id: "PARTNERS" as const,
                        title: "🏥 Hamkorlarga",
                        desc: `${totalSanatoriumsCount} sanatoriya (${totalPartnersCount} xodim)`,
                      },
                    ].map((opt) => {
                      const active = target === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setTarget(opt.id);
                            setComposeError("");
                          }}
                          style={{
                            textAlign: "left",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: active ? "2px solid var(--green)" : "1px solid var(--line)",
                            background: active ? "var(--green-light)" : "var(--soft)",
                            color: "var(--ink)",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: "14px" }}>
                            <span>{opt.title}</span>
                            {active && <Check size={16} style={{ color: "var(--green)" }} />}
                          </div>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    1. Kimga yuborilsin? *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                      {
                        id: "TEAM" as const,
                        title: "👥 Sanatoriyam jamoasiga",
                        desc: "O‘z sanatoriyangiz xodimlariga",
                      },
                      {
                        id: "SUPERADMIN" as const,
                        title: "🛡️ Platforma ma’muriyatiga",
                        desc: "Sihhat.uz Superadminiga",
                      },
                    ].map((opt) => {
                      const active = partnerTargetMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setPartnerTargetMode(opt.id);
                            setComposeError("");
                          }}
                          style={{
                            textAlign: "left",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: active ? "2px solid var(--green)" : "1px solid var(--line)",
                            background: active ? "var(--green-light)" : "var(--soft)",
                            color: "var(--ink)",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: "13.5px" }}>{opt.title}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                            {opt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-options for CUSTOMERS */}
              {ctx.admin && target === "CUSTOMERS" && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--line)",
                    background: "var(--soft)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`button ${customerMode === "ALL_CUSTOMERS" ? "primary" : "secondary"}`}
                      style={{ fontSize: "12.5px", padding: "6px 12px", minHeight: "32px" }}
                      onClick={() => setCustomerMode("ALL_CUSTOMERS")}
                    >
                      ✅ Barcha faol foydalanuvchilarga ({totalCustomersCount} ta)
                    </button>
                    <button
                      type="button"
                      className={`button ${customerMode === "SELECTED_CUSTOMERS" ? "primary" : "secondary"}`}
                      style={{ fontSize: "12.5px", padding: "6px 12px", minHeight: "32px" }}
                      onClick={() => setCustomerMode("SELECTED_CUSTOMERS")}
                    >
                      🎯 Ro‘yxatdan tanlash ({selectedCustomerIds.length} ta tanlandi)
                    </button>
                  </div>

                  {customerMode === "SELECTED_CUSTOMERS" && (
                    <>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="search"
                          placeholder="Mijoz ismi, #ID, telefon yoki emaili bo‘yicha qidirish..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          style={{
                            flex: 1,
                            padding: "7px 10px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                            color: "var(--ink)",
                            fontSize: "12.5px",
                          }}
                        />
                        <button
                          type="button"
                          className="button secondary"
                          style={{ fontSize: "11.5px", padding: "5px 9px", minHeight: "30px" }}
                          onClick={() => setSelectedCustomerIds(allCustomers.map((c) => c.id))}
                        >
                          Barchasi
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          style={{ fontSize: "11.5px", padding: "5px 9px", minHeight: "30px" }}
                          onClick={() => setSelectedCustomerIds([])}
                        >
                          Tozalash
                        </button>
                      </div>
                      <div
                        style={{
                          maxHeight: "145px",
                          overflowY: "auto",
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                          gap: "6px",
                        }}
                      >
                        {allCustomers
                          .filter((c) => {
                            if (!customerSearch.trim()) return true;
                            const q = customerSearch.toLowerCase();
                            return (
                              (c.name ?? "").toLowerCase().includes(q) ||
                              (c.phone ?? "").toLowerCase().includes(q) ||
                              (c.email ?? "").toLowerCase().includes(q) ||
                              String(c.publicId ?? "").includes(q)
                            );
                          })
                          .map((c) => {
                            const checked = selectedCustomerIds.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: checked ? "1px solid var(--green)" : "1px solid var(--line)",
                                  background: checked ? "var(--green-light)" : "var(--surface)",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCustomerIds((prev) => [...prev, c.id]);
                                    } else {
                                      setSelectedCustomerIds((prev) => prev.filter((id) => id !== c.id));
                                    }
                                  }}
                                />
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  <strong>{c.name || "Mijoz"}</strong>{" "}
                                  <span style={{ color: "var(--muted)" }}>
                                    {formatPublicIdChip(c.publicId, c.id)} · {c.phone || c.email || ""}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sub-options for PARTNERS (Superadmin or Partner Team) */}
              {((ctx.admin && (target === "PARTNERS" || target === "ALL")) ||
                (!ctx.admin && partnerTargetMode === "TEAM")) && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--line)",
                    background: "var(--soft)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {ctx.admin && allSanatoriums.length > 0 && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                          🏥 Sanatoriyalar (bo‘sh qoldirilsa barcha {allSanatoriums.length} ta sanatoriyaga boradi)
                        </span>
                        {selectedSanatoriumIds.length > 0 && (
                          <button
                            type="button"
                            className="text-button"
                            style={{ fontSize: "11.5px" }}
                            onClick={() => setSelectedSanatoriumIds([])}
                          >
                            Barchasini tanlash ({allSanatoriums.length})
                          </button>
                        )}
                      </div>
                      <div
                        style={{
                          maxHeight: "110px",
                          overflowY: "auto",
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
                          gap: "6px",
                        }}
                      >
                        {allSanatoriums.map((s: Row) => {
                          const checked = selectedSanatoriumIds.includes(s.id);
                          const staffCount = allStaff.filter((st) => st.sanatoriumId === s.id).length;
                          return (
                            <label
                              key={s.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "12.5px",
                                cursor: "pointer",
                                padding: "5px 8px",
                                borderRadius: "6px",
                                border: checked ? "1px solid var(--green)" : "1px solid var(--line)",
                                background: checked ? "var(--green-light)" : "var(--surface)",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSanatoriumIds((prev) => [...prev, s.id]);
                                  } else {
                                    setSelectedSanatoriumIds((prev) => prev.filter((id) => id !== s.id));
                                  }
                                }}
                              />
                              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {s.name}
                              </span>
                              <small style={{ color: "var(--muted)" }}>{staffCount} xodim</small>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ctx.admin && (
                    <div>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                        👔 Lavozim bo‘yicha filtrlash (bo‘sh qoldirilsa barcha lavozimlarga boradi)
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {[
                          { role: "DIRECTOR", label: "👔 Direktorlar" },
                          { role: "RECEPTION", label: "🛎 Resepshn" },
                          { role: "ACCOUNTANT", label: "📊 Hisobchilar" },
                        ].map((item) => {
                          const active = selectedRoles.includes(item.role);
                          return (
                            <button
                              key={item.role}
                              type="button"
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((r) => r !== item.role)
                                    : [...prev, item.role],
                                )
                              }
                              style={{
                                padding: "5px 11px",
                                borderRadius: "999px",
                                border: active ? "1px solid var(--green)" : "1px solid var(--line)",
                                background: active ? "var(--green-light)" : "var(--surface)",
                                color: "var(--ink)",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {active ? "✓ " : ""}
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ctx.admin && target === "PARTNERS" && allStaff.length > 0 && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                          🎯 Aniq hamkor xodimlarini tanlash (ixtiyoriy — bo‘sh qoldirilsa yuqoridagi sanatoriya/lavozim bo‘yicha boradi)
                        </span>
                        {selectedStaffIds.length > 0 && (
                          <button
                            type="button"
                            className="text-button"
                            style={{ fontSize: "11.5px" }}
                            onClick={() => setSelectedStaffIds([])}
                          >
                            Tozalash ({selectedStaffIds.length})
                          </button>
                        )}
                      </div>
                      <input
                        type="search"
                        placeholder="Hamkor xodim ismi, #ID, telefon yoki sanatoriya nomi..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: "8px",
                          border: "1px solid var(--line)",
                          background: "var(--surface)",
                          color: "var(--ink)",
                          fontSize: "12.5px",
                          marginBottom: "6px",
                          boxSizing: "border-box",
                        }}
                      />
                      <div
                        style={{
                          maxHeight: "115px",
                          overflowY: "auto",
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                          gap: "6px",
                        }}
                      >
                        {allStaff
                          .filter((st) => {
                            if (selectedSanatoriumIds.length && !selectedSanatoriumIds.includes(st.sanatoriumId)) return false;
                            if (selectedRoles.length && !selectedRoles.includes(st.role)) return false;
                            if (!staffSearch.trim()) return true;
                            const q = staffSearch.toLowerCase();
                            return (
                              (st.name ?? "").toLowerCase().includes(q) ||
                              (st.phone ?? "").toLowerCase().includes(q) ||
                              (st.sanatoriumName ?? "").toLowerCase().includes(q) ||
                              String(st.publicId ?? "").includes(q)
                            );
                          })
                          .map((st) => {
                            const checked = selectedStaffIds.includes(st.id);
                            return (
                              <label
                                key={`${st.sanatoriumId}:${st.id}`}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  border: checked ? "1px solid var(--green)" : "1px solid var(--line)",
                                  background: checked ? "var(--green-light)" : "var(--surface)",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStaffIds((prev) => [...prev, st.id]);
                                    } else {
                                      setSelectedStaffIds((prev) => prev.filter((id) => id !== st.id));
                                    }
                                  }}
                                />
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  <strong>{st.name}</strong>{" "}
                                  <small style={{ color: "var(--muted)" }}>
                                    {st.roleLabel} · {st.sanatoriumName}
                                  </small>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {!ctx.admin && ownSanatoriumStaff.length > 0 && (
                    <div>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                        Qabul qiluvchi xodimlar (bo‘sh qoldirilsa barcha hamkasblarga boradi):
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px" }}>
                        {ownSanatoriumStaff
                          .filter((s) => s.id !== ctx.actor.id)
                          .map((st) => {
                            const checked = selectedStaffIds.includes(st.id);
                            return (
                              <label
                                key={st.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  border: checked ? "1px solid var(--green)" : "1px solid var(--line)",
                                  background: checked ? "var(--green-light)" : "var(--surface)",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStaffIds((prev) => [...prev, st.id]);
                                    } else {
                                      setSelectedStaffIds((prev) => prev.filter((id) => id !== st.id));
                                    }
                                  }}
                                />
                                <span>
                                  {st.name} <small style={{ color: "var(--muted)" }}>({st.roleLabel})</small>
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Quick Templates */}
              <div>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  ⚡ Tezkor tayyor shablonlar (1-klikda to‘ldirish):
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        background: "var(--soft)",
                        color: "var(--ink)",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 3: Kind, Title, Body */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                    E’lon turi *
                  </label>
                  <select
                    value={msgKind}
                    onChange={(e) => setMsgKind(e.target.value as "MESSAGE" | "WARNING")}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      background: "var(--soft)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      color: "var(--ink)",
                      fontSize: "13px",
                    }}
                  >
                    <option value="MESSAGE">📢 E’lon / Xabar</option>
                    <option value="WARNING">⚠️ Ogohlantirish</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                    E’lon sarlavhasi *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="Masalan: Yangi mavsumiy tariflar va onlayn bron yangilanishi..."
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      background: "var(--soft)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      color: "var(--ink)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  E’lon batafsil matni *
                </label>
                <textarea
                  required
                  rows={5}
                  maxLength={10000}
                  placeholder="E’lon yoki xabarning to‘liq matnini kiriting..."
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--soft)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    color: "var(--ink)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Live Mobile & Partner Preview */}
              {(msgTitle.trim() || msgBody.trim()) && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px dashed var(--line)",
                    background: "var(--surface)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                    👁️ Ilova va Hamkor panelidagi jonli ko‘rinish (Preview)
                  </span>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
                    {msgKind === "WARNING" ? "⚠️ Muhim e’lon: " : "📢 E’lon: "}
                    {msgTitle.trim() || "Sarlavha"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--muted)", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                    {msgBody.trim() || "E’lon matni shu yerda ko‘rinadi..."}
                  </div>
                </div>
              )}

              {/* Live Audience Summary Box */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "var(--green-light)",
                  border: "1px solid var(--green)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  fontSize: "12.5px",
                }}
              >
                <div>
                  <strong>📤 Yuborish nazorati:</strong> {estimatedRecipients.label}
                </div>
                <span className="badge green">
                  Jami: {estimatedRecipients.total} ta qabul qiluvchi
                </span>
              </div>

              {composeError && (
                <div
                  role="alert"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "rgba(239,68,68,0.14)",
                    border: "1px solid rgba(239,68,68,0.45)",
                    color: "#ef4444",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {composeError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={composeBusy}
                  onClick={() => setComposeOpen(false)}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={composeBusy || !msgTitle.trim() || !msgBody.trim()}
                >
                  <Send size={15} />
                  <span>{composeBusy ? "Yuborilmoqda va tekshirilmoqda..." : "E’lonni yuborish"}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function Communications({
  kind,
  embedded = false,
}: {
  kind: "messages" | "tasks" | "surveys";
  embedded?: boolean;
}) {
  if (kind === "messages") {
    return <AnnouncementsAndMessagesCenter embedded={embedded} />;
  }
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
  const canCreateTaskOrSurvey =
    ctx.admin || (kind === "tasks" ? ctx.allowed("tasks.manage") : false);

  return (
    <>
      {!embedded && (
        <PageHeading
          title={kind === "tasks" ? "Jamoa vazifalari" : "Anketalar"}
          subtitle={
            kind === "tasks"
              ? "Vazifani qabul qilish va bajarish holati tarixda qayd etiladi."
              : "Har bir anketa versiyasiga alohida javob saqlanadi."
          }
        >
          {canCreateTaskOrSurvey && (
            <AddButton onClick={create}>
              {kind === "tasks" ? "Vazifa berish" : "Anketa yaratish"}
            </AddButton>
          )}
        </PageHeading>
      )}
      {kind === "tasks" ? (
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
function getSenderDisplay(row?: Row | null, isAdminViewer = true) {
  if (!row) {
    return {
      primary: isAdminViewer ? "Murojaat" : "Superadmin",
      realName: null,
      phone: null,
      email: null,
      login: null,
      initial: isAdminViewer ? "M" : "S",
      isCustomer: false,
      avatarUrl: null as string | null,
      isOnline: false,
      badgeText: isAdminViewer ? "Mijoz" : "🛡️ Superadmin",
    };
  }
  const s = row.sender;
  const isCustomer =
    s?.kind === "CUSTOMER" ||
    (!s && (row.title || "").toLowerCase().includes("ilova"));

  // In partner panel (director/reception), chatting on a non-customer ticket means talking to Superadmin.
  if (!isAdminViewer && !isCustomer) {
    const peer = row.peer;
    return {
      primary: "Superadmin",
      realName: "Superadmin",
      phone: null,
      email: null,
      login: null,
      initial: "S",
      isCustomer: false,
      avatarUrl: (peer?.avatarUrl as string | null) ?? null,
      isOnline: Boolean(peer?.isOnline),
      badgeText: "🛡️ Superadmin",
    };
  }

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
  if (row.sanatoriumName && !isCustomer) {
    primary = row.sanatoriumName;
  } else if (finalName) {
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
    avatarUrl: (s?.avatarUrl as string | null) ?? null,
    isOnline: Boolean(s?.isOnline),
    badgeText: isCustomer
      ? "📱 Mobil mijoz"
      : row.sanatoriumName
        ? `🏥 ${finalName || "Hamkor sanatoriya"}`
        : "🏢 Xodim",
  };
}

function ChatAvatar({
  name,
  avatarUrl,
  isOnline,
  seed,
  variant = "list",
}: {
  name: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  seed?: string;
  variant?: "list" | "room" | "bubble" | "picker";
}) {
  const initial =
    (name || "S").replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "").slice(0, 1).toUpperCase() || "S";
  const bg = getAvatarGradient(seed || name || "S");
  if (variant === "bubble") {
    return (
      <div className="tg-bubble-avatar" style={{ background: bg }} title={name}>
        {avatarUrl ? <img src={avatarUrl} alt={name} /> : initial}
      </div>
    );
  }
  if (variant === "picker") {
    return (
      <div className="tg-avatar-wrap" style={{ width: "32px", height: "32px" }}>
        <div
          className="tg-avatar"
          style={{ width: "32px", height: "32px", fontSize: "12px", background: bg }}
        >
          {avatarUrl ? <img src={avatarUrl} alt={name} /> : initial}
        </div>
        {isOnline && (
          <span
            className="tg-avatar-dot"
            style={{ width: "10px", height: "10px" }}
            aria-label="Onlayn"
          />
        )}
      </div>
    );
  }
  return (
    <div className={`tg-avatar-wrap ${variant === "room" ? "tg-room-avatar-wrap" : ""}`}>
      <div
        className={variant === "room" ? "tg-room-avatar" : "tg-avatar"}
        style={{ background: bg }}
      >
        {avatarUrl ? <img src={avatarUrl} alt={name} /> : initial}
      </div>
      {isOnline && <span className="tg-avatar-dot" aria-label="Onlayn" title="Onlayn" />}
    </div>
  );
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
];

function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function isTicketClosed(status?: string | null): boolean {
  return status === "CLOSED" || status === "RESOLVED";
}

function formatChatListTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return dateTime(iso).slice(11, 16);
  }
  return date(iso);
}

function formatMessageDateGroup(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Bugun";
  if (d.toDateString() === yesterday.toDateString()) return "Kecha";
  return date(iso);
}

export function Support() {
  const ctx = usePortal(),
    action = useAction(),
    [chatFolder, setChatFolder] = useState<"open" | "closed">("open"),
    [id, setId] = useState<string | null>(null),
    [searchQuery, setSearchQuery] = useState(""),
    [replyText, setReplyText] = useState(""),
    [replyError, setReplyError] = useState(""),
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
    [recipientType, setRecipientType] = useState<"CUSTOMER" | "PARTNER" | "STAFF" | "ADMIN">(
      ctx.admin ? "CUSTOMER" : "ADMIN",
    ),
    [customers, setCustomers] = useState<Row[]>([]),
    [partners, setPartners] = useState<Row[]>([]),
    [staffList, setStaffList] = useState<Row[]>([]),
    [loadingRecipients, setLoadingRecipients] = useState(false),
    [userSearch, setUserSearch] = useState(""),
    [partnerSearch, setPartnerSearch] = useState(""),
    [staffSearch, setStaffSearch] = useState(""),
    [selectedUserId, setSelectedUserId] = useState<string | null>(null),
    [selectedStaffId, setSelectedStaffId] = useState<string | null>(null),
    [selectedRole, setSelectedRole] = useState<string | null>(null),
    [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
      ctx.tenant || ctx.tenants[0]?.id || null,
    ),
    [newTitle, setNewTitle] = useState(""),
    [newText, setNewText] = useState(""),
    [createError, setCreateError] = useState(""),
    [creatingTicket, setCreatingTicket] = useState(false),
    // Superadmin Ticket Assignment Modal State
    [assignModalOpen, setAssignModalOpen] = useState(false),
    [assignLoading, setAssignLoading] = useState(false),
    [assignSaving, setAssignSaving] = useState(false),
    [assignError, setAssignError] = useState(""),
    [assignSanatoriums, setAssignSanatoriums] = useState<Row[]>([]),
    [assignStaffList, setAssignStaffList] = useState<Row[]>([]),
    [assignSanFilter, setAssignSanFilter] = useState(""),
    [assignSearch, setAssignSearch] = useState(""),
    [assignTargetUserId, setAssignTargetUserId] = useState<string | null>(null),
    [assignNote, setAssignNote] = useState(""),
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
    const all = list(tickets.data);
    const inFolder = all.filter((row: Row) =>
      chatFolder === "closed"
        ? isTicketClosed(row.status)
        : !isTicketClosed(row.status),
    );
    setId((selected) => {
      if (selected && inFolder.some((row: Row) => row.id === selected)) {
        return selected;
      }
      if (window.matchMedia("(min-width: 900px)").matches) {
        return inFolder[0]?.id ?? null;
      }
      return null;
    });
  }, [tickets.data, chatFolder]);

  useEffect(() => {
    if (detail.data) setThread(detail.data);
  }, [detail.data]);

  useEffect(() => {
    if (!id) {
      setThread(null);
      return;
    }
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      api<Row>(`/support/tickets/${id}`)
        .then((fresh) => {
          if (fresh) setThread(fresh);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    const listTimer = setInterval(() => {
      if (document.visibilityState === "visible") tickets.reload();
    }, 15000);
    return () => clearInterval(listTimer);
  }, [tickets.reload]);

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
    setCreateError("");
    setRecipientType(ctx.admin ? "CUSTOMER" : "ADMIN");
    setSelectedStaffId(null);
    setSelectedRole(null);
    if (!ctx.admin && (ctx.tenant || ctx.tenants[0]?.id)) {
      setSelectedPartnerId((prev) => prev || ctx.tenant || ctx.tenants[0]?.id || null);
    }
    setLoadingRecipients(true);
    api<any>("/support/recipients")
      .then((data) => {
        if (!isMounted) return;
        setPartners(data?.sanatoriums ?? ctx.tenants ?? []);
        setStaffList(data?.staff ?? []);
        setCustomers(data?.customers ?? []);
        if (!ctx.admin) {
          const defaultPartner = ctx.tenant || data?.sanatoriums?.[0]?.id || null;
          setSelectedPartnerId((prev) => prev || defaultPartner);
        }
        setLoadingRecipients(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPartners(ctx.tenants ?? []);
        setLoadingRecipients(false);
      });
    return () => {
      isMounted = false;
    };
  }, [newModalOpen, ctx.admin, ctx.tenant, ctx.tenants]);

  const openAssignModal = () => {
    if (!t?.id) return;
    setAssignError("");
    setAssignNote("");
    setAssignSearch("");
    setAssignTargetUserId(t.assignedToUserId ?? null);
    setAssignSanFilter(t.assignedStaff?.sanatoriumId ?? t.booking?.sanatoriumId ?? t.sanatoriumId ?? "");
    setAssignModalOpen(true);
    setAssignLoading(true);
    api<any>("/support/recipients")
      .then((data) => {
        setAssignSanatoriums(data?.sanatoriums ?? ctx.tenants ?? []);
        setAssignStaffList(data?.staff ?? []);
      })
      .catch(() => {
        setAssignSanatoriums(ctx.tenants ?? []);
      })
      .finally(() => setAssignLoading(false));
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t?.id || assignSaving) return;
    setAssignSaving(true);
    setAssignError("");
    try {
      const chosenStaff = assignTargetUserId
        ? assignStaffList.find((st: Row) => st.id === assignTargetUserId)
        : null;
      const payload: Record<string, any> = {
        assigned_to_user_id: assignTargetUserId ?? null,
        sanatorium_id: chosenStaff?.sanatoriumId ?? null,
        ...(assignNote.trim() ? { note: assignNote.trim() } : {}),
      };
      const updated = await api<Row>(`/support/tickets/${t.id}/assign`, "PATCH", payload);
      if (updated) setThread(updated);
      setAssignModalOpen(false);
      await tickets.reload();
      ctx.notice(
        chosenStaff
          ? `Murojaat ${chosenStaff.name} (${chosenStaff.sanatoriumName || "Sanatoriya"}) xodimiga biriktirildi`
          : "Murojaat Superadmin tasarrufiga qaytarildi",
      );
    } catch (err: any) {
      setAssignError(err?.message || "Murojaatni biriktirishda xatolik yuz berdi");
    } finally {
      setAssignSaving(false);
    }
  };

  const selectTicket = (ticketId: string | null) => {
    setId(ticketId);
    setThread(null);
    setAttachedMedia(null);
    setReplyError("");
    setAttachMenuOpen(false);
    setEditingMessageId(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      const msg = "Faqat rasm fayllari (JPEG, PNG, WebP) yuklanishi mumkin";
      setReplyError(msg);
      ctx.notice(msg);
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      const msg = "Rasm hajmi 7 MB dan oshmasligi kerak";
      setReplyError(msg);
      ctx.notice(msg);
      return;
    }
    setReplyError("");
    const reader = new FileReader();
    reader.onerror = () => {
      const msg = "Rasm faylini o‘qib bo‘lmadi";
      setReplyError(msg);
      ctx.notice(msg);
    };
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        const msg = "Bu rasm formatini brauzer o‘qiy olmadi (JPEG/PNG yuboring)";
        setReplyError(msg);
        ctx.notice(msg);
      };
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
      const msg = "Faqat video fayllari (MP4, WebM, MOV) yuklanishi mumkin";
      setReplyError(msg);
      ctx.notice(msg);
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      const msg = "Video hajmi 7 MB dan oshmasligi kerak";
      setReplyError(msg);
      ctx.notice(msg);
      return;
    }
    setReplyError("");
    const reader = new FileReader();
    reader.onerror = () => {
      const msg = "Video faylini o‘qib bo‘lmadi";
      setReplyError(msg);
      ctx.notice(msg);
    };
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
    if (file.size > 7 * 1024 * 1024) {
      const msg = "Fayl hajmi 7 MB dan oshmasligi kerak";
      setReplyError(msg);
      ctx.notice(msg);
      return;
    }
    setReplyError("");
    const reader = new FileReader();
    reader.onerror = () => {
      const msg = "Faylni o‘qib bo‘lmadi";
      setReplyError(msg);
      ctx.notice(msg);
    };
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
    setReplyError("");
    try {
      const fallbackPlaceholder = attachedMedia
        ? attachedMedia.type === "video"
          ? "🎬 Video"
          : attachedMedia.type === "file"
            ? `📎 Fayl: ${attachedMedia.name}`
            : "📷 Rasm"
        : "";
      const sentText = text || fallbackPlaceholder;
      const sentMsg = await api<Row>(`/support/tickets/${id}/messages`, "POST", {
        text: sentText,
        ...(attachedMedia?.url ? { imageUrl: attachedMedia.url } : {}),
      });
      setReplyText("");
      setAttachedMedia(null);
      if (sentMsg?.id) {
        setThread((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...(Array.isArray(prev.messages) ? prev.messages : []),
                  {
                    ...sentMsg,
                    isMe: true,
                    userId: sentMsg.userId ?? ctx.actor.id,
                    text: sentMsg.text ?? sentText,
                    imageUrl: sentMsg.imageUrl ?? attachedMedia?.url ?? null,
                    createdAt: sentMsg.createdAt ?? new Date().toISOString(),
                  },
                ],
              }
            : prev,
        );
      }
      tickets.reload();
      const fresh = await api<Row>(`/support/tickets/${id}`).catch(() => null);
      if (fresh) setThread(fresh);
    } catch (err: any) {
      const msg = err?.message || "Xabar yuborishda xatolik yuz berdi";
      setReplyError(msg);
      ctx.notice(msg);
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingTicket) return;
    const cleanTitle = newTitle.trim();
    const cleanText = newText.trim();
    if (cleanTitle.length < 2) {
      const msg = "Mavzu kamida 2 ta belgidan iborat bo‘lishi kerak";
      setCreateError(msg);
      ctx.notice(msg);
      return;
    }
    if (!cleanText) {
      const msg = "Xabar matnini kiriting";
      setCreateError(msg);
      ctx.notice(msg);
      return;
    }
    const isWritingToSanatorium = recipientType === "PARTNER" || recipientType === "STAFF";
    const partnerId = isWritingToSanatorium
      ? (selectedPartnerId || ctx.tenant || partners[0]?.id || null)
      : null;
    if (ctx.admin && recipientType === "CUSTOMER" && !selectedUserId) {
      const msg = "Iltimos, ilova foydalanuvchisini tanlang";
      setCreateError(msg);
      ctx.notice(msg);
      return;
    }
    if (isWritingToSanatorium && !partnerId) {
      const msg = "Iltimos, sanatoriyani tanlang";
      setCreateError(msg);
      ctx.notice(msg);
      return;
    }
    setCreateError("");
    setCreatingTicket(true);
    try {
      const payload: any = {
        title: cleanTitle,
        text: cleanText,
      };
      if (ctx.admin && recipientType === "CUSTOMER") {
        payload.target_user_id = selectedUserId;
      } else if (isWritingToSanatorium) {
        payload.sanatorium_id = partnerId;
        if (selectedStaffId) payload.target_user_id = selectedStaffId;
        if (selectedRole) payload.target_role = selectedRole;
      }
      const res = await api<Row>("/support/tickets", "POST", payload);
      ctx.notice("Yangi suhbat muvaffaqiyatli ochildi");
      setNewModalOpen(false);
      setNewTitle("");
      setNewText("");
      setSelectedUserId(null);
      setSelectedStaffId(null);
      setSelectedRole(null);
      setChatFolder("open");
      await tickets.reload();
      if (res?.id) {
        selectTicket(res.id);
      }
    } catch (err: any) {
      const msg = err?.message || "Murojaat yaratishda xatolik yuz berdi";
      setCreateError(msg);
      ctx.notice(msg);
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
  const openTickets = allTickets.filter((row: Row) => !isTicketClosed(row.status));
  const closedTickets = allTickets.filter((row: Row) => isTicketClosed(row.status));
  const folderTickets = chatFolder === "closed" ? closedTickets : openTickets;
  const filteredTickets = searchQuery.trim()
    ? folderTickets.filter((row: Row) => {
        const q = searchQuery.toLowerCase();
        const info = getSenderDisplay(row, ctx.admin);
        return (
          (row.title ?? "").toLowerCase().includes(q) ||
          (row.lastMessage ?? "").toLowerCase().includes(q) ||
          (row.sanatoriumName ?? "").toLowerCase().includes(q) ||
          info.primary.toLowerCase().includes(q) ||
          (info.phone ?? "").toLowerCase().includes(q) ||
          (info.email ?? "").toLowerCase().includes(q)
        );
      })
    : folderTickets;

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
  const ticketIsClosed = isTicketClosed(t?.status);
  return (
    <>
      <PageHeading
        title="Yordam va jonli chat"
        subtitle="Telegram uslubidagi tezkor jonli chat — yopilgan murojaatlar avtomatik Arxivga o‘tadi."
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
            <div className="modal-heading" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>Yangi xabar / murojaat</h2>
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
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
                  Qabul qiluvchi turi
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "var(--soft)", border: "1px solid var(--line)", padding: "4px", borderRadius: "10px" }}>
                  {ctx.admin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateError("");
                          setRecipientType("CUSTOMER");
                        }}
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
                          background: recipientType === "CUSTOMER" ? "var(--green)" : "transparent",
                          color: recipientType === "CUSTOMER" ? "var(--on-primary)" : "var(--muted)",
                        }}
                      >
                        <Smartphone size={16} />
                        <span>📱 Ilova foydalanuvchisi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateError("");
                          setRecipientType("PARTNER");
                        }}
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
                          background: recipientType === "PARTNER" ? "var(--green)" : "transparent",
                          color: recipientType === "PARTNER" ? "var(--on-primary)" : "var(--muted)",
                        }}
                      >
                        <Building2 size={16} />
                        <span>🏥 Sanatoriya / Xodimlar</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateError("");
                          setRecipientType("ADMIN");
                        }}
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
                          background: recipientType === "ADMIN" ? "var(--green)" : "transparent",
                          color: recipientType === "ADMIN" ? "var(--on-primary)" : "var(--muted)",
                        }}
                      >
                        <MessageSquare size={16} />
                        <span>🛡 Sihhat.uz Yordam</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateError("");
                          setRecipientType("STAFF");
                        }}
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
                          background: recipientType === "STAFF" ? "var(--green)" : "transparent",
                          color: recipientType === "STAFF" ? "var(--on-primary)" : "var(--muted)",
                        }}
                      >
                        <Users size={16} />
                        <span>🏥 Xodimlar (Resepshn...)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!ctx.admin && recipientType === "ADMIN" && (
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: "var(--green-light)", border: "1px solid var(--line)", color: "var(--ink)", fontSize: "13px", fontWeight: 600 }}>
                  Murojaatingiz markaziy Sihhat.uz platforma ma’murlariga (Superadmin) yuboriladi.
                </div>
              )}

              {/* Customer Picker */}
              {ctx.admin && recipientType === "CUSTOMER" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                      Ilova foydalanuvchisini tanlang *
                    </label>
                    {selectedUser && (
                      <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 700 }}>
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
                        background: "var(--soft)",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        color: "var(--ink)",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                    <Search size={15} style={{ position: "absolute", left: "11px", top: "11px", color: "var(--muted)" }} />
                  </div>

                  <div
                    style={{
                      maxHeight: "160px",
                      overflowY: "auto",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      background: "var(--soft)",
                      padding: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    {loadingRecipients ? (
                      <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                        Foydalanuvchilar yuklanmoqda...
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                        Foydalanuvchi topilmadi
                      </div>
                    ) : (
                      filteredCustomers.map((cust: Row) => {
                        const isSel = selectedUserId === cust.id;
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
                              background: isSel ? "var(--green-light)" : "transparent",
                              border: isSel ? "1px solid var(--green)" : "1px solid transparent",
                              transition: "background 0.1s",
                            }}
                          >
                            <ChatAvatar
                              variant="picker"
                              name={cust.name || "U"}
                              avatarUrl={cust.avatarUrl}
                              isOnline={Boolean(cust.isOnline)}
                              seed={cust.id || cust.name || "U"}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {cust.name || "Noma'lum foydalanuvchi"}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", gap: "8px" }}>
                                {cust.phone && <span>{cust.phone}</span>}
                                {cust.email && <span>{cust.email}</span>}
                              </div>
                            </div>
                            {isSel && <Check size={16} style={{ color: "var(--green)" }} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Sanatorium & Staff Picker */}
              {(recipientType === "PARTNER" || recipientType === "STAFF") && (
                <>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                        Sanatoriyani tanlang *
                      </label>
                      {selectedPartner && (
                        <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 700 }}>
                          Tanlandi: {selectedPartner.name}
                        </span>
                      )}
                    </div>
                    {(ctx.admin || partners.length > 1) && (
                      <>
                        <div style={{ position: "relative", marginBottom: "8px" }}>
                          <input
                            type="text"
                            placeholder="Sanatoriya nomi bo‘yicha qidirish..."
                            value={partnerSearch}
                            onChange={(e) => setPartnerSearch(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px 9px 34px",
                              background: "var(--soft)",
                              border: "1px solid var(--line)",
                              borderRadius: "8px",
                              color: "var(--ink)",
                              fontSize: "13px",
                              boxSizing: "border-box",
                            }}
                          />
                          <Search size={15} style={{ position: "absolute", left: "11px", top: "11px", color: "var(--muted)" }} />
                        </div>

                        <div
                          style={{
                            maxHeight: "130px",
                            overflowY: "auto",
                            border: "1px solid var(--line)",
                            borderRadius: "8px",
                            background: "var(--soft)",
                            padding: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            marginBottom: "10px",
                          }}
                        >
                          {filteredPartners.map((san: Row) => {
                            const isSel = selectedPartnerId === san.id;
                            return (
                              <div
                                key={san.id}
                                onClick={() => {
                                  setSelectedPartnerId(san.id);
                                  setSelectedStaffId(null);
                                }}
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  background: isSel ? "var(--green-light)" : "transparent",
                                  border: isSel ? "1px solid var(--green)" : "1px solid transparent",
                                }}
                              >
                                <Building2 size={18} style={{ color: isSel ? "var(--green)" : "var(--muted)", flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                                    {san.name}
                                  </div>
                                  {san.region && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{san.region}</div>}
                                </div>
                                {isSel && <Check size={16} style={{ color: "var(--green)" }} />}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Target role / Staff member picker */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      Xodim yoki bo‘limni tanlang
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "6px", marginBottom: "8px" }}>
                      {[
                        { role: null, label: "Umumiy ma’muriyat" },
                        { role: "RECEPTION", label: "🛎 Resepshn" },
                        { role: "DIRECTOR", label: "👔 Direktor" },
                        { role: "ACCOUNTANT", label: "📊 Hisobchi" },
                      ].map((item) => {
                        const active = selectedRole === item.role && !selectedStaffId;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setSelectedRole(item.role);
                              setSelectedStaffId(null);
                            }}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: active ? "1px solid var(--green)" : "1px solid var(--line)",
                              background: active ? "var(--green-light)" : "var(--soft)",
                              color: "var(--ink)",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Specific Staff List for the chosen sanatorium */}
                    {(() => {
                      const curPartnerId = selectedPartnerId || ctx.tenant;
                      const curStaff = staffList.filter((s: Row) => !curPartnerId || s.sanatoriumId === curPartnerId);
                      if (!curStaff.length) return null;
                      return (
                        <div style={{ border: "1px solid var(--line)", borderRadius: "8px", background: "var(--soft)", padding: "6px", maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "11px", color: "var(--muted)", padding: "2px 6px" }}>
                            Yoki aniq xodimni tanlang:
                          </span>
                          {curStaff.map((st: Row) => {
                            const isSel = selectedStaffId === st.id;
                            return (
                              <div
                                key={st.id}
                                onClick={() => {
                                  setSelectedStaffId(st.id);
                                  setSelectedRole(st.role);
                                }}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  background: isSel ? "var(--green-light)" : "transparent",
                                  border: isSel ? "1px solid var(--green)" : "1px solid transparent",
                                }}
                              >
                                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", flex: 1 }}>
                                  {st.name} <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 400 }}>({st.roleLabel ?? st.role})</span>
                                </div>
                                {isSel && <Check size={14} style={{ color: "var(--green)" }} />}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* Title / Mavzu */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
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
                    background: "var(--soft)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    color: "var(--ink)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Text / Matn */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
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
                    background: "var(--soft)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    color: "var(--ink)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {createError && (
                <div role="alert" style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.45)", color: "#fca5a5", fontSize: "13px", fontWeight: 600 }}>
                  {createError}
                </div>
              )}

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
                    (ctx.admin && recipientType === "CUSTOMER" && !selectedUserId) ||
                    ((recipientType === "PARTNER" || recipientType === "STAFF") && !(selectedPartnerId || ctx.tenant || partners[0]?.id))
                  }
                >
                  {creatingTicket ? "Yuborilmoqda..." : "Yuborish"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Superadmin Assign Ticket to Sanatorium Staff Modal */}
      {ctx.admin && assignModalOpen && t && (
        <div className="modal-backdrop" style={{ zIndex: 1050 }} onClick={() => !assignSaving && setAssignModalOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Murojaatni sanatoriya xodimiga biriktirish"
            style={{ maxWidth: "560px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Sanatoriya xodimiga biriktirish
                </h2>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0" }}>
                  Murojaatga o‘zingiz javob berishingiz yoki mas’ul sanatoriya xodimiga biriktirishingiz mumkin.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Yopish"
                disabled={assignSaving}
                onClick={() => setAssignModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} style={{ padding: "18px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Option 1: Keep with Superadmin */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setAssignTargetUserId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAssignTargetUserId(null);
                  }
                }}
                style={{
                  padding: "11px 13px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  border: assignTargetUserId === null ? "2px solid var(--green)" : "1px solid var(--line)",
                  background: assignTargetUserId === null ? "var(--green-light)" : "var(--soft)",
                }}
              >
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
                    🛡️ Superadmin o‘zi javob beradi
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    Sanatoriya xodimiga biriktirilmaydi — markaziy yordam javob beradi
                  </div>
                </div>
                {assignTargetUserId === null && <Check size={17} style={{ color: "var(--green)", flexShrink: 0 }} />}
              </div>

              {/* Filter by Sanatorium + Search Staff */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "5px" }}>
                    Sanatoriya bo‘yicha filtr
                  </label>
                  <select
                    value={assignSanFilter}
                    onChange={(e) => setAssignSanFilter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "var(--soft)",
                      color: "var(--ink)",
                      fontSize: "12.5px",
                    }}
                  >
                    <option value="">Barcha sanatoriyalar</option>
                    {assignSanatoriums.map((s: Row) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "5px" }}>
                    Xodimni qidirish
                  </label>
                  <input
                    type="search"
                    placeholder="Ism, sanatoriya, telefon..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "var(--soft)",
                      color: "var(--ink)",
                      fontSize: "12.5px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Staff list */}
              <div
                style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  background: "var(--soft)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {assignLoading ? (
                  <div style={{ padding: "18px", textAlign: "center", fontSize: "12.5px", color: "var(--muted)" }}>
                    Sanatoriya xodimlari yuklanmoqda...
                  </div>
                ) : (() => {
                  const filtered = assignStaffList.filter((st: Row) => {
                    if (assignSanFilter && st.sanatoriumId !== assignSanFilter) return false;
                    if (!assignSearch.trim()) return true;
                    const q = assignSearch.toLowerCase();
                    return (
                      (st.name ?? "").toLowerCase().includes(q) ||
                      (st.sanatoriumName ?? "").toLowerCase().includes(q) ||
                      (st.roleLabel ?? "").toLowerCase().includes(q) ||
                      (st.phone ?? "").toLowerCase().includes(q) ||
                      (st.login ?? "").toLowerCase().includes(q)
                    );
                  });
                  if (!filtered.length) {
                    return (
                      <div style={{ padding: "18px", textAlign: "center", fontSize: "12.5px", color: "var(--muted)" }}>
                        Faol sanatoriya xodimi topilmadi
                      </div>
                    );
                  }
                  return filtered.map((st: Row) => {
                    const isSel = assignTargetUserId === st.id;
                    return (
                      <div
                        key={`${st.sanatoriumId}:${st.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setAssignTargetUserId(st.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setAssignTargetUserId(st.id);
                          }
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: isSel ? "var(--green-light)" : "transparent",
                          border: isSel ? "1.5px solid var(--green)" : "1px solid transparent",
                        }}
                      >
                        <ChatAvatar
                          variant="picker"
                          name={st.name || "X"}
                          avatarUrl={st.avatarUrl}
                          seed={st.id || st.name}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {st.name} <span style={{ fontWeight: 500, fontSize: "11.5px", color: "var(--muted)" }}>· {st.roleLabel || st.role}</span>
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            🏥 {st.sanatoriumName}{st.phone ? ` · ${st.phone}` : ""}
                          </div>
                        </div>
                        {isSel && <Check size={16} style={{ color: "var(--green)", flexShrink: 0 }} />}
                      </div>
                    );
                  });
                })()}
              </div>

              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "5px" }}>
                  Xodim uchun izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  placeholder="Masalan: Mehmon bron sanasi bo‘yicha yordam so‘ramoqda..."
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 11px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "var(--soft)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {assignError && <ErrorBox message={assignError} />}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={assignSaving}
                  onClick={() => setAssignModalOpen(false)}
                >
                  Bekor qilish
                </button>
                <button type="submit" className="button primary" disabled={assignSaving}>
                  <UserCheck size={15} />
                  <span>{assignSaving ? "Saqlanmoqda..." : assignTargetUserId ? "Xodimga biriktirish" : "Superadminda qoldirish"}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <div className={`tg-messenger ${id ? "has-selection" : ""}`}>
        <div className="tg-sidebar">
          <div className="tg-sidebar-header">
            <h3>Suhbatlar</h3>
            <button
              type="button"
              className="tg-compose-btn"
              onClick={() => setNewModalOpen(true)}
            >
              <SquarePen size={14} />
              <span>+ Yangi</span>
            </button>
          </div>
          <div className="tg-search-bar">
            <Search size={15} className="tg-search-icon" />
            <input
              type="text"
              placeholder="Ism, mavzu yoki xabar qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="tg-folders" role="tablist" aria-label="Chat jildlari">
            <button
              type="button"
              role="tab"
              aria-selected={chatFolder === "open"}
              className={`tg-folder-tab ${chatFolder === "open" ? "active" : ""}`}
              onClick={() => setChatFolder("open")}
            >
              <span>Ochiq</span>
              <span className="tg-folder-badge">{openTickets.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chatFolder === "closed"}
              className={`tg-folder-tab ${chatFolder === "closed" ? "active" : ""}`}
              onClick={() => setChatFolder("closed")}
            >
              <Archive size={13} />
              <span>Yopilgan</span>
              <span className="tg-folder-badge">{closedTickets.length}</span>
            </button>
          </div>
          {tickets.loading ? (
            <Loading />
          ) : tickets.error ? (
            <ErrorBox message={tickets.error} retry={tickets.reload} />
          ) : (
            <ul className="tg-chat-list">
              {!filteredTickets.length && (
                <li style={{ padding: "28px 16px", textAlign: "center", color: "var(--tg-muted)", fontSize: "13px" }}>
                  {chatFolder === "open"
                    ? "Hozircha ochiq murojaatlar yo‘q"
                    : "Yopilgan murojaatlar arxivi bo‘sh"}
                </li>
              )}
              {filteredTickets.map((row: Row) => {
                const isSelected = row.id === id;
                const info = getSenderDisplay(row, ctx.admin);
                const rowClosed = isTicketClosed(row.status);
                return (
                  <li
                    key={row.id}
                    className={`tg-chat-item ${isSelected ? "active" : ""}`}
                    onClick={() => selectTicket(row.id)}
                  >
                    <ChatAvatar
                      variant="list"
                      name={info.primary}
                      avatarUrl={info.avatarUrl}
                      isOnline={info.isOnline}
                      seed={row.id || info.primary}
                    />
                    <div className="tg-chat-info">
                      <div className="tg-chat-top">
                        <span className="tg-chat-title">{info.primary}</span>
                        <span className="tg-chat-time">{formatChatListTime(row.createdAt)}</span>
                      </div>
                      <div className="tg-chat-subline">
                        <span className="tg-role-tag">
                          {info.primary === "Superadmin"
                            ? "Superadmin"
                            : info.isCustomer
                              ? "Mijoz"
                              : "Hamkor"}
                        </span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.title || "Suhbat"}
                        </span>
                        {ctx.admin && row.assignedStaff && (
                          <span style={{ color: "var(--tg-accent)", fontWeight: 600 }}>
                            · → {row.assignedStaff.name}
                          </span>
                        )}
                        {row.booking && <span>· #{row.booking.reference}</span>}
                      </div>
                      <div className="tg-chat-bottom">
                        <span className="tg-chat-preview">
                          {row.lastMessage ?? (rowClosed ? "Yakunlangan" : "Yangi suhbat")}
                        </span>
                        {rowClosed && <Lock size={12} style={{ opacity: 0.75, flexShrink: 0 }} />}
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
                const roomInfo = getSenderDisplay(t, ctx.admin);
                return (
                  <div className="tg-room-header">
                    <div className="tg-room-user">
                      <button
                        type="button"
                        className="button secondary support-back"
                        style={{ marginRight: "2px", minHeight: "34px", padding: "4px 9px" }}
                        onClick={() => selectTicket(null)}
                        aria-label="Orqaga"
                      >
                        ←
                      </button>
                      <ChatAvatar
                        variant="room"
                        name={roomInfo.primary}
                        avatarUrl={roomInfo.avatarUrl}
                        isOnline={roomInfo.isOnline}
                        seed={t?.id || roomInfo.primary}
                      />
                      <div style={{ flex: 1, minWidth: "180px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span className="tg-room-name">{roomInfo.primary}</span>
                          <span className="tg-role-tag">{roomInfo.badgeText}</span>
                          {roomInfo.isOnline && <span className="tg-online-badge">Onlayn</span>}
                          {ctx.admin && roomInfo.phone && (
                            <a href={`tel:${roomInfo.phone}`} style={{ fontSize: "12px", color: "var(--tg-accent)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                              <Phone size={12} /> {roomInfo.phone}
                            </a>
                          )}
                          {ctx.admin && roomInfo.email && (
                            <a href={`mailto:${roomInfo.email}`} style={{ fontSize: "12px", color: "var(--tg-muted)", fontWeight: 600 }}>
                              ✉️ {roomInfo.email}
                            </a>
                          )}
                          {ctx.admin && roomInfo.login && !roomInfo.email && (
                            <span style={{ fontSize: "11px", color: "var(--tg-muted)" }}>
                              @{roomInfo.login}
                            </span>
                          )}
                        </div>
                        <div className="tg-room-sub" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
                          <span>Mavzu: <strong style={{ color: "var(--tg-ink)" }}>{t?.title ?? "Murojaat"}</strong></span>
                          {t?.assignedStaff ? (
                            <span style={{ color: "var(--tg-accent)", fontWeight: 700 }}>
                              • 🏥 Biriktirilgan: {t.assignedStaff.name}
                              {t.assignedStaff.sanatoriumName ? ` (${t.assignedStaff.sanatoriumName})` : ""}
                            </span>
                          ) : t?.sanatoriumName ? (
                            <span>• {t.sanatoriumName}</span>
                          ) : ctx.admin && roomInfo.isCustomer ? (
                            <span style={{ opacity: 0.85 }}>• 🛡️ Superadmin</span>
                          ) : null}
                          {t?.booking && (
                            <span style={{ color: "var(--tg-accent)", fontWeight: 700 }}>
                              • Bron #{t.booking.reference} ({t.booking.status})
                            </span>
                          )}
                          {ctx.admin && t?.userId && (
                            <span style={{ fontSize: "11px", opacity: 0.7 }}>
                              ID: {t.userId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <Badge value={t?.status} />
                      {ctx.admin && !ticketIsClosed && (
                        <Act onClick={openAssignModal}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <UserCheck size={14} />{" "}
                            {t?.assignedStaff || t?.sanatoriumId ? "Biriktirish" : "Xodimga biriktirish"}
                          </span>
                        </Act>
                      )}
                      {ctx.admin && !ticketIsClosed && (
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
                                ctx.notice("Murojaat yopildi va Yopilganlar arxiviga o‘tkazildi");
                                void tickets.reload();
                                if (chatFolder === "open") {
                                  setId(null);
                                  setThread(null);
                                } else if (id) {
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
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <CheckCircle2 size={14} /> Yopish
                          </span>
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
                      {(() => {
                        const roomInfo = getSenderDisplay(t, ctx.admin);
                        return t.messages.map((m: Row, index: number) => {
                        const prevMsg = index > 0 ? t.messages[index - 1] : null;
                        const dateGroup = formatMessageDateGroup(m.createdAt);
                        const showDateSep =
                          Boolean(dateGroup) &&
                          dateGroup !== formatMessageDateGroup(prevMsg?.createdAt);
                        const isOwn = m.userId === ctx.actor.id;
                        const senderInfo = m.userId === t?.userId ? roomInfo : null;
                        const rawName = (m.userName ?? "").trim();
                        const isPlaceholder = !rawName || rawName === "Mijoz" || rawName === "User";
                        const bubbleSenderName =
                          !ctx.admin && m.userKind === "SUPERADMIN"
                            ? "Superadmin"
                            : !isPlaceholder
                              ? rawName
                              : (senderInfo?.primary || rawName || "Suhbatdosh");
                        const bubbleAvatarUrl =
                          m.userAvatarUrl ??
                          (!ctx.admin && m.userKind === "SUPERADMIN"
                            ? t?.peer?.avatarUrl
                            : senderInfo?.avatarUrl) ??
                          null;
                        const bubblePhone = ctx.admin ? (m.userPhone || senderInfo?.phone) : null;
                        const bubbleEmail = ctx.admin ? (m.userEmail || senderInfo?.email) : null;
                        const isEditingThis = editingMessageId === m.id;
                        return (
                          <div key={m.id}>
                            {showDateSep && (
                              <div className="tg-date-sep">
                                <span>{dateGroup}</span>
                              </div>
                            )}
                            <div className={`tg-bubble-row ${isOwn ? "own" : "incoming"}`} style={!isOwn ? { display: "flex", alignItems: "flex-end", gap: "8px" } : undefined}>
                              {!isOwn && (
                                <ChatAvatar
                                  variant="bubble"
                                  name={bubbleSenderName}
                                  avatarUrl={bubbleAvatarUrl}
                                  seed={m.userId || bubbleSenderName}
                                />
                              )}
                              <div className={`tg-bubble ${isOwn ? "own" : "incoming"}`}>
                                {!isOwn && (
                                  <div className="tg-bubble-sender" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <span>{bubbleSenderName}</span>
                                    {bubblePhone && (
                                      <a href={`tel:${bubblePhone}`} style={{ fontSize: "11px", color: "var(--tg-accent)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                        <Phone size={10} /> {bubblePhone}
                                      </a>
                                    )}
                                    {bubbleEmail && (
                                      <span style={{ fontSize: "11px", color: "var(--tg-muted)", fontWeight: 400 }}>
                                        {bubbleEmail}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {m.isDeleted && (
                                  <div style={{ fontSize: "11px", color: "var(--tg-danger)", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)", padding: "3px 8px", borderRadius: "6px", marginBottom: "6px", fontWeight: 600 }}>
                                    Yuboruvchi tomonidan o‘chirilgan xabar (Audit)
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
                                          borderRadius: "10px",
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
                                          borderRadius: "10px",
                                          background: "rgba(0,0,0,0.08)",
                                          border: "1px solid var(--tg-border)",
                                          color: "inherit",
                                          textDecoration: "none",
                                          fontWeight: 600,
                                          fontSize: "13px",
                                        }}
                                      >
                                        <FileText size={22} style={{ color: "var(--tg-accent)", flexShrink: 0 }} />
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
                                          borderRadius: "10px",
                                          cursor: "pointer",
                                          display: "block",
                                          objectFit: "cover",
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
                                        background: "var(--tg-input-bg)",
                                        color: "var(--tg-ink)",
                                        border: "1px solid var(--tg-accent)",
                                        borderRadius: "8px",
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
                                <div className="tg-bubble-meta">
                                  {m.isEdited && (
                                    <span style={{ fontStyle: "italic" }}>tahrirlangan</span>
                                  )}
                                  <span>{dateTime(m.createdAt).slice(11, 16)}</span>
                                  {isOwn && <CheckCheck size={13} />}
                                  {(ctx.admin || (isOwn && !m.isDeleted && !ticketIsClosed)) && !isEditingThis && (
                                    <span className="tg-bubble-actions">
                                      {isOwn && !m.isDeleted && !ticketIsClosed && (
                                        <button
                                          type="button"
                                          onClick={() => startEdit(m)}
                                          title="Xabarni tahrirlash"
                                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: "1px 2px" }}
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => deleteMessage(m.id)}
                                        title={ctx.admin ? "Bazadan butunlay o‘chirish" : "Xabarni o‘chirish"}
                                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--tg-danger)", padding: "1px 2px" }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }); })()}
                      <div ref={messagesEndRef} />
                    </>
                  )
                )}
              </div>
              {ticketIsClosed ? (
                <div className="tg-composer-closed">
                  <Lock size={15} />
                  <span>Murojaat yopilgan — yozishmalar arxivda saqlanadi</span>
                </div>
              ) : (
                <>
                  {attachedMedia && (
                    <div style={{ padding: "8px 16px", background: "var(--tg-header-bg)", borderTop: "1px solid var(--tg-border)", display: "flex", alignItems: "center", gap: "10px" }}>
                      {attachedMedia.type === "image" ? (
                        <img
                          src={attachedMedia.url}
                          alt="Biriktirilgan rasm"
                          style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--tg-accent)" }}
                        />
                      ) : attachedMedia.type === "video" ? (
                        <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "rgba(56,189,248,0.18)", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                          <Video size={20} />
                        </div>
                      ) : (
                        <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "rgba(251,191,36,0.18)", border: "1px solid #fbbf24", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
                          <FileText size={20} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", color: "var(--tg-accent)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {attachedMedia.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--tg-muted)" }}>
                          {attachedMedia.type === "image" ? "Rasm biriktirildi" : attachedMedia.type === "video" ? `Video (${attachedMedia.sizeText || ""})` : `Hujjat / Fayl (${attachedMedia.sizeText || ""})`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedMedia(null)}
                        style={{ background: "transparent", border: "none", color: "var(--tg-danger)", cursor: "pointer", padding: "4px" }}
                        title="Birikmani olib tashlash"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {replyError && (
                    <div role="alert" style={{ padding: "8px 16px", background: "rgba(239,68,68,0.14)", borderTop: "1px solid rgba(239,68,68,0.4)", color: "var(--tg-danger)", fontSize: "12px", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span>{replyError}</span>
                      <button type="button" onClick={() => setReplyError("")} style={{ background: "transparent", border: "none", color: "var(--tg-danger)", cursor: "pointer", padding: "2px" }} aria-label="Xatoni yopish">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form className="tg-composer" onSubmit={handleSend}>
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
                        disabled={sending}
                        onClick={() => setAttachMenuOpen((v) => !v)}
                        style={{
                          background: attachMenuOpen || attachedMedia ? "var(--tg-hover-bg)" : "transparent",
                          border: "1px solid",
                          borderColor: attachMenuOpen || attachedMedia ? "var(--tg-accent)" : "var(--tg-border)",
                          borderRadius: "50%",
                          width: "38px",
                          height: "38px",
                          color: attachMenuOpen || attachedMedia ? "var(--tg-accent)" : "var(--tg-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          transform: attachMenuOpen ? "rotate(45deg)" : "none",
                        }}
                      >
                        <Plus size={19} />
                      </button>

                      {attachMenuOpen && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "48px",
                            left: "0",
                            background: "var(--tg-header-bg)",
                            border: "1px solid var(--tg-border)",
                            borderRadius: "14px",
                            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                            padding: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            minWidth: "180px",
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
                              borderRadius: "9px",
                              color: "var(--tg-ink)",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tg-hover-bg)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ color: "var(--tg-accent)", display: "flex" }}><ImageIcon size={17} /></span>
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
                              borderRadius: "9px",
                              color: "var(--tg-ink)",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tg-hover-bg)")}
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
                              borderRadius: "9px",
                              color: "var(--tg-ink)",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tg-hover-bg)")}
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
                      disabled={sending}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="tg-composer-send"
                      disabled={(!replyText.trim() && !attachedMedia) || sending}
                      aria-label="Xabar yuborish"
                    >
                      <Send size={17} />
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "24px", color: "var(--tg-muted)", textAlign: "center", gap: "8px" }}>
              <MessageSquare size={36} style={{ opacity: 0.45 }} />
              <Empty
                text={
                  chatFolder === "open"
                    ? "Hozircha ochiq suhbat tanlanmagan — chapdan tanlang yoki «+ Yangi» bosing"
                    : "Arxivdagi yopilgan suhbatni ko‘rish uchun chap tarafdan tanlang"
                }
              />
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
  "staff.invited": "Xodim qo‘shildi",
  "staff.approved": "Xodim tasdiqlandi",
  "staff.rejected": "Xodim taklifi rad etildi",
  "staff.director_assigned": "Direktor tayinlandi",
  "staff.blocked": "Xodim bloklandi",
  "staff.profile_updated": "Xodim profili yangilandi",
  "staff.avatar_removed": "Xodim rasmi o‘chirildi",
  "staff.sessions_revoked": "Xodim sessiyalari yopildi",
  "staff.permissions_updated": "Xodim ruxsatlari yangilandi",
  "customer.status_updated": "Mijoz holati o‘zgartirildi",
  "customer.profile_updated": "Mijoz profili yangilandi",
  "customer.avatar_removed": "Mijoz rasmi o‘chirildi",
  "customer.sessions_revoked": "Mijoz sessiyalari yopildi",
  "customer.deleted": "Foydalanuvchi o‘chirildi",
  "superadmin.all_accounts_cleared": "Barcha hisoblar tozalandi",
  "partner.registration_submitted": "Yangi hamkor arizasi yuborildi",
  "partner.registration_approved": "Hamkor arizasi tasdiqlandi",
  "partner.registration_rejected": "Hamkor arizasi rad etildi",
  "support.assigned": "Murojaat sanatoriya xodimiga biriktirildi",
  "support.unassigned": "Murojaat Superadminga qaytarildi",
  "auth.bootstrap": "Admin hisobi yaratildi",
  "auth.staff_login": "Xodim tizimga kirdi",
  "auth.login": "Hisobga kirildi",
  "auth.otp_login": "Ilovaga OTP bilan kirildi",
  "auth.logout": "Hisobdan chiqildi",
  "auth.session_revoked": "Qurilma sessiyasi yopildi",
  "auth.other_sessions_revoked": "Boshqa qurilmalar yopildi",
  "auth.bruteforce_alert": "Ko‘p xato parol urinishi",
  "auth.partner_forgot_password": "Parol tiklash so‘rovi",
  "account.profile_updated": "Shaxsiy profil yangilandi",
  "account.phone_changed": "Telefon raqami o‘zgartirildi",
  "sanatorium.created": "Sanatoriya yaratildi",
  "sanatorium.draft_created": "Profil qoralamasi yaratildi",
  "sanatorium.draft_saved": "Profil saqlandi",
  "sanatorium.submitted": "Profil tekshiruvga yuborildi",
  "sanatorium.approved": "Profil tasdiqlandi",
  "sanatorium.changes_requested": "Profilga tuzatish so‘raldi",
  "sanatorium.featured_updated": "Mashhur sanatoriyalar tanlovi yangilandi",
  "sanatorium.config_updated": "Sanatoriya sozlamalari yangilandi",
  "sanatorium.paused": "Sanatoriya to‘xtatildi",
  "sanatorium.archived": "Sanatoriya arxivlandi",
  "sanatorium.reopened": "Sanatoriya qayta faollashtirildi",
  "bank.change_requested": "Bank rekvizitlari yuborildi",
  "bank.approved": "Bank rekvizitlari tasdiqlandi",
  "booking.hold_created": "Xona vaqtincha band qilindi",
  "booking.manual_created": "Qo‘lda bron yaratildi",
  "booking.checked_in": "Mehmon joylashtirildi",
  "booking.checked_out": "Yashash yakunlandi",
  "booking.no_show": "Mehmon kelmadi (no-show)",
  "booking.cancelled": "Bron bekor qilindi",
  "booking.room_moved": "Mehmon boshqa xonaga ko‘chirildi",
  "payment.performed": "To‘lov tasdiqlandi",
  "payment.succeeded": "To‘lov muvaffaqiyatli yakunlandi",
  "payment.cancelled": "To‘lov bekor qilindi",
  "offline_payment.recorded": "Naqd/terminal to‘lov kiritildi",
  "offline_payment.verified": "Naqd/terminal to‘lov tasdiqlandi",
  "refund.requested": "Pul qaytarish so‘raldi",
  "refund.approved": "Pul qaytarish tasdiqlandi",
  "refund.rejected": "Pul qaytarish rad etildi",
  "payout.created": "O‘tkazma yaratildi",
  "payout.bank_verified": "Bank o‘tkazmasi tekshirildi",
  "reconciliation.imported": "Solishtirish reestri yuklandi",
  "report.exported": "Hisobot eksport qilindi",
  "ad.requested": "Reklama so‘rovi yuborildi",
  "ad.approved": "Reklama tasdiqlandi",
  "ad.rejected": "Reklama rad etildi",
  "billing.plan_created": "Abonent tarifi yaratildi",
  "telegram.link_started": "Telegram ulash boshlandi",
  "telegram.link_confirmed": "Telegram bot ulandi",
  "telegram.disconnected": "Telegram bot uzildi",
  "media.uploaded": "Fayl/surat yuklandi",
  "message.sent": "Xabar / e’lon yuborildi",
  "message.broadcast": "Ommaviy e’lon yuborildi",
  "message.deleted": "E’lon o‘chirildi",
  "support.opened": "Yangi yordam murojaati ochildi",
  "support.replied": "Yordam suhbatiga javob yozildi",
  "support.closed": "Yordam murojaati yopildi",
  "review.created": "Yangi sharh qoldirildi",
  "review.replied": "Sharhga javob yozildi",
  "review.moderated": "Sharh moderatsiya qilindi",
  "task.created": "Vazifa yaratildi",
  "task.updated": "Vazifa holati yangilandi",
  "inventory.room_type_created": "Xona turi qo‘shildi",
  "inventory.room_created": "Xona qo‘shildi",
  "inventory.block_created": "Xona ta’mirga yopildi",
  "inventory.block_released": "Xona ta’mirdan ochildi",
  "pricing.rate_plan_created": "Tarif rejasi yaratildi",
  "pricing.rate_plan_updated": "Tarif rejasi yangilandi",
};
function formatAuditDetail(r: Row): string {
  const after = (r.after && typeof r.after === "object" ? r.after : {}) as Record<string, any>;
  const before = (r.before && typeof r.before === "object" ? r.before : {}) as Record<string, any>;
  if (r.action === "auth.login" || r.action === "auth.logout" || r.action === "auth.otp_login" || r.action === "auth.staff_login") {
    const parts = [
      after.device,
      after.ip ? `IP: ${after.ip}` : null,
      after.channel === "MOBILE" ? "Mobil ilova" : after.channel === "WEB" ? "Veb panel" : null,
      after.method,
    ].filter(Boolean);
    return parts.join(" · ") || "Hisobga kirish/chiqish sessiyasi";
  }
  if (r.action === "auth.session_revoked") {
    return r.entityId ? `Yopilgan sessiya: ${String(r.entityId).slice(0, 8)}…` : "Boshqa qurilma sessiyasi yopildi";
  }
  if (r.action === "auth.bruteforce_alert") {
    const parts = [
      after.attempted_login ? `@${after.attempted_login}` : null,
      after.attempts ? `${after.attempts} urinish` : null,
      after.ip ? `IP: ${after.ip}` : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Xavfsizlik ogohlantirishi";
  }
  if (r.action === "auth.partner_forgot_password") {
    const parts = [
      after.attempted_login ? `@${after.attempted_login}` : null,
      after.ip ? `IP: ${after.ip}` : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Parolni tiklash so‘rovi";
  }
  if (r.action === "auth.other_sessions_revoked" || r.action === "staff.sessions_revoked" || r.action === "customer.sessions_revoked") {
    const count = after.count ?? after.revoked_count;
    return count !== undefined ? `${count} ta faol qurilma sessiyasi yopildi` : "Sessiyalar yopildi";
  }
  if (r.action === "customer.deleted") {
    const parts = [
      before.name || before.fullName,
      before.phone,
      before.login ? `@${before.login}` : null,
      before.email,
    ].filter(Boolean);
    return parts.join(" · ") || "Foydalanuvchi hisobi o‘chirildi";
  }
  if (r.action === "customer.status_updated") {
    const parts = [
      after.status ? `Holat: ${label[after.status] ?? after.status}` : null,
      after.reason,
    ].filter(Boolean);
    return parts.join(" · ") || "Mijoz holati o‘zgartirildi";
  }
  if (r.action === "superadmin.all_accounts_cleared") {
    const count = before.deletedCount ?? before.deleted_count;
    return count ? `${count} ta hisob o‘chirildi` : "Tozalash yakunlandi";
  }
  if (r.action.startsWith("partner.registration_")) {
    const parts = [
      after.sanatorium_name,
      after.username ? `@${after.username}` : null,
      after.email,
      after.reason,
    ].filter(Boolean);
    return parts.join(" · ") || "Hamkor ro‘yxatdan o‘tish arizasi";
  }
  if (r.action === "support.assigned" || r.action === "support.unassigned") {
    const parts = [after.assigned_to_name, after.sanatorium_name, after.note].filter(Boolean);
    return parts.join(" · ") || "Yordam murojaati";
  }
  if (r.action === "account.profile_updated" || r.action === "staff.profile_updated" || r.action === "customer.profile_updated") {
    const parts = [
      after.name,
      after.login ? `@${after.login}` : null,
      after.email,
      after.phone,
      after.role ? (label[after.role] ?? after.role) : null,
      after.status ? (label[after.status] ?? after.status) : null,
      after.passwordChanged ? "parol yangilandi" : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Profil ma’lumotlari yangilandi";
  }
  if (r.action === "staff.invited" || r.action === "staff.director_assigned") {
    const parts = [
      after.role ? (label[after.role] ?? after.role) : r.action === "staff.director_assigned" ? "Direktor" : null,
      after.status ? (label[after.status] ?? after.status) : null,
      Array.isArray(after.grants) && after.grants.length ? `${after.grants.length} ta ruxsat` : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Jamoa a’zosi biriktirildi";
  }
  if (r.action === "staff.permissions_updated") {
    const grantsCount = Array.isArray(after.grants) ? after.grants.length : null;
    const deniesCount = Array.isArray(after.denies) ? after.denies.length : null;
    const parts = [
      grantsCount !== null ? `Berilgan: ${grantsCount} ta` : null,
      deniesCount ? `Cheklangan: ${deniesCount} ta` : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Xodim vakolatlari yangilandi";
  }
  if (r.action.startsWith("sanatorium.")) {
    const parts = [
      after.name || before.name,
      after.featured !== undefined ? (after.featured ? "Bosh sahifaga qo‘shildi" : "Bosh sahifadan olindi") : null,
      after.payment_ready !== undefined ? (after.payment_ready ? "Onlayn bron ochiq" : "Onlayn bron yopiq") : null,
      after.reason,
      after.status ? (label[after.status] ?? after.status) : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Sanatoriya ma’lumotlari";
  }
  if (r.action.startsWith("booking.")) {
    const parts = [
      after.reference || before.reference,
      after.guest?.name || before.guest?.name,
      after.status ? (label[after.status] ?? after.status) : null,
      after.reason,
    ].filter(Boolean);
    return parts.join(" · ") || (r.entityId ? `Bron: ${String(r.entityId).slice(0, 8)}…` : "Bron amali");
  }
  if (r.action.startsWith("payment.") || r.action.startsWith("offline_payment.") || r.action.startsWith("refund.") || r.action.startsWith("payout.")) {
    const parts = [
      after.method,
      after.provider,
      after.status ? (label[after.status] ?? after.status) : null,
      after.reason,
    ].filter(Boolean);
    return parts.join(" · ") || (r.entityId ? `ID: ${String(r.entityId).slice(0, 8)}…` : "Moliyaviy amal");
  }
  if (r.action === "report.exported") {
    const parts = [after.format, after.from && after.to ? `${after.from} — ${after.to}` : null].filter(Boolean);
    return parts.join(" · ") || "Hisobot yuklandi";
  }
  if (after.title || before.title) return String(after.title || before.title);
  if (after.name || before.name) return String(after.name || before.name);
  if (after.reason) return String(after.reason);
  if (r.note) return String(r.note);
  if (after.status) return `Holat: ${label[after.status] ?? after.status}`;
  if (r.entityId) return `Obyekt: ${String(r.entityId).slice(0, 12)}`;
  return "Tizim amali bajarildi";
}
export function Audit({ initialView = "all" }: { initialView?: "all" | "auth" | "actions" }) {
  const ctx = usePortal();
  const [view, setView] = useState<"all" | "auth" | "actions">(initialView);
  const [selectedSanatorium, setSelectedSanatorium] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [auditSearchInput, setAuditSearchInput] = useState("");
  const [auditQ, setAuditQ] = useState("");
  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  const effectiveSanatorium = ctx.admin
    ? selectedSanatorium || undefined
    : ctx.tenant || undefined;
  return (
    <>
      <PageHeading
        title="Amallar tarixi"
        subtitle="Har bir hisobga kirilgan qurilmalar ta’rifi va IP manzili, shuningdek parol, hamkor arizalari, bronlar va tizim amallari tarixi."
      />
      <div
        className="toolbar"
        style={{ marginBottom: 16, justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`tab ${view === "all" ? "active" : ""}`}
            onClick={() => setView("all")}
          >
            Barchasi
          </button>
          <button
            type="button"
            className={`tab ${view === "auth" ? "active" : ""}`}
            onClick={() => setView("auth")}
          >
            Kirilgan qurilmalar tarixi (Qurilma & IP)
          </button>
          <button
            type="button"
            className={`tab ${view === "actions" ? "active" : ""}`}
            onClick={() => setView("actions")}
          >
            Tizim amallari
          </button>
        </div>
        <div className="toolbar" style={{ margin: 0, gap: 8, alignItems: "center" }}>
          {(view === "all" || view === "actions") && (
            <>
              <input
                type="search"
                placeholder="Amal, ism, #ID yoki @login..."
                value={auditSearchInput}
                onChange={(e) => setAuditSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setAuditQ(auditSearchInput.trim());
                }}
                style={{ minWidth: 200 }}
              />
              <button
                type="button"
                className="button secondary"
                onClick={() => setAuditQ(auditSearchInput.trim())}
              >
                <Search size={15} /> Qidirish
              </button>
            </>
          )}
          {ctx.admin && ctx.tenants.length > 0 && (
            <select
              aria-label="Sanatoriya filtri"
              value={selectedSanatorium}
              onChange={(e) => setSelectedSanatorium(e.target.value)}
            >
              <option value="">Barcha sanatoriyalar va platforma</option>
              {ctx.tenants.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {(view === "all" || view === "actions") && (
            <select
              aria-label="Amal turi filtri"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Barcha tizim amallari</option>
              <option value="auth.login">Hisobga kirishlar</option>
              <option value="auth.otp_login">Mobil OTP kirishlar</option>
              <option value="auth.logout">Hisobdan chiqishlar</option>
              <option value="auth.password_changed">Parol yangilanishi</option>
              <option value="staff.password_reset">Xodim paroli tiklanishi</option>
              <option value="staff.invited">Xodim qo‘shilishi</option>
              <option value="staff.approved">Xodim tasdiqlanishi</option>
              <option value="staff.profile_updated">Xodim profili tahriri</option>
              <option value="customer.profile_updated">Mijoz profili tahriri</option>
              <option value="partner.registration_submitted">Hamkor arizasi yuborilishi</option>
              <option value="partner.registration_approved">Hamkor arizasi tasdiqlanishi</option>
              <option value="partner.registration_rejected">Hamkor arizasi rad etilishi</option>
              <option value="support.assigned">Murojaat biriktirilishi</option>
              <option value="customer.deleted">Foydalanuvchi o‘chirilishi</option>
            </select>
          )}
        </div>
      </div>
      {(view === "all" || view === "auth") && (
        <div style={{ marginBottom: view === "all" ? 20 : 0 }}>
          <AuthHistoryPanel
            mode={ctx.admin ? "superadmin" : "partner"}
            sanatoriumId={ctx.admin ? selectedSanatorium : undefined}
            compact={view === "all"}
          />
        </div>
      )}
      {(view === "all" || view === "actions") && (
        <DataPanel
          path={ctx.admin ? "/superadmin/audit" : "/partner/audit"}
          title="Amallar tarixi (Tizim auditi)"
          params={{
            sanatorium_id: effectiveSanatorium,
            action: actionFilter || undefined,
            q: auditQ || undefined,
          }}
          columns={[
            { label: "Vaqt", render: (r) => dateTime(r.createdAt) },
            {
              label: "Amal",
              render: (r) => {
                if (r.action === "staff.password_reset") return "Xodim paroli tiklandi";
                if (r.action === "auth.password_changed") return "Parol yangilandi";
                if (r.action === "customer.deleted") return "Foydalanuvchi o‘chirildi";
                if (r.action === "superadmin.all_accounts_cleared") return "Barcha hisoblar tozalandi";
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
                return <strong>{auditLabels[r.action] ?? r.action.replace(/[._]/g, " ")}</strong>;
              },
            },
            {
              label: "Tafsilot",
              render: (r) => (
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  {formatAuditDetail(r)}
                </span>
              ),
            },
            {
              label: "Sanatoriya",
              render: (r) =>
                r.sanatorium_name ??
                ctx.tenants.find((s) => s.id === r.sanatoriumId)?.name ??
                "Platforma",
            },
            {
              label: "Manba (Bajaruvchi)",
              render: (r) => (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <strong>{r.actor_name ?? (r.actorId ? "Xodim" : "Provayder / tizim")}</strong>
                    {r.actor_public_id && (
                      <span className="id-chip">#{r.actor_public_id}</span>
                    )}
                  </div>
                  {r.actor_login && <span className="subcell">@{r.actor_login}</span>}
                </div>
              ),
            },
          ]}
        />
      )}
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
  const ctx = usePortal();
  const action = useAction();
  const [selected, setSelected] = useState<Row | null>(null);

  const topics: Record<string, string> = {
    "message.created": "Yangi e’lon va xabar",
    "task.assigned": "Yangi vazifa",
    "survey.created": "Yangi anketa",
    "booking.created": "Yangi bron tasdiqlandi",
    "booking.confirmed": "Bron tasdiqlandi",
    "booking.checked_in": "Mehmon joylashtirildi",
    "booking.checked_out": "Yashash yakunlandi",
    "booking.cancelled": "Bron bekor qilindi",
    "payment.succeeded": "Bron to‘lovi tasdiqlandi",
    "payment.exception": "To‘lovda favqulodda holat",
    "ad.requested": "Yangi reklama arizasi",
    "ad.moderated": "Reklama moderatsiyasi",
    "support.opened": "Yangi murojaat",
    "support.replied": "Murojaatga javob",
    "support.assigned": "Sizga yordam murojaati biriktirildi",
    "sanatorium.submitted": "Sanatoriya anketasi tekshiruvda",
    "sanatorium.moderated": "Profil tekshirildi",
    "staff.invited": "Yangi xodim taklifi",
    "refund.requested": "Pul qaytarish so‘rovi",
    "refund.succeeded": "Pul qaytarildi",
    "partner.password_reset_requested": "Hamkor parolini tiklash so‘rovi",
    "partner.registration_submitted": "Yangi sanatoriya hamkor arizasi",
    "partner.registration_approved": "Hamkor hisobingiz tasdiqlandi",
    "auth.bruteforce_alert": "Xavfsizlik: 1 soatda 5+ xato parol urinishi",
    "provider.sms.failed": "SMS xizmatida uzilish",
    "system.health.issue": "Tizim holati ogohlantirishi",
    "bank.change_requested": "Bank rekviziti o‘zgartirish so‘rovi",
  };

  const handleOpenDetail = async (item: Row) => {
    setSelected(item);
    if (!item.readAt) {
      try {
        await api(`/notifications/${item.id}/read`, "POST");
        item.readAt = new Date().toISOString();
        ctx.refresh();
      } catch {
        // ignore mark error
      }
    }
  };

  const detailText = (payload: any): string => {
    if (!payload) return "";
    if (payload.summary) return String(payload.summary);
    if (payload.body) return String(payload.body);
    if (payload.topic === "partner.password_reset_requested") {
      return `Login: @${payload.attempted_login || "—"} · IP: ${payload.ip || "—"}`;
    }
    if (payload.topic === "partner.registration_submitted") {
      return `${payload.sanatorium_name || "Yangi sanatoriya"} · @${payload.username || "—"} · ${payload.email || "—"}`;
    }
    if (payload.topic === "auth.bruteforce_alert") {
      return `Login: @${payload.attempted_login || "—"} · ${payload.attempts || 5} marta · IP: ${payload.ip || "—"}`;
    }
    if (payload.reason) return String(payload.reason);
    return "";
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

      {selected && (
        <div
          className="modal-backdrop"
          onClick={() => setSelected(null)}
          style={{ zIndex: 1200 }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{
              maxWidth: "560px",
              width: "95%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-heading"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "var(--accent-soft, var(--green-light))",
                    color: "var(--accent, var(--green))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bell size={20} />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      margin: 0,
                      color: "var(--ink)",
                    }}
                  >
                    {selected.payload?.title ||
                      topics[selected.payload?.topic] ||
                      "Bildirishnoma ma’lumotlari"}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                      fontSize: "12px",
                      color: "var(--muted)",
                    }}
                  >
                    <span>{dateTime(selected.createdAt)}</span>
                    <span>•</span>
                    <span
                      className={`badge ${selected.readAt ? "gray" : "blue"}`}
                      style={{ fontSize: "11px", padding: "1px 6px" }}
                    >
                      {selected.readAt ? "O‘qilgan" : "Yangi"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="Yopish"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                padding: "20px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {(selected.payload?.body || selected.payload?.summary) && (
                <div
                  style={{
                    background: "var(--soft)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    padding: "14px",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "var(--ink)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selected.payload?.body || selected.payload?.summary}
                </div>
              )}

              {Array.isArray(selected.payload?.details) &&
                selected.payload.details.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "var(--muted)",
                        marginBottom: "8px",
                      }}
                    >
                      Tafsilotlar
                    </h3>
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {selected.payload.details.map((d: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "9px 14px",
                            fontSize: "13px",
                            borderBottom:
                              idx < selected.payload.details.length - 1
                                ? "1px solid var(--line)"
                                : "none",
                            background:
                              idx % 2 === 0
                                ? "transparent"
                                : "var(--soft)",
                          }}
                        >
                          <span style={{ color: "var(--muted)" }}>
                            {d.label}
                          </span>
                          <strong
                            style={{
                              color: "var(--ink)",
                              textAlign: "right",
                              marginLeft: 12,
                            }}
                          >
                            {d.value}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {(!selected.payload?.details ||
                selected.payload.details.length === 0) &&
                detailText(selected.payload) &&
                !selected.payload?.body && (
                  <div
                    style={{
                      background: "var(--soft)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      fontSize: "13px",
                      color: "var(--ink)",
                    }}
                  >
                    {detailText(selected.payload)}
                  </div>
                )}
            </div>

            <div
              className="modal-footer"
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              {ctx.admin && selected.payload?.topic === "partner.registration_submitted" && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    setSelected(null);
                    ctx.go("partner-registrations");
                  }}
                >
                  Hamkor arizalarini ochish →
                </button>
              )}
              <button
                type="button"
                className="button secondary"
                onClick={() => setSelected(null)}
              >
                Yopish
              </button>
            </div>
          </section>
        </div>
      )}

      <DataPanel
        path="/notifications"
        title="Bildirishnomalar lentasi"
        paged={false}
        renderRow={(r) => (
          <div
            onClick={() => handleOpenDetail(r)}
            style={{
              cursor: "pointer",
              transition: "background 0.15s ease",
              borderRadius: "8px",
            }}
            title="Batafsil ko‘rish uchun bosing"
          >
            <FeedItem
              icon={<Bell size={21} />}
              title={
                r.payload?.title ||
                topics[r.payload?.topic] ||
                "Platforma yangilanishi"
              }
              status={
                <span className={`badge ${r.readAt ? "gray" : "blue"}`}>
                  {r.readAt ? "O‘qilgan" : "Yangi"}
                </span>
              }
              meta={
                detailText(r.payload)
                  ? `${detailText(r.payload)} · ${dateTime(r.createdAt)}`
                  : dateTime(r.createdAt)
              }
              actions={
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    className="button soft"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(r);
                    }}
                    title="Batafsil ma’lumot"
                  >
                    Batafsil
                  </button>
                  {!r.readAt && (
                    <button
                      className="button soft"
                      onClick={(e) => {
                        e.stopPropagation();
                        action(
                          "Bildirishnomani o‘qish",
                          `/notifications/${r.id}/read`,
                        );
                      }}
                    >
                      <Check size={17} />
                      O‘qilgan
                    </button>
                  )}
                </div>
              }
            />
          </div>
        )}
      />
    </>
  );
}

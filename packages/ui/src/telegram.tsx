"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@sihhat/api-client";
import { ErrorBox, Loading } from "./components";

type Connection = {
  enabled: boolean;
  bot_username: string;
  account: { telegram_user_id: string; display_name: string; username: string | null; blocked: boolean } | null;
  link: { id: string; expires_at: string; claimed: boolean; telegram_user_id: string | null; display_name: string | null; username: string | null } | null;
};

export function TelegramSettings() {
  const [data, setData] = useState<Connection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [mine, setMine] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const reload = useCallback(async () => {
    try { setData(await api<Connection>("/telegram/account")); setError(""); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!data?.link) return;
    const timer = setInterval(() => { void reload(); }, 2000);
    return () => clearInterval(timer);
  }, [data?.link?.id, reload]);
  useEffect(() => { setMine(false); }, [data?.link?.telegram_user_id]);
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">XODIMLAR YORDAMCHISI</p><h1>Telegram bot</h1><p className="muted">Bronlar, vazifalar va muhim xabarlarni Telegramda kuzating.</p></div></div>
    {error && <ErrorBox message={error} retry={reload} />}
    {!data ? <Loading /> : <div className="card telegram-connection" style={{ maxWidth: 760, padding: 24 }}>
      {!data.enabled ? <p>Bot hali yoqilmagan. Administrator bilan bog‘laning.</p> : <>
        {data.bot_username && <p><strong>@{data.bot_username}</strong></p>}
        {data.account && <div role="status">
          <h2>Hisob bog‘langan</h2>
          <p><strong>{data.account.display_name}</strong>{data.account.username ? ` · @${data.account.username}` : ""}</p>
          <p className="muted">Telegram ID: {data.account.telegram_user_id}. Bot rolingiz va joriy ruxsatlaringiz asosida ishlaydi.</p>
          {data.account.blocked && <p>Bot Telegramda bloklangan. Telegramdan botni ochib, “Start”ni bosing.</p>}
          {data.bot_username && <a className="button primary" href={`https://t.me/${data.bot_username}`} target="_blank" rel="noreferrer">Botni ochish ↗</a>}
        </div>}
        {!data.account && !data.link && <>
          <h2>Telegram hisobingizni ulang</h2>
          <ol><li>Bir martalik havolani yarating.</li><li>Havola orqali botni ochib, “Start”ni bosing.</li><li>Shu sahifaga qaytib Telegram hisobingizni tekshiring va tasdiqlang.</li></ol>
        </>}
        {data.link && <div style={{ marginTop: 20 }}>
          <h2>{data.link.claimed ? "Telegram hisobini tasdiqlang" : "Botni oching"}</h2>
          <p className="muted">Havola {new Date(data.link.expires_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })} gacha amal qiladi.</p>
          {!data.link.claimed && <>
            {url ? <a className="button primary" href={url} target="_blank" rel="noreferrer">Telegramda ochish ↗</a> : <p>Havolani qayta ochish uchun yangi havola yarating.</p>}
            <p>Botda “Start”ni bosganingizdan keyin bu sahifa avtomatik yangilanadi.</p>
          </>}
          {data.link.claimed && <>
            <p><strong>{data.link.display_name}</strong>{data.link.username ? ` · @${data.link.username}` : ""}<br />Telegram ID: {data.link.telegram_user_id}</p>
            <label style={{ display: "flex", gap: 10, alignItems: "center", margin: "16px 0" }}><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} />Bu mening Telegram akkauntim</label>
            <button className="button primary" disabled={busy || !mine} onClick={() => void perform(async () => {
              await api(`/telegram/link/${data.link!.id}/confirm`, "POST", { telegram_user_id: data.link!.telegram_user_id }); setUrl("");
            })}>Bog‘lashni tasdiqlash</button>
          </>}
        </div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
          <button className="button" disabled={busy} onClick={() => void perform(async () => {
            const result = await api<{ url: string }>("/telegram/link", "POST", {}); setUrl(result.url); setMine(false);
          })}>{data.link || data.account ? "Yangi bog‘lash havolasi" : "Telegramga ulash"}</button>
          <button className="button" disabled={busy} onClick={() => void reload()}>Holatni yangilash</button>
          {(data.account || data.link) && <button className="button" disabled={busy} onClick={() => setDisconnecting(true)}>Bog‘lanishni uzish</button>}
        </div>
        {disconnecting && <div role="alert" style={{ marginTop: 20 }}>
          <p>Telegram bog‘lanishi va joriy havolani bekor qilasizmi? Botdagi xabarlar to‘xtaydi.</p>
          <button className="button" disabled={busy} onClick={() => void perform(async () => { await api("/telegram/disconnect", "POST", {}); setUrl(""); setDisconnecting(false); })}>Ha, uzish</button>{" "}
          <button className="button" disabled={busy} onClick={() => setDisconnecting(false)}>Bekor qilish</button>
        </div>}
      </>}
    </div>}
  </>;
}

"use client";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Plus,
  RefreshCw,
  X,
  Upload,
} from "lucide-react";
import {
  api,
  ApiError,
  formatMoney,
  query,
  toMinor,
  type Actor,
  type Page,
} from "@sihhat/api-client";
import { SelectionGroup } from "./selections";

export type Row = Record<string, any>;
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "password"
    | "textarea"
    | "number"
    | "money"
    | "date"
    | "time"
    | "datetime-local"
    | "select"
    | "multi"
    | "switches"
    | "checks"
    | "checkbox"
    | "csv"
    | "file"
    | "email";
  required?: boolean;
  value?: any;
  options?: { value: string; label: string; disabled?: boolean }[];
  hint?: string;
  min?: number | string;
  max?: number | string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  accept?: string;
  step?: number | string;
};
export type FormSpec = {
  title: string;
  description?: string;
  fields: Field[];
  submit: (values: Row) => Promise<unknown>;
  button?: string;
  done?: () => void;
};
export type PortalContextValue = {
  actor: Actor;
  tenant: string;
  tenants: Row[];
  admin: boolean;
  form: (spec: FormSpec) => void;
  notice: (text: string) => void;
  refresh: () => void;
  epoch: number;
  go: (section: string) => void;
  allowed: (permission: string) => boolean;
};
export const PortalContext = createContext<PortalContextValue>(null!);
export const usePortal = () => useContext(PortalContext);
export function useRemote<T = any>(path: string | null, epoch = 0) {
  const [revision, setRevision] = useState(0);
  const request = `${path}:${epoch}:${revision}`;
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    request: string;
  }>({ data: null, loading: !!path, error: null, request });
  useEffect(() => {
    let live = true;
    if (!path) {
      setState({ data: null, loading: false, error: null, request });
      return;
    }
    setState({ data: null, loading: true, error: null, request });
    api<T>(path)
      .then((data) => {
        if (live) setState({ data, loading: false, error: null, request });
      })
      .catch((e) => {
        if (live)
          setState({ data: null, loading: false, error: e.message, request });
      });
    return () => {
      live = false;
    };
  }, [path, epoch, revision]);
  return {
    ...(state.request === request
      ? state
      : { data: null, loading: !!path, error: null }),
    reload: () => setRevision((r) => r + 1),
  };
}
export const options = (rows: Row[], label = "name", id = "id") =>
  rows.map((r) => ({
    value: String(r[id]),
    label: String(r[label] ?? r.title ?? r.code ?? "Nomsiz"),
  }));
export const list = (value: any): Row[] =>
  Array.isArray(value) ? value : (value?.data ?? []);
export const date = (value: any) =>
  value
    ? new Intl.DateTimeFormat("uz-UZ", {
        timeZone: "Asia/Tashkent",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
export const localDate = (offset = 0) =>
  new Date(Date.now() + offset * 86400000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tashkent",
  });
export const label: Record<string, string> = {
  ACTIVE: "Faol",
  DRAFT: "Qoralama",
  SUBMITTED: "Tekshiruvda",
  APPROVED: "Tasdiqlangan",
  CHANGES_REQUESTED: "Tuzatish kerak",
  PAUSED: "To‘xtatilgan",
  ARCHIVED: "Arxivlangan",
  PENDING_APPROVAL: "Tasdiq kutilmoqda",
  PENDING: "Kutilmoqda",
  BLOCKED: "Bloklangan",
  REVOKED: "Bekor qilingan",
  REJECTED: "Rad etilgan",
  HOLD: "To‘lov kutilmoqda",
  PAYMENT_PENDING: "Provayderda kutilmoqda",
  CONFIRMED: "Bron tasdiqlangan",
  CHECKED_IN: "Joylashgan",
  CHECKED_OUT: "Yakunlangan",
  NO_SHOW: "Kelmagan",
  CANCELLED: "Bekor qilingan",
  EXPIRED: "Muddati tugagan",
  PAYMENT_EXCEPTION: "To‘lovni tekshirish kerak",
  SUCCEEDED: "Muvaffaqiyatli",
  CREATED: "Yaratilgan",
  REQUESTED: "So‘ralgan",
  PROCESSING: "Bajarilmoqda",
  FAILED: "Xatolik",
  PAID: "To‘langan",
  UNPAID: "To‘lanmagan",
  UNVERIFIED: "Tekshirilmagan",
  VERIFIED: "Tekshirilgan",
  CORRECTED: "Tuzatilgan",
  TRIAL: "Sinov davri",
  SUSPENDED: "Cheklangan",
  PAST_DUE: "Imtiyozli muddat",
  ASSIGNED: "Yangi vazifa",
  ACCEPTED: "Qabul qilingan",
  COMPLETED: "Bajarilgan",
  PUBLISHED: "Ko‘rinmoqda",
  HIDDEN: "Yashirilgan",
  OPEN: "Ochiq",
  CLOSED: "Yopilgan",
  DIRECTOR: "Direktor",
  RECEPTION: "Resepshn",
  APP: "Ilova",
  PHONE: "Telefon",
  WALK_IN: "Shaxsan",
  PARTNER_MANUAL: "Hamkor",
  ROOM: "Xona uchun",
  PERSON: "Bir kishi uchun",
  SUBSCRIPTION: "Abonent to‘lovi",
  AD: "Reklama",
  FULL_BEFORE_CUTOFF: "Muddatgacha to‘liq qaytarish",
  NON_REFUNDABLE: "Qaytarilmaydi",
  CASH: "Naqd",
  TERMINAL: "Terminal",
};
export function Badge({ value }: { value: string }) {
  const tone = [
    "ACTIVE",
    "APPROVED",
    "CONFIRMED",
    "CHECKED_OUT",
    "SUCCEEDED",
    "PAID",
    "VERIFIED",
    "PUBLISHED",
    "COMPLETED",
  ].includes(value)
    ? "green"
    : ["FAILED", "REJECTED", "BLOCKED", "PAYMENT_EXCEPTION"].includes(value)
      ? "red"
      : [
            "PENDING",
            "HOLD",
            "SUBMITTED",
            "PENDING_APPROVAL",
            "REQUESTED",
            "UNPAID",
            "UNVERIFIED",
            "PAYMENT_PENDING",
          ].includes(value)
        ? "amber"
        : "gray";
  return <span className={`badge ${tone}`}>{label[value] ?? value}</span>;
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={20} />
      <div>
        {message}
        {retry && (
          <button className="text-button" onClick={retry}>
            Qayta urinish
          </button>
        )}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="skeletons" aria-label="Yuklanmoqda" role="status">
      {[1, 2, 3].map((n) => (
        <div key={n} />
      ))}
    </div>
  );
}
export function Empty({ text = "Hozircha ma’lumot yo‘q" }: { text?: string }) {
  return (
    <div className="empty">
      <div className="empty-symbol">○</div>
      <h3>{text}</h3>
      <p>Yangi yozuvlar shu yerda ko‘rinadi.</p>
    </div>
  );
}
export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">SIHHAT.UZ</p>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="toolbar">{children}</div>
    </div>
  );
}
export function AddButton({
  onClick,
  children = "Qo‘shish",
  disabled = false,
}: {
  onClick: () => void;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button className="button primary" onClick={onClick} disabled={disabled}>
      <Plus size={17} />
      {children}
    </button>
  );
}
export function Card({
  title,
  children,
  aside,
}: {
  title?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="card">
      {title && (
        <div className="card-heading">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export type Column = {
  label: string;
  key?: string;
  render?: (r: Row) => ReactNode;
};
export function Table({
  rows,
  columns,
  actions,
}: {
  rows: Row[];
  columns: Column[];
  actions?: (r: Row) => ReactNode;
}) {
  return !rows.length ? (
    <Empty />
  ) : (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
            {actions && <th>Amallar</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => (
            <tr key={r.id ?? index}>
              {columns.map((c) => (
                <td key={c.label}>
                  {c.render ? c.render(r) : (r[c.key!] ?? "—")}
                </td>
              ))}
              {actions && (
                <td>
                  <div className="row-actions">{actions(r)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pager({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        {total} ta yozuv · {page}/{Math.max(1, pages)} sahifa
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Oldingi sahifa"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Keyingi sahifa"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function DataPanel({
  path,
  columns,
  actions,
  title,
  paged = true,
  params = {},
  filter,
}: {
  path: string | null;
  columns: Column[];
  actions?: (r: Row, reload: () => void) => ReactNode;
  title?: string;
  paged?: boolean;
  params?: Row;
  filter?: (r: Row) => boolean;
}) {
  const { epoch } = usePortal();
  const [page, setPage] = useState(1);
  const signature = JSON.stringify(params);
  useEffect(() => setPage(1), [path, signature]);
  const remote = useRemote(
    path
      ? path + query({ ...params, ...(paged ? { page, limit: 15 } : {}) })
      : null,
    epoch,
  );
  const rows = list(remote.data).filter(filter ?? (() => true));
  return (
    <Card
      title={title}
      aside={
        <button
          className="icon-button"
          aria-label="Yangilash"
          onClick={remote.reload}
        >
          <RefreshCw size={16} />
        </button>
      }
    >
      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
      ) : (
        <>
          <Table
            rows={rows}
            columns={columns}
            actions={actions ? (r) => actions(r, remote.reload) : undefined}
          />
          {paged && remote.data && (
            <Pager
              page={page}
              pages={remote.data.pages ?? 1}
              total={remote.data.total ?? rows.length}
              onChange={setPage}
            />
          )}
        </>
      )}
    </Card>
  );
}
export const statusColumn: Column = {
  label: "Holat",
  render: (r) => <Badge value={r.status} />,
};
export const moneyColumn: Column = {
  label: "Summa",
  render: (r) => <strong className="money">{formatMoney(r.amount)}</strong>,
};
export function Act({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`text-button ${danger ? "danger-text" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function useAction() {
  const ctx = usePortal();
  return (
    title: string,
    path: string,
    body: Row = {},
    fields: Field[] = [],
    method = "POST",
    done?: () => void,
  ) =>
    ctx.form({
      title,
      fields,
      submit: (v) => api(path, method, { ...body, ...v }),
      done: () => {
        ctx.refresh();
        done?.();
      },
    });
}
export async function uploadAsset(
  file: File,
  tenant: string,
  revision?: string,
  visibility = "PRIVATE",
) {
  if (!file || !file.size) throw new Error("Faylni tanlang.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("Fayl hajmi 8 MB dan oshmasin.");
  const base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return api("/partner/media", "POST", {
    sanatorium_id: tenant,
    ...(revision ? { revision_id: revision } : {}),
    visibility,
    mime: file.type,
    base64,
  });
}
export function FormDialog({
  spec,
  onClose,
  notice,
}: {
  spec: FormSpec;
  onClose: () => void;
  notice: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [details, setDetails] = useState<Row[]>([]);
  const formRef = useRef<HTMLFormElement>(null),
    id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const nodes = Array.from(
          formRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input:not([disabled]),select,textarea",
          ) ?? [],
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    formRef.current
      ?.querySelector<HTMLElement>("input,select,textarea,button")
      ?.focus();
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [busy, onClose]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDetails([]);
    try {
      const data = new FormData(formRef.current!);
      const values: Row = {};
      for (const f of spec.fields) {
        const v = data.get(f.key);
        if (f.type === "checkbox") values[f.key] = v === "on";
        else if (["multi", "switches", "checks"].includes(f.type ?? ""))
          values[f.key] = data.getAll(f.key);
        else if (f.type === "file") {
          if (v instanceof File && v.size) values[f.key] = v;
        } else if (v !== null && String(v) !== "") {
          values[f.key] =
            f.type === "number"
              ? Number(v)
              : f.type === "money"
                ? toMinor(String(v))
                : f.type === "csv"
                  ? String(v)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : f.type === "datetime-local"
                    ? new Date(String(v) + "+05:00").toISOString()
                    : String(v);
        } else if (f.required) values[f.key] = "";
      }
      await spec.submit(values);
      notice("Muvaffaqiyatli bajarildi");
      onClose();
      spec.done?.();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && Array.isArray(e.details))
        setDetails(e.details);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="modal-heading">
          <div>
            <h2 id={id}>{spec.title}</h2>
            {spec.description && <p className="muted">{spec.description}</p>}
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Yopish"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <form ref={formRef} onSubmit={submit}>
          <div className="form-grid">
            {spec.fields.map((f) =>
              f.type === "switches" || f.type === "checks" ? (
                <SelectionGroup
                  key={f.key}
                  name={f.key}
                  label={f.label}
                  options={f.options ?? []}
                  defaultValue={f.value ?? []}
                  switches={f.type === "switches"}
                  hint={f.hint}
                />
              ) : (
                <label
                  key={f.key}
                  className={`field ${f.type === "textarea" || f.type === "multi" ? "wide" : ""}`}
                >
                  <span>
                    {f.label}
                    {f.required && <b className="required"> *</b>}
                  </span>
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.key}
                      defaultValue={f.value ?? ""}
                      required={f.required}
                      minLength={f.minLength}
                      maxLength={f.maxLength}
                      rows={4}
                    />
                  ) : f.type === "select" || f.type === "multi" ? (
                    <select
                      name={f.key}
                      multiple={f.type === "multi"}
                      defaultValue={f.value ?? (f.type === "multi" ? [] : "")}
                      required={f.required}
                    >
                      {f.type !== "multi" && <option value="">Tanlang</option>}
                      {f.options?.map((o) => (
                        <option
                          value={o.value}
                          disabled={o.disabled}
                          key={o.value}
                        >
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "checkbox" ? (
                    <div className="check-field">
                      <input
                        name={f.key}
                        type="checkbox"
                        defaultChecked={!!f.value}
                        required={f.required}
                      />
                      <span>{f.hint ?? "Ha"}</span>
                    </div>
                  ) : (
                    <input
                      name={f.key}
                      type={
                        ["money", "csv"].includes(f.type ?? "")
                          ? "text"
                          : (f.type ?? "text")
                      }
                      defaultValue={
                        f.type === "file" ? undefined : (f.value ?? "")
                      }
                      required={f.required}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      minLength={f.minLength}
                      maxLength={f.maxLength}
                      pattern={f.pattern}
                      accept={f.accept}
                      inputMode={f.type === "money" ? "decimal" : undefined}
                      autoComplete={
                        f.type === "password" ? "new-password" : undefined
                      }
                    />
                  )}{" "}
                  {f.hint && f.type !== "checkbox" && <small>{f.hint}</small>}
                </label>
              ),
            )}
          </div>
          {error && <ErrorBox message={error} />}{" "}
          {!!details.length && (
            <ul className="validation-list">
              {details.map((d, i) => (
                <li key={i}>
                  {spec.fields.find(
                    (f) => d.path === f.key || d.path?.endsWith("." + f.key),
                  )?.label ??
                    d.field ??
                    "Ma’lumot"}
                  : {d.message}
                </li>
              ))}
            </ul>
          )}
          <div className="modal-footer">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={onClose}
            >
              Yopish
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Check size={17} />
              )}{" "}
              {spec.button ?? "Saqlash"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@sihhat/api-client";
import {
  Card,
  ErrorBox,
  PageHeading,
  type Field,
  type Row,
} from "./components";
import { SelectionGroup } from "./selections";
import {TimePicker} from './date-time';

function fieldError(f: Field, data: Row): string | null {
  const v = data[f.key];
  if (f.type === "checkbox")
    return f.required && v !== true ? "Xizmat shartlarini qabul qiling." : null;
  if (v === undefined || v === null || String(v).trim() === "")
    return f.required ? "Bu maydonni to‘ldiring." : null;
  if (f.type === "number") {
    if (!Number.isFinite(Number(v))) return "Raqam kiriting.";
    if (f.min !== undefined && Number(v) < Number(f.min))
      return `Qiymat ${f.min} dan kam bo‘lmasin.`;
    if (f.max !== undefined && Number(v) > Number(f.max))
      return `Qiymat ${f.max} dan oshmasin.`;
  }
  if (f.minLength && String(v).trim().length < f.minLength)
    return `Kamida ${f.minLength} ta belgi kiriting.`;
  if (f.maxLength && String(v).length > f.maxLength)
    return `Ko‘pi bilan ${f.maxLength} ta belgi kiriting.`;
  if (f.pattern && !new RegExp(`^(?:${f.pattern})$`).test(String(v)))
    return f.hint || "Qiymat shaklini tekshiring.";
  if (f.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)))
    return "Vaqtni HH:MM shaklida kiriting.";
  return null;
}
const groups = [
  {
    title: "Asosiy ma’lumot",
    keys: ["name", "description", "legal_name", "stir"],
  },
  {
    title: "Manzil va vaqt",
    keys: [
      "region",
      "address",
      "map_url",
      "contact_phone",
      "check_in_time",
      "check_out_time",
    ],
  },
  { title: "Sharoit va xizmat", keys: ["amenities", "services", "meals"] },
  {
    title: "Mehmon talablari",
    keys: [
      "child_rules",
      "medical_requirements",
      "directions",
      "required_documents",
      "terms_accepted",
    ],
  },
];
export function ProfileWizard({
  revision,
  fields,
  onClose,
  onComplete,
}: {
  revision: Row;
  fields: Field[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const initial: Row = { ...revision.data };
  if (
    !initial.map_url &&
    typeof initial.latitude === "number" &&
    typeof initial.longitude === "number"
  )
    initial.map_url = `https://www.google.com/maps/search/?api=1&query=${initial.latitude},${initial.longitude}`;
  for (const f of fields) {
    if (initial[f.key] === undefined && !f.required)
      initial[f.key] = ["csv", "checks"].includes(f.type ?? "") ? [] : "";
  }
  const [data, setData] = useState<Row>(initial),
    [step, setStep] = useState(0),
    [state, setState] = useState("Qoralama"),
    [error, setError] = useState(""),
    [validation, setValidation] = useState<Record<string, string>>({}),
    [moving, setMoving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const current = useRef(data),
    version = useRef(revision.version),
    last = useRef(JSON.stringify(revision.data)),
    saving = useRef<Promise<boolean> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    live = useRef(true),
    conflict = useRef(false);
  current.current = data;
  async function save(): Promise<boolean> {
    if (saving.current) return saving.current;
    if (conflict.current) return false;
    const snapshot = JSON.stringify(current.current);
    if (snapshot === last.current) return true;
    setState("Saqlanmoqda…");
    let stored = false;
    saving.current = api(
      `/partner/sanatorium-revisions/${revision.id}`,
      "PATCH",
      { version: version.current, data: JSON.parse(snapshot) },
    )
      .then((r) => {
        version.current = r.version;
        last.current = snapshot;
        stored = true;
        if (live.current) {
          setError("");
          setState("Avtomatik saqlandi");
        }
        return true;
      })
      .catch((e: ApiError) => {
        if (e.code === "VERSION_CONFLICT") conflict.current = true;
        if (live.current) {
          const details = Array.isArray(e.details)
            ? e.details
                .map(
                  (d: Row) =>
                    `${fields.find((f) => d.path?.endsWith(f.key))?.label ?? d.field ?? "Ma’lumot"}: ${d.message}`,
                )
                .join("; ")
            : "";
          setError(
            e.code === "VERSION_CONFLICT"
              ? "Profil boshqa xodim tomonidan o‘zgartirilgan. Oxirgi versiyani ochish uchun tahrirni yoping."
              : details || e.message,
          );
          setState("Saqlanmadi");
        }
        return false;
      })
      .finally(() => {
        saving.current = null;
        if (
          stored &&
          live.current &&
          last.current !== JSON.stringify(current.current)
        ) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            void save();
          }, 700);
        }
      });
    return saving.current;
  }
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save();
    }, 700);
  }, [JSON.stringify(data)]);
  async function flush() {
    do {
      if (timer.current) clearTimeout(timer.current);
      if (!(await save())) return false;
    } while (last.current !== JSON.stringify(current.current));
    if (timer.current) clearTimeout(timer.current);
    return true;
  }
  function update(f: Field, value: string | boolean | string[]) {
    const parsed =
      f.type === "checkbox"
        ? value
        : f.type === "csv"
          ? String(value)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : f.type === "number"
            ? value === ""
              ? null
              : Number(value)
            : value;
    setData((d) => ({ ...d, [f.key]: parsed }));
    setValidation((v) => {
      const next = { ...v };
      delete next[f.key];
      return next;
    });
    setState("O‘zgarishlar saqlanadi…");
  }
  const required = fields.filter((f) => f.required),
    complete = required.filter((f) => !fieldError(f, data)).length,
    progress = Math.round((complete / required.length) * 100);
  useEffect(() => {
    const first = fields.find(
      (f) => validation[f.key] && groups[step].keys.includes(f.key),
    );
    if (first)
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${first.key}"]`)
        ?.focus();
  }, [validation, step]);
  async function move(target: number | "close" | "complete") {
    setMoving(true);
    try {
      if (!(await flush())) return;
      if (target === "close") onClose();
      else if (target === "complete") onComplete();
      else setStep(target);
    } finally {
      if (live.current) setMoving(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Sanatoriya anketasi"
        subtitle="Qoralama tahrirlari avtomatik saqlanadi. Nashr uchun profilni tekshiruvga yuboring."
      >
        <button
          className="button secondary"
          disabled={moving}
          onClick={() => {
            if (conflict.current) onClose();
            else void move("close");
          }}
        >
          {conflict.current ? "Oxirgi versiyani ochish" : "Tahrirni yopish"}
        </button>
      </PageHeading>
      <Card
        title={`${complete}/${required.length} asosiy maydon to‘ldirilgan`}
        aside={
          <span className="muted" role="status">
            {state}
          </span>
        }
      >
        <div className="card-body">
          <div className="occupancy-track">
            <div style={{ width: `${progress}%` }} />
          </div>
          <div className="tabs">
            {groups.map((g, n) => (
              <button
                key={g.title}
                className={`tab ${step === n ? "active" : ""}`}
                disabled={moving}
                onClick={() => {
                  void move(n);
                }}
              >
                {n + 1}. {g.title}
              </button>
            ))}
          </div>
          <form
            ref={formRef}
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const final = step === groups.length - 1;
              const errors: Record<string, string> = {};
              for (const f of fields.filter(
                (f) => final || groups[step].keys.includes(f.key),
              )) {
                const message = fieldError(f, current.current);
                if (message) errors[f.key] = message;
              }
              setValidation(errors);
              if (Object.keys(errors).length) {
                const first = groups.findIndex((g) =>
                  g.keys.some((k) => errors[k]),
                );
                if (first >= 0) setStep(first);
                return;
              }
              await move(final ? "complete" : step + 1);
            }}
          >
            <div className="form-grid">
              {fields
                .filter((f) => groups[step].keys.includes(f.key))
                .map((f) =>
                  f.type === "checks" ? (
                    <SelectionGroup
                      key={f.key}
                      name={f.key}
                      label={f.label}
                      options={f.options ?? []}
                      value={data[f.key] ?? []}
                      onChange={(values) => update(f, values)}
                      hint={f.hint}
                    />
                  ) : (
                    <label
                      key={f.key}
                      className={`field ${f.type === "textarea" ? "wide" : ""}`}
                    >
                      <span>
                        {f.label}
                        {f.required ? " *" : ""}
                      </span>
                      {f.type === "checkbox" ? (
                        <div className="check-field">
                          <input
                            type="checkbox"
                            name={f.key}
                            aria-invalid={!!validation[f.key]}
                            checked={!!data[f.key]}
                            onChange={(e) => update(f, e.target.checked)}
                          />
                          <span>{f.hint}</span>
                        </div>
                      ) : f.type === "time" ? (
                        <TimePicker name={f.key} label={f.label} value={data[f.key]??""} required={f.required} onChange={value=>update(f,value)}/>
                      ) : f.type === "textarea" ? (
                        <textarea
                          name={f.key}
                          aria-invalid={!!validation[f.key]}
                          value={data[f.key] ?? ""}
                          onChange={(e) => update(f, e.target.value)}
                          rows={4}
                          minLength={f.minLength}
                          maxLength={f.maxLength}
                        />
                      ) : (
                        <input
                          name={f.key}
                          aria-invalid={!!validation[f.key]}
                          type={f.type === "csv" ? "text" : (f.type ?? "text")}
                          value={
                            Array.isArray(data[f.key])
                              ? data[f.key].join(", ")
                              : (data[f.key] ?? "")
                          }
                          onChange={(e) => update(f, e.target.value)}
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          pattern={f.pattern}
                          minLength={f.minLength}
                          maxLength={f.maxLength}
                        />
                      )}{" "}
                      {f.hint && f.type !== "checkbox" && (
                        <small>{f.hint}</small>
                      )}
                      {validation[f.key] && (
                        <span className="field-error" role="alert">
                          {f.label}: {validation[f.key]}
                        </span>
                      )}
                    </label>
                  ),
                )}
            </div>
            {error && (
              <ErrorBox
                message={error}
                retry={() => {
                  void flush();
                }}
              />
            )}
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                disabled={moving}
                hidden={step === 0}
                onClick={() => {
                  void move(step - 1);
                }}
              >
                Oldingi qadam
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={moving}
              >
                {moving
                  ? "Saqlanmoqda…"
                  : step === groups.length - 1
                    ? "Saqlash va rasmlarga o‘tish"
                    : "Saqlash va davom etish"}
              </button>
            </div>
          </form>
          {step === groups.length - 1 && (
            <p className="muted">
              Keyingi ish: profilning «Rasmlar va hujjatlar» bo‘limida fayllarni
              yuklang; xona va tariflarni to‘ldirib, tekshiruvga yuboring.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}

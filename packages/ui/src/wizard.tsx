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
      "latitude",
      "longitude",
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
}: {
  revision: Row;
  fields: Field[];
  onClose: () => void;
}) {
  const initial: Row = { ...revision.data };
  for (const f of fields) {
    if (initial[f.key] === undefined && !f.required)
      initial[f.key] = f.type === "csv" ? [] : "";
  }
  const [data, setData] = useState<Row>(initial),
    [step, setStep] = useState(0),
    [state, setState] = useState("Qoralama"),
    [error, setError] = useState("");
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
    saving.current = api(
      `/partner/sanatorium-revisions/${revision.id}`,
      "PATCH",
      { version: version.current, data: JSON.parse(snapshot) },
    )
      .then((r) => {
        version.current = r.version;
        last.current = snapshot;
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
                    `${fields.find((f) => d.path?.endsWith(f.key))?.label ?? "Ma’lumot"}: ${d.message}`,
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
    if (timer.current) clearTimeout(timer.current);
    if (saving.current && !(await saving.current)) return false;
    return save();
  }
  function update(f: Field, value: string | boolean) {
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
              ? undefined
              : Number(value)
            : value;
    setData((d) => ({ ...d, [f.key]: parsed }));
    setState("O‘zgarishlar saqlanadi…");
  }
  const required = fields.filter((f) => f.required),
    complete = required.filter((f) =>
      f.type === "checkbox"
        ? data[f.key] === true
        : data[f.key] !== undefined && data[f.key] !== "",
    ).length,
    progress = Math.round((complete / required.length) * 100);
  return (
    <>
      <PageHeading
        title="Sanatoriya anketasi"
        subtitle="Qoralama tahrirlari avtomatik saqlanadi. Nashr uchun profilni tekshiruvga yuboring."
      >
        <button
          className="button secondary"
          onClick={async () => {
            await flush();
            onClose();
          }}
        >
          Tahrirni yopish
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
                onClick={async () => {
                  await flush();
                  setStep(n);
                }}
              >
                {n + 1}. {g.title}
              </button>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await flush())
                setStep((s) => Math.min(groups.length - 1, s + 1));
            }}
          >
            <div className="form-grid">
              {fields
                .filter((f) => groups[step].keys.includes(f.key))
                .map((f) => (
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
                          checked={!!data[f.key]}
                          onChange={(e) => update(f, e.target.checked)}
                        />
                        <span>{f.hint}</span>
                      </div>
                    ) : f.type === "textarea" ? (
                      <textarea
                        value={data[f.key] ?? ""}
                        onChange={(e) => update(f, e.target.value)}
                        rows={4}
                        minLength={f.minLength}
                      />
                    ) : (
                      <input
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
                      />
                    )}{" "}
                    {f.hint && f.type !== "checkbox" && <small>{f.hint}</small>}
                  </label>
                ))}
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
                disabled={step === 0}
                onClick={async () => {
                  await flush();
                  setStep((s) => s - 1);
                }}
              >
                Oldingi qadam
              </button>
              <button className="button primary" type="submit">
                {step === groups.length - 1
                  ? "Saqlash"
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

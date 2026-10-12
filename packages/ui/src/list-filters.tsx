"use client";
import { useEffect, useRef, useState } from "react";
import { label, usePortal } from "./components";

export function useSavedFilters(
  section: string,
  initial: Record<string, string>,
) {
  const ctx = usePortal();
  const key = `sihhat:filters:v1:${ctx.actor.id}:${ctx.tenant}:${section}`;
  const defaults = useRef(initial);
  const [values, setValues] = useState(initial),
    [loaded, setLoaded] = useState("");
  useEffect(() => {
    let next = { ...defaults.current };
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
      const choices: Record<string, string[]> = {
        role: ["", "DIRECTOR", "RECEPTION", "ACCOUNTANT"],
        date_kind: ["ARRIVAL", "DEPARTURE", "CREATED"],
        status:
          section === "staff"
            ? [
                "",
                "ACTIVE",
                "PENDING_APPROVAL",
                "REJECTED",
                "REVOKED",
                "BLOCKED",
              ]
            : section === "payments"
              ? [
                  "",
                  "CREATED",
                  "PENDING",
                  "SUCCEEDED",
                  "CANCELLED",
                  "REFUNDED",
                  "FAILED",
                ]
              : [
                  "",
                  "HOLD",
                  "PAYMENT_PENDING",
                  "CONFIRMED",
                  "CHECKED_IN",
                  "CHECKED_OUT",
                  "CANCELLED",
                  "NO_SHOW",
                  "EXPIRED",
                  "PAYMENT_EXCEPTION",
                ],
      };
      for (const name of Object.keys(next)) {
        const value = saved[name];
        if (typeof value !== "string" || value.length > 30) continue;
        if (choices[name] && !choices[name].includes(value)) continue;
        if (
          ["from", "to"].includes(name) &&
          value &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
            !Number.isFinite(Date.parse(value)))
        )
          continue;
        next[name] = value;
      }
    } catch {
      /* Storage may be unavailable; filters still work in memory. */
    }
    setValues(next);
    setLoaded(key);
  }, [key, section]);
  useEffect(() => {
    if (loaded !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(values));
    } catch {
      /* Optional preference storage. */
    }
  }, [key, loaded, values]);
  return {
    values: loaded === key ? values : defaults.current,
    set: (name: string, value: string) =>
      setValues((previous) => ({ ...previous, [name]: value })),
    reset: () => setValues({ ...defaults.current }),
  };
}

export function ListFilters({
  search,
  setSearch,
  apply,
  reset,
  filters,
  setFilter,
  statuses,
  dates = false,
  dateKinds = false,
  roles = false,
  placeholder = "Bron raqami, mehmon ismi yoki telefon",
}: {
  search: string;
  setSearch: (value: string) => void;
  apply: () => void;
  reset: () => void;
  filters: Record<string, string>;
  setFilter: (name: string, value: string) => void;
  statuses?: string[];
  dates?: boolean;
  dateKinds?: boolean;
  roles?: boolean;
  placeholder?: string;
}) {
  return (
    <form
      className="filters list-filters"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <label className="field search-field">
        <span>Qidirish</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          maxLength={120}
          autoComplete="off"
        />
      </label>
      {statuses && (
        <label className="field">
          <span>Holat</span>
          <select aria-label="Holat"
            value={filters.status}
            onChange={(event) => setFilter("status", event.target.value)}
          >
            <option value="">Barchasi</option>
            {statuses.map((status) => (
              <option value={status} key={status}>
                {label[status] ?? status}
              </option>
            ))}
          </select>
        </label>
      )}
      {roles && (
        <label className="field">
          <span>Lavozim</span>
          <select aria-label="Lavozim"
            value={filters.role}
            onChange={(event) => setFilter("role", event.target.value)}
          >
            <option value="">Barchasi</option>
            {["DIRECTOR", "RECEPTION", "ACCOUNTANT"].map((role) => (
              <option value={role} key={role}>
                {label[role]}
              </option>
            ))}
          </select>
        </label>
      )}
      {dateKinds && (
        <label className="field">
          <span>Sana turi</span>
          <select aria-label="Sana turi"
            value={filters.date_kind}
            onChange={(event) => setFilter("date_kind", event.target.value)}
          >
            <option value="ARRIVAL">Kelish sanasi</option>
            <option value="DEPARTURE">Ketish sanasi</option>
            <option value="CREATED">Yaratilgan sana</option>
          </select>
        </label>
      )}
      {dates && (
        <>
          <label className="field">
            <span>Davr boshi</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilter("from", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Davr oxiri</span>
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => setFilter("to", event.target.value)}
            />
          </label>
        </>
      )}
      <button type="submit" className="button primary">
        Qidirish
      </button>
      <button type="button" className="button secondary" onClick={reset}>
        Filtrlarni tozalash
      </button>
    </form>
  );
}

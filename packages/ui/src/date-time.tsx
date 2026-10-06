"use client";
import { useEffect, useState } from "react";

export function tashkentDateTime(value: string | number | Date = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))
    return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : new Date(parsed.getTime() + 5 * 3600000).toISOString().slice(0, 16);
}

export function TimePicker({
  name,
  label,
  value = "",
  required = false,
  onChange,
}: {
  name?: string;
  label: string;
  value?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const [selected, setSelected] = useState(value);
  useEffect(() => setSelected(value), [value]);
  const [hour = "", minute = ""] = selected.split(":");
  function change(h: string, m: string) {
    const next = h && m ? `${h}:${m}` : "";
    setSelected(next);
    onChange?.(next);
  }
  const minutes = [
    ...new Set([
      ...Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")),
      ...(minute ? [minute] : []),
    ]),
  ].sort();
  return (
    <span className="time-picker">
      {name && <input type="hidden" name={name} value={selected} />}
      <select
        aria-label={`${label} — soat`}
        value={hour}
        required={required}
        onChange={(e) => change(e.target.value, minute || "00")}
      >
        <option value="">Soat</option>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(
          (h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ),
        )}
      </select>
      <span aria-hidden="true">:</span>
      <select
        aria-label={`${label} — daqiqa`}
        value={minute}
        required={required}
        onChange={(e) => change(hour || "09", e.target.value)}
      >
        <option value="">Daqiqa</option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </span>
  );
}

export function DateTimePicker({
  name,
  label,
  value = "",
  required = false,
  onChange,
}: {
  name?: string;
  label: string;
  value?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const initial = value ? tashkentDateTime(value) : "";
  const [date, setDate] = useState(initial.slice(0, 10));
  const [time, setTime] = useState(initial.slice(11, 16) || "09:00");
  useEffect(() => {
    const next = value ? tashkentDateTime(value) : "";
    setDate(next.slice(0, 10));
    setTime(next.slice(11, 16) || "09:00");
  }, [value]);
  const selected = date ? `${date}T${time}` : "";
  return (
    <span className="date-time-picker">
      {name && <input type="hidden" name={name} value={selected} />}
      <input
        type="date"
        aria-label={`${label} — sana`}
        value={date}
        required={required}
        onChange={(e) => {
          setDate(e.target.value);
          onChange?.(e.target.value ? `${e.target.value}T${time}` : "");
        }}
      />
      <TimePicker
        label={label}
        value={time}
        required={required}
        onChange={(next) => {
          setTime(next);
          onChange?.(date ? `${date}T${next}` : "");
        }}
      />
    </span>
  );
}

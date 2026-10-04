"use client";
import { useState } from "react";

type Option = { value: string; label: string; disabled?: boolean };
export function SelectionGroup({
  name,
  label,
  options,
  value,
  defaultValue = [],
  onChange,
  switches = false,
  hint,
}: {
  name: string;
  label: string;
  options: Option[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  switches?: boolean;
  hint?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const values = value ?? selected;
  // Keep previously entered facilities visible so editing cannot silently erase them.
  const choices: Option[] = [
    ...options,
    ...values
      .filter((v) => !options.some((o) => o.value === v))
      .map((v) => ({ value: v, label: v })),
  ];
  return (
    <fieldset className="field wide selection-field">
      <legend>{label}</legend>
      {hint && <p className="muted">{hint}</p>}
      <div className="selection-grid">
        {choices.map((o) => {
          const checked = values.includes(o.value);
          return (
            <label
              key={o.value}
              className={`selection-option ${switches ? "switch-option" : ""}`}
            >
              <input
                type="checkbox"
                role={switches ? "switch" : undefined}
                name={name}
                value={o.value}
                aria-label={o.label}
                checked={checked}
                disabled={o.disabled}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...values, o.value]
                    : values.filter((v) => v !== o.value);
                  setSelected(next);
                  onChange?.(next);
                }}
              />
              {switches && <span className="switch-track" aria-hidden="true" />}
              <span>
                {o.label}
                {o.disabled && <small>O‘zgartirishga ruxsat yo‘q</small>}
              </span>
              {switches && (
                <small className="switch-state" aria-hidden="true">
                  {checked ? "Yoqilgan" : "O‘chirilgan"}
                </small>
              )}
              {o.disabled && checked && (
                <input type="hidden" name={name} value={o.value} />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

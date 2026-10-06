"use client";
import { useState } from "react";
const ageOptions = Array.from({ length: 18 }, (_, n) => (
  <option key={n} value={n}>
    {n} yosh
  </option>
));

export function AgeList({
  name,
  label,
  value = [],
}: {
  name: string;
  label: string;
  value?: number[];
}) {
  const [ages, setAges] = useState(value);
  return (
    <div className="value-editor" role="group" aria-label={label}>
      <input type="hidden" name={name} value={JSON.stringify(ages)} />
      {ages.map((age, n) => (
        <div className="value-row" key={n}>
          <select
            aria-label={`${n + 1}-bola yoshi`}
            value={age}
            onChange={(e) =>
              setAges(
                ages.map((v, i) => (i === n ? Number(e.target.value) : v)),
              )
            }
          >
            {ageOptions}
          </select>
          <button
            type="button"
            className="text-button danger-text"
            aria-label={`${n + 1}-bolani olib tashlash`}
            onClick={() => setAges(ages.filter((_, i) => i !== n))}
          >
            Olib tashlash
          </button>
        </div>
      ))}
      {ages.length < 20 && (
        <button
          type="button"
          className="button secondary"
          onClick={() => setAges([...ages, 0])}
        >
          Bola qo‘shish
        </button>
      )}
      {!ages.length && <small>Bola yo‘q bo‘lsa qo‘shish shart emas.</small>}
    </div>
  );
}

type Price = { min_age: number; max_age: number; amount: string };
export function ChildPrices({
  name,
  label,
  value = [],
}: {
  name: string;
  label: string;
  value?: Price[];
}) {
  const [prices, setPrices] = useState(value);
  function update(n: number, key: keyof Price, value: string) {
    setPrices(
      prices.map((row, i) =>
        i === n
          ? { ...row, [key]: key === "amount" ? value : Number(value) }
          : row,
      ),
    );
  }
  return (
    <div className="value-editor" role="group" aria-label={label}>
      <input type="hidden" name={name} value={JSON.stringify(prices)} />
      {prices.map((row, n) => (
        <div className="value-row" key={n}>
          <label>
            <span>Yoshdan</span>
            <select
              aria-label={`${n + 1}-narx boshlang‘ich yosh`}
              value={row.min_age}
              onChange={(e) => update(n, "min_age", e.target.value)}
            >
              {ageOptions}
            </select>
          </label>
          <label>
            <span>Yoshgacha</span>
            <select
              aria-label={`${n + 1}-narx oxirgi yosh`}
              value={row.max_age}
              onChange={(e) => update(n, "max_age", e.target.value)}
            >
              {ageOptions}
            </select>
          </label>
          <label>
            <span>Narx (so‘m)</span>
            <input
              aria-label={`${n + 1}-bola narxi`}
              inputMode="decimal"
              required
              value={row.amount}
              onChange={(e) => update(n, "amount", e.target.value)}
            />
          </label>
          <button
            className="text-button danger-text"
            type="button"
            onClick={() => setPrices(prices.filter((_, i) => i !== n))}
          >
            Olib tashlash
          </button>
        </div>
      ))}
      {prices.length < 18 && (
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            setPrices([...prices, { min_age: 0, max_age: 5, amount: "0" }])
          }
        >
          Yosh oralig‘i qo‘shish
        </button>
      )}
      <small>
        Har yosh oralig‘i uchun narxni so‘mda kiriting. Yosh oralig‘lari
        kesishmasin.
      </small>
    </div>
  );
}

export function TextList({
  name,
  label,
  value = [],
}: {
  name: string;
  label: string;
  value?: string[];
}) {
  const [items, setItems] = useState(value),
    [text, setText] = useState("");
  function add() {
    const next = text.trim();
    if (next && !items.includes(next)) {
      setItems([...items, next]);
      setText("");
    }
  }
  return (
    <div className="value-editor" role="group" aria-label={label}>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <div className="value-row">
        <input
          aria-label={`${label} — yangi band`}
          placeholder="Yangi bandni yozing"
          value={text}
          maxLength={80}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="button secondary"
          onClick={add}
          disabled={!text.trim() || items.length >= 30}
        >
          Qo‘shish
        </button>
      </div>
      <div className="value-tags">
        {items.map((item) => (
          <span key={item}>
            {item}
            <button
              type="button"
              aria-label={`${item} — olib tashlash`}
              onClick={() => setItems(items.filter((v) => v !== item))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";

export function PhotoGallery({
  ids,
  editable = false,
  save,
}: {
  ids: string[];
  editable?: boolean;
  save?: (ids: string[]) => Promise<void>;
}) {
  const [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false);
  const current = Math.min(index, Math.max(0, ids.length - 1));
  async function change(next: string[], nextIndex: number) {
    if (busy || !save) return;
    setBusy(true);
    try {
      await save(next);
      setIndex(nextIndex);
    } catch {
      // The profile form shows the error; keep the selected photo unchanged.
    } finally {
      setBusy(false);
    }
  }
  if (!ids.length)
    return (
      <p className="muted">
        Sanatoriya profiliga 4 ta yoki undan ko‘p surat yuklashingiz mumkin.
        Jami 30 tagacha.
      </p>
    );
  return (
    <div className="profile-gallery">
      <div className="profile-gallery-view">
        <img
          src={`/api/media/${ids[current]}`}
          alt={`Sanatoriya surati ${current + 1}`}
        />
        {ids.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-left"
              aria-label="Oldingi surat"
              onClick={() => setIndex((current - 1 + ids.length) % ids.length)}
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-arrow gallery-right"
              aria-label="Keyingi surat"
              onClick={() => setIndex((current + 1) % ids.length)}
            >
              ›
            </button>
          </>
        )}
        <span className="gallery-count" aria-live="polite">
          {current + 1} / {ids.length}
        </span>
      </div>
      <p className="muted">
        Birinchi surat katalog muqovasi. 4 ta yoki undan ko‘p surat qo‘shing;
        jami 30 tagacha.
      </p>
      {editable && (
        <div className="toolbar">
          <button
            type="button"
            className="button secondary"
            disabled={busy || current === 0}
            onClick={() => {
              const next = [...ids];
              [next[current - 1], next[current]] = [
                next[current],
                next[current - 1],
              ];
              void change(next, current - 1);
            }}
          >
            Oldinroqqa
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy || current === ids.length - 1}
            onClick={() => {
              const next = [...ids];
              [next[current + 1], next[current]] = [
                next[current],
                next[current + 1],
              ];
              void change(next, current + 1);
            }}
          >
            Keyinroqqa
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              void change(
                ids.filter((_, n) => n !== current),
                Math.max(0, current - 1),
              );
            }}
          >
            Suratni olib tashlash
          </button>
        </div>
      )}
    </div>
  );
}

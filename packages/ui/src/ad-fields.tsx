"use client";
import { useEffect, useRef, useState } from "react";
import { DateTimePicker, tashkentDateTime } from "./date-time";
import type { Field, Row } from "./components";

export const advertisementFields: Field[] = [
  { key: "title", label: "Reklama sarlavhasi", required: true },
  { key: "placement", label: "Reklama turi", required: true },
  { key: "target_kind", label: "Bosilganda qayerga o‘tsin?", required: true },
  { key: "target_url", label: "Havola" },
  { key: "target_sanatorium_id", label: "Ochadigan sanatoriya" },
  {
    key: "starts_at",
    label: "Boshlanish",
    type: "datetime-local",
    required: true,
  },
  { key: "ends_at", label: "Tugash", type: "datetime-local", required: true },
  { key: "photo_file", label: "Reklama rasmi", type: "file" },
  { key: "image_asset_id", label: "Profil rasmi" },
  { key: "text", label: "Reklama matni" },
  { key: "has_discount", label: "Chegirma bormi?", type: "checkbox" },
  { key: "discount_percent", label: "Chegirma foizi", type: "number" },
  { key: "discount_text", label: "Chegirma sharti" },
];

export function AdvertisementFields({
  tenant,
  tenants,
  photos,
}: {
  tenant: string;
  tenants: Row[];
  photos: string[];
}) {
  const [target, setTarget] = useState("SANATORIUM"),
    [discount, setDiscount] = useState(false);
  const [starts, setStarts] = useState(() => tashkentDateTime()),
    [ends, setEnds] = useState(() =>
      tashkentDateTime(Date.now() + 7 * 86400000),
    );
  const [photo, setPhoto] = useState<File | null>(null),
    [image, setImage] = useState(""),
    [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  function duration(days: number) {
    const start = starts ? Date.parse(starts + "+05:00") : Date.now();
    setEnds(tashkentDateTime(start + days * 86400000));
  }
  return (
    <>
      <label className="field wide">
        <span>
          Reklama sarlavhasi <b className="required">*</b>
        </span>
        <input
          name="title"
          required
          minLength={2}
          maxLength={120}
          placeholder="Masalan, kuzgi dam olish taklifi"
        />
      </label>
      <label className="field">
        <span>
          Reklama turi <b className="required">*</b>
        </span>
        <select name="placement" defaultValue="HOME">
          <option value="HOME">Bosh sahifada</option>
          <option value="POPUP">Ilovaga kirganda qalqib chiqadi</option>
        </select>
      </label>
      <label className="field">
        <span>Bosilganda qayerga o‘tsin?</span>
        <select
          name="target_kind"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="SANATORIUM">Sanatoriya sahifasiga</option>
          <option value="URL">Havolaga</option>
        </select>
      </label>
      {target === "URL" ? (
        <label className="field wide">
          <span>
            Havola <b className="required">*</b>
          </span>
          <input
            type="url"
            name="target_url"
            required
            placeholder="https://..."
            maxLength={2048}
          />
          <small>Sayt yoki Telegram kabi HTTPS havola</small>
        </label>
      ) : (
        <label className="field wide">
          <span>
            Ochadigan sanatoriya <b className="required">*</b>
          </span>
          <select name="target_sanatorium_id" defaultValue={tenant} required>
            {tenants.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="field wide">
        <span>
          Reklama rasmi <b className="required">*</b>
        </span>
        <input
          type="file"
          name="photo_file"
          accept="image/png,image/jpeg,image/webp"
          ref={fileRef}
          onChange={(e) => {
            setPhoto(e.target.files?.[0] ?? null);
            setImage("");
          }}
        />
        <input type="hidden" name="image_asset_id" value={image} />
        <small>
          Yangi rasm yuklang yoki profil rasmini tanlang. PNG, JPG, WebP — 8 MB
          gacha.
        </small>
        {photos.length > 0 && (
          <div className="ad-photo-options">
            {photos.map((id, n) => (
              <button
                type="button"
                aria-label={`Profil rasmi ${n + 1}`}
                className={`ad-photo-option ${id === image ? "selected" : ""}`}
                key={id}
                onClick={() => {
                  setPhoto(null);
                  setImage(id);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                <img src={`/api/media/${id}`} alt={`Profil rasmi ${n + 1}`} />
              </button>
            ))}
          </div>
        )}
        {(preview || image) && (
          <img
            className="ad-image-preview"
            src={preview || `/api/media/${image}`}
            alt="Tanlangan reklama rasmi"
          />
        )}
      </div>
      <label className="field wide">
        <span>Reklama matni</span>
        <textarea
          name="text"
          rows={3}
          maxLength={500}
          placeholder="Taklif haqida qisqa ma’lumot"
        />
      </label>
      <label className="field wide">
        <span className="check-field">
          <input
            type="checkbox"
            name="has_discount"
            checked={discount}
            onChange={(e) => setDiscount(e.target.checked)}
          />
          Chegirma bormi?
        </span>
      </label>
      {discount && (
        <>
          <label className="field">
            <span>Chegirma foizi</span>
            <input
              type="number"
              name="discount_percent"
              min={1}
              max={100}
              step={1}
              placeholder="Masalan, 15"
              inputMode="numeric"
            />
          </label>
          <label className="field">
            <span>Chegirma sharti</span>
            <input
              name="discount_text"
              minLength={3}
              maxLength={120}
              placeholder="Masalan, ish kunlarida 15%"
            />
            <small>
              Foiz yoki shartdan kamida bittasini kiriting. Bron narxi tarifdan
              hisoblanadi.
            </small>
          </label>
        </>
      )}
      <div className="field">
        <span>Boshlanish</span>
        <DateTimePicker
          name="starts_at"
          label="Boshlanish"
          value={starts}
          required
          onChange={setStarts}
        />
      </div>
      <div className="field">
        <span>Tugash</span>
        <DateTimePicker
          name="ends_at"
          label="Tugash"
          value={ends}
          required
          onChange={setEnds}
        />
      </div>
      <div className="field wide">
        <div className="ad-photo-options">
          {[1, 7, 30].map((days) => (
            <button
              className="button secondary"
              type="button"
              key={days}
              onClick={() => duration(days)}
            >
              {days} kun
            </button>
          ))}
        </div>
        <small>
          Toshkent vaqti (UTC+5), 24 soatlik format. Reklama admin tasdiqlagach
          bepul chiqadi.
        </small>
      </div>
    </>
  );
}

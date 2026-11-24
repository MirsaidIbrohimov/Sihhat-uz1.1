"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Globe,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { api, formatMoney, query, toMinor } from "@sihhat/api-client";
import {
  Act,
  Badge,
  Card,
  Empty,
  ErrorBox,
  Loading,
  PageHeading,
  Pager,
  Table,
  dateTime,
  usePortal,
  useRemote,
  type Row,
} from "./components";
import { PartnerTermsDialog } from "./partner-terms";
import { sanatoriumAmenities, sanatoriumServices } from "./sanatorium-options";

export const UZBEKISTAN_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Jizzax viloyati",
  "Namangan viloyati",
  "Farg‘ona viloyati",
  "Andijon viloyati",
  "Samarqand viloyati",
  "Buxoro viloyati",
  "Qashqadaryo viloyati",
  "Surxondaryo viloyati",
  "Navoiy viloyati",
  "Sirdaryo viloyati",
  "Xorazm viloyati",
  "Qoraqalpog‘iston Respublikasi",
];

const USERNAME_RE = /^[a-z0-9._-]{3,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+998\d{9}$/;

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

function normalizeUzPhone(raw: string): string {
  const cleaned = raw.replace(/[\s()-]/g, "");
  if (/^\d{9}$/.test(cleaned)) return `+998${cleaned}`;
  if (/^998\d{9}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

export async function checkPublicAvailability(
  kind: "username" | "email",
  value: string,
): Promise<{ valid: boolean; available: boolean; reason: string | null }> {
  return api(
    "/auth/partner-register/availability" +
      query(kind === "username" ? { username: value } : { email: value }),
  );
}

function PublicAvailabilityField({
  kind,
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
  status,
  message,
  onStatusChange,
}: {
  kind: "username" | "email";
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  hint: string;
  disabled?: boolean;
  status: CheckState;
  message: string | null;
  onStatusChange: (next: CheckState, msg: string | null, checkedValue: string) => void;
}) {
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      seqRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const triggerCheck = useCallback(
    (raw: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const seq = ++seqRef.current;
      const clean = raw.trim().toLowerCase();
      if (!clean) {
        onStatusChange("idle", null, "");
        return;
      }
      if (kind === "username") {
        if (clean.length < 3) {
          onStatusChange("invalid", "Kamida 3 ta belgi kiriting.", clean);
          return;
        }
        if (!USERNAME_RE.test(clean)) {
          onStatusChange(
            "invalid",
            "Faqat lotin harflari, raqam, nuqta (.), pastki chiziq (_) va tire (-) ishlatiladi.",
            clean,
          );
          return;
        }
      } else {
        if (!EMAIL_RE.test(clean)) {
          onStatusChange(
            "invalid",
            "Email manzil formati noto‘g‘ri (masalan: rahbar@sanatoriya.uz).",
            clean,
          );
          return;
        }
      }

      onStatusChange("checking", "Baza bilan tekshirilmoqda…", clean);
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        try {
          const res = await checkPublicAvailability(kind, clean);
          if (!mountedRef.current || seq !== seqRef.current) return;
          if (!res.valid) {
            onStatusChange(
              "invalid",
              kind === "username"
                ? "Username formati noto‘g‘ri."
                : "Email manzil formati noto‘g‘ri.",
              clean,
            );
            return;
          }
          if (res.available) {
            onStatusChange(
              "available",
              kind === "username"
                ? `@${clean} — bo‘sh, foydalanish mumkin`
                : `${clean} — bo‘sh, tasdiqlandi`,
              clean,
            );
          } else {
            onStatusChange(
              "taken",
              kind === "username"
                ? `@${clean} — bazada band, boshqa username kiriting`
                : `${clean} — bazada mavjud, boshqa email kiriting`,
              clean,
            );
          }
        } catch {
          if (!mountedRef.current || seq !== seqRef.current) return;
          onStatusChange(
            "error",
            "Baza bilan tekshirib bo‘lmadi, qayta urinib ko‘ring.",
            clean,
          );
        }
      }, 300);
    },
    [kind, onStatusChange],
  );

  return (
    <label className="field">
      <span>
        {label} <b className="required">*</b>
      </span>
      <div className={`login-check-wrap is-${status}`}>
        <div className="login-check-input-box">
          <input
            name={kind}
            type={kind === "email" ? "email" : "text"}
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              onChange(next);
              triggerCheck(next);
            }}
            required
            disabled={disabled}
            placeholder={placeholder}
            maxLength={kind === "email" ? 120 : 64}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={status === "taken" || status === "invalid" ? true : undefined}
          />
          {status !== "idle" && (
            <span className={`login-check-icon is-${status}`} aria-hidden="true">
              {status === "checking" ? (
                <LoaderCircle size={16} className="spin" />
              ) : status === "available" ? (
                <Check size={16} />
              ) : status === "error" ? (
                <AlertCircle size={16} />
              ) : (
                <X size={16} />
              )}
            </span>
          )}
        </div>
        {status === "idle" ? (
          <small>{hint}</small>
        ) : (
          <div className={`login-check-status is-${status}`} role="status" aria-live="polite">
            {status === "checking" ? (
              <LoaderCircle size={14} className="spin" />
            ) : status === "available" ? (
              <Check size={14} />
            ) : status === "error" ? (
              <AlertCircle size={14} />
            ) : (
              <X size={14} />
            )}
            <span>{message}</span>
          </div>
        )}
      </div>
    </label>
  );
}

export function PartnerRegistrationModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Step 1: Account info
  const [applicantName, setApplicantName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<CheckState>("idle");
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [checkedUsername, setCheckedUsername] = useState("");

  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<CheckState>("idle");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [checkedEmail, setCheckedEmail] = useState("");

  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Sanatorium info
  const [sanatoriumName, setSanatoriumName] = useState("");
  const [region, setRegion] = useState(UZBEKISTAN_REGIONS[0]);
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [legalName, setLegalName] = useState("");
  const [stir, setStir] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [startingPriceSum, setStartingPriceSum] = useState("");
  const [roomTypeName, setRoomTypeName] = useState("Standart xona");
  const [roomsCount, setRoomsCount] = useState("5");
  const [meals, setMeals] = useState("3 mahal parhez va milliy taomlar");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submittedData, setSubmittedData] = useState<Row | null>(null);

  const handleUsernameStatus = useCallback((s: CheckState, m: string | null, v: string) => {
    setUsernameStatus(s);
    setUsernameMsg(m);
    setCheckedUsername(v);
  }, []);

  const handleEmailStatus = useCallback((s: CheckState, m: string | null, v: string) => {
    setEmailStatus(s);
    setEmailMsg(m);
    setCheckedEmail(v);
  }, []);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  async function validateStep1(): Promise<boolean> {
    setError("");
    const cleanName = applicantName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = normalizeUzPhone(phone);

    if (cleanName.length < 2) {
      setError("Ism va familiyangizni kiriting (kamida 2 ta belgi).");
      return false;
    }
    if (!USERNAME_RE.test(cleanUsername)) {
      setError("Username kamida 3 ta belgi (lotin harflari, raqam, . _ -) bo‘lishi shart.");
      return false;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("To‘g‘ri elektron pochta (email) manzilini kiriting.");
      return false;
    }
    if (!PHONE_RE.test(cleanPhone)) {
      setError("Telefon raqamini +998XXXXXXXXX formatida kiriting (masalan: +998901234567).");
      return false;
    }
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Parol kamida 8 belgi bo‘lib, katta harf, kichik harf va raqamdan iborat bo‘lishi kerak.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Parol va parolni tasdiqlash maydonlari bir xil bo‘lishi kerak.");
      return false;
    }

    setBusy(true);
    try {
      if (checkedUsername !== cleanUsername || usernameStatus !== "available") {
        const res = await checkPublicAvailability("username", cleanUsername);
        if (!res.valid || !res.available) {
          handleUsernameStatus(
            res.valid ? "taken" : "invalid",
            res.valid
              ? `@${cleanUsername} — bazada band, boshqa username kiriting`
              : "Username formati noto‘g‘ri.",
            cleanUsername,
          );
          setError("Bu username bazada mavjud. Boshqa username kiriting.");
          return false;
        }
        handleUsernameStatus("available", `@${cleanUsername} — bo‘sh, foydalanish mumkin`, cleanUsername);
      }

      if (checkedEmail !== cleanEmail || emailStatus !== "available") {
        const res = await checkPublicAvailability("email", cleanEmail);
        if (!res.valid || !res.available) {
          handleEmailStatus(
            res.valid ? "taken" : "invalid",
            res.valid
              ? `${cleanEmail} — bazada mavjud, boshqa email kiriting`
              : "Email manzil formati noto‘g‘ri.",
            cleanEmail,
          );
          setError("Bu elektron pochta bazada ro‘yxatdan o‘tgan. Boshqa email kiriting.");
          return false;
        }
        handleEmailStatus("available", `${cleanEmail} — bo‘sh, tasdiqlandi`, cleanEmail);
      }

      setPhone(cleanPhone);
      if (!contactPhone) setContactPhone(cleanPhone);
      return true;
    } catch (e: any) {
      setError(e?.message || "Username va emailni baza bilan tekshirib bo‘lmadi.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    if (await validateStep1()) {
      setStep(2);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanContactPhone = normalizeUzPhone(contactPhone || phone);
    if (sanatoriumName.trim().length < 2) {
      setError("Sanatoriya nomini kiriting.");
      return;
    }
    if (address.trim().length < 5) {
      setError("Sanatoriyaning to‘liq manzilini kiriting.");
      return;
    }
    if (!PHONE_RE.test(cleanContactPhone)) {
      setError("Sanatoriya aloqa telefonini +998XXXXXXXXX formatida kiriting.");
      return;
    }
    if (description.trim().length < 20) {
      setError("Sanatoriya haqida tavsif kamida 20 ta belgidan iborat bo‘lishi kerak.");
      return;
    }
    if (stir.trim() && !/^\d{9}$/.test(stir.trim())) {
      setError("STIR (INN) aynan 9 ta raqamdan iborat bo‘lishi kerak.");
      return;
    }
    if (!termsAccepted) {
      setError("Ariza yuborish uchun Sihhat.uz Hamkor shartlariga rozilik bildiring.");
      return;
    }

    let startingPriceMinor: string | undefined;
    if (startingPriceSum.trim()) {
      try {
        startingPriceMinor = toMinor(startingPriceSum.trim());
        if (BigInt(startingPriceMinor) <= 0n) {
          setError("Boshlang‘ich narx 0 dan katta bo‘lishi kerak.");
          return;
        }
      } catch (err: any) {
        setError(err?.message || "Boshlang‘ich narxni to‘g‘ri so‘mda kiriting.");
        return;
      }
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        applicant_name: applicantName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: normalizeUzPhone(phone),
        password,
        sanatorium_name: sanatoriumName.trim(),
        region,
        address: address.trim(),
        contact_phone: cleanContactPhone,
        description: description.trim(),
        check_in_time: checkInTime || "14:00",
        check_out_time: checkOutTime || "12:00",
        amenities,
        services,
        meals: meals.trim(),
        terms_accepted: true,
        ...(legalName.trim() ? { legal_name: legalName.trim() } : {}),
        ...(stir.trim() ? { stir: stir.trim() } : {}),
        ...(mapUrl.trim() ? { map_url: mapUrl.trim() } : {}),
        ...(startingPriceMinor ? { starting_price: startingPriceMinor } : {}),
        ...(roomTypeName.trim() ? { room_type_name: roomTypeName.trim() } : {}),
        ...(roomsCount.trim() && Number(roomsCount) > 0 ? { rooms_count: Number(roomsCount) } : {}),
      };

      const res = await api("/auth/partner-register", "POST", payload);
      setSubmittedData(res.registration ?? payload);
      setStep(3);
    } catch (err: any) {
      setError(err?.message || "Arizani yuborishda xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1200 }}
      onClick={() => !busy && onClose()}
    >
      <section
        className="modal partner-reg-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Yangi hamkor hisobi ochish"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              SIHHAT.UZ · HAMKOR BO‘LISH
            </p>
            <h2>
              {step === 1
                ? "Yangi hisob ochish — Hisob ma’lumotlari"
                : step === 2
                  ? "Sanatoriyangiz haqida ma’lumot"
                  : "Arizangiz muvaffaqiyatli yuborildi!"}
            </h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {step === 1
                ? "Username va email majburiy bo‘lib, baza bilan jonli tekshiriladi."
                : step === 2
                  ? "Superadmin tasdiqlaganidan so‘ng sanatoriyangiz katalogda foydalanuvchilarga ko‘rinadi."
                  : "Superadmin xabardor qilindi."}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Yopish"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {step !== 3 && (
          <div className="partner-reg-steps" aria-label="Bosqichlar">
            <button
              type="button"
              className={`partner-reg-step ${step === 1 ? "active" : "done"}`}
              onClick={() => !busy && setStep(1)}
            >
              <span className="step-num">{step > 1 ? <Check size={14} /> : "1"}</span>
              <span>Hisob yaratish</span>
            </button>
            <span className="partner-reg-step-line" aria-hidden="true" />
            <div className={`partner-reg-step ${step === 2 ? "active" : ""}`}>
              <span className="step-num">2</span>
              <span>Sanatoriya ma’lumotlari</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <form className="partner-reg-body" onSubmit={goToStep2}>
            <div className="form-grid">
              <label className="field wide">
                <span>
                  Direktor / Mas’ul shaxs ism-familiyasi <b className="required">*</b>
                </span>
                <input
                  name="applicant_name"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={120}
                  disabled={busy}
                  placeholder="Masalan: Alisher Karimov"
                />
              </label>

              <PublicAvailabilityField
                kind="username"
                label="Username (Tizim logini)"
                value={username}
                onChange={setUsername}
                placeholder="masalan: chortoq.direktor"
                hint="Kamida 3 belgi: lotin harflari, raqam, nuqta, _ yoki -"
                disabled={busy}
                status={usernameStatus}
                message={usernameMsg}
                onStatusChange={handleUsernameStatus}
              />

              <PublicAvailabilityField
                kind="email"
                label="Elektron pochta (Email)"
                value={email}
                onChange={setEmail}
                placeholder="masalan: info@sanatoriya.uz"
                hint="Hisobingiz tasdiqlanganda xabar shu emailga yuboriladi"
                disabled={busy}
                status={emailStatus}
                message={emailMsg}
                onStatusChange={handleEmailStatus}
              />

              <label className="field">
                <span>
                  Telefon raqami <b className="required">*</b>
                </span>
                <input
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={busy}
                  placeholder="+998901234567"
                />
                <small>+998 va 9 ta raqam ko‘rinishida</small>
              </label>

              <label className="field">
                <span>
                  Parol yarating <b className="required">*</b>
                </span>
                <span className="password-input">
                  <input
                    name="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    disabled={busy}
                    placeholder="Kamida 8 belgi"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showPass ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                <small>Kamida 8 belgi: katta harf, kichik harf va raqam</small>
              </label>

              <label className="field wide">
                <span>
                  Parolni tasdiqlang <b className="required">*</b>
                </span>
                <input
                  name="confirm_password"
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  disabled={busy}
                  placeholder="Parolni qayta kiriting"
                />
              </label>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="modal-footer">
              <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
                Bekor qilish
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={busy || usernameStatus === "checking" || emailStatus === "checking"}
              >
                {busy ? "Tekshirilmoqda…" : "Keyingi bosqich"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="partner-reg-body" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>
                  Sanatoriya nomi <b className="required">*</b>
                </span>
                <input
                  name="sanatorium_name"
                  value={sanatoriumName}
                  onChange={(e) => setSanatoriumName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={150}
                  disabled={busy}
                  placeholder="Masalan: Chortoq Shifo Sanatoriyasi"
                />
              </label>

              <label className="field">
                <span>
                  Viloyat / Hudud <b className="required">*</b>
                </span>
                <select
                  name="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  required
                  disabled={busy}
                >
                  {UZBEKISTAN_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field wide">
                <span>
                  To‘liq manzil <b className="required">*</b>
                </span>
                <input
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  minLength={5}
                  maxLength={500}
                  disabled={busy}
                  placeholder="Tuman, ko‘cha nomi va mo‘ljal"
                />
              </label>

              <label className="field">
                <span>
                  Sanatoriya aloqa telefoni <b className="required">*</b>
                </span>
                <input
                  name="contact_phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  disabled={busy}
                  placeholder="+998901234567"
                />
              </label>

              <label className="field">
                <span>Boshlang‘ich narx (1 kunlik, so‘mda)</span>
                <input
                  name="starting_price_sum"
                  type="text"
                  inputMode="numeric"
                  value={startingPriceSum}
                  onChange={(e) => setStartingPriceSum(e.target.value)}
                  disabled={busy}
                  placeholder="Masalan: 450000"
                />
                <small>Kiritilsa, tasdiqlangach katalogda narx va xona darhol ko‘rinadi</small>
              </label>

              <label className="field">
                <span>Boshlang‘ich xona turi</span>
                <input
                  name="room_type_name"
                  value={roomTypeName}
                  onChange={(e) => setRoomTypeName(e.target.value)}
                  maxLength={100}
                  disabled={busy}
                  placeholder="Standart xona"
                />
              </label>

              <label className="field">
                <span>Xonalar soni</span>
                <input
                  name="rooms_count"
                  type="number"
                  min={1}
                  max={200}
                  value={roomsCount}
                  onChange={(e) => setRoomsCount(e.target.value)}
                  disabled={busy}
                />
              </label>

              <label className="field">
                <span>Yuridik nom (ixtiyoriy)</span>
                <input
                  name="legal_name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  maxLength={150}
                  disabled={busy}
                  placeholder="Masalan: Chortoq Shifo MChJ"
                />
              </label>

              <label className="field">
                <span>STIR / INN (ixtiyoriy, 9 raqam)</span>
                <input
                  name="stir"
                  value={stir}
                  onChange={(e) => setStir(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  maxLength={9}
                  disabled={busy}
                  placeholder="123456789"
                />
              </label>

              <label className="field">
                <span>Joylashish vaqti (Check-in)</span>
                <input
                  name="check_in_time"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  disabled={busy}
                />
              </label>

              <label className="field">
                <span>Ketish vaqti (Check-out)</span>
                <input
                  name="check_out_time"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  disabled={busy}
                />
              </label>

              <label className="field wide">
                <span>Google Maps yoki Yandex Maps havolasi (ixtiyoriy)</span>
                <input
                  name="map_url"
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  maxLength={2048}
                  disabled={busy}
                  placeholder="https://maps.google.com/... yoki https://yandex.uz/maps/..."
                />
              </label>

              <label className="field wide">
                <span>
                  Sanatoriya haqida tavsif <b className="required">*</b>
                </span>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={20}
                  maxLength={5000}
                  rows={4}
                  disabled={busy}
                  placeholder="Davolash yo‘nalishlari, tabiati, shifobaxsh suvlari, muolajalari va qulayliklari haqida yozing (kamida 20 belgi)..."
                />
              </label>

              <label className="field wide">
                <span>Ovqatlanish tartibi</span>
                <input
                  name="meals"
                  value={meals}
                  onChange={(e) => setMeals(e.target.value)}
                  maxLength={1000}
                  disabled={busy}
                  placeholder="Masalan: 3 mahal parhez va milliy taomlar"
                />
              </label>

              <div className="field wide">
                <span>Sharoitlar (mavjudlarini tanlang)</span>
                <div className="partner-chip-grid">
                  {sanatoriumAmenities.map((item) => {
                    const active = amenities.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        className={`partner-chip ${active ? "active" : ""}`}
                        onClick={() => toggleItem(amenities, setAmenities, item)}
                      >
                        {active && <Check size={13} />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="field wide">
                <span>Davolash yo‘nalishlari va xizmatlar</span>
                <div className="partner-chip-grid">
                  {sanatoriumServices.map((item) => {
                    const active = services.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        className={`partner-chip ${active ? "active" : ""}`}
                        onClick={() => toggleItem(services, setServices, item)}
                      >
                        {active && <Check size={13} />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="field wide">
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    Sihhat.uz Hamkor shartlarini o‘qidim va qabul qilaman <b className="required">*</b>
                  </span>
                </label>
                <button
                  type="button"
                  className="terms-inline-link"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => setTermsOpen(true)}
                >
                  Hamkor shartlarini o‘qish ↗
                </button>
              </div>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
              >
                <ArrowLeft size={16} />
                Orqaga
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                <UserPlus size={16} />
                {busy ? "Yuborilmoqda…" : "Ariza yuborish"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="partner-reg-body partner-reg-success">
            <div className="partner-reg-success-icon">
              <CheckCircle2 size={44} />
            </div>
            <h3>Arizangiz Superadminga yuborildi!</h3>
            <p className="muted">
              Superadmin arizangizni tekshirib tasdiqlaganidan so‘ng:
            </p>
            <ul className="partner-reg-success-list">
              <li>
                <Check size={16} />
                <span>
                  <strong>@{submittedData?.username || username}</strong> hisobingiz faollashtiriladi
                </span>
              </li>
              <li>
                <Check size={16} />
                <span>
                  <strong>{submittedData?.sanatoriumName || sanatoriumName}</strong> sanatoriyalar ro‘yxatiga qo‘shilib, barcha foydalanuvchilarga ko‘rinadi
                </span>
              </li>
              <li>
                <Check size={16} />
                <span>
                  <strong>{submittedData?.email || email}</strong> elektron pochta manzilingizga tasdiqlash xabari yuboriladi
                </span>
              </li>
            </ul>
            <div className="modal-footer" style={{ width: "100%", justifyContent: "center" }}>
              <button type="button" className="button primary" onClick={onClose}>
                Kirish sahifasiga qaytish
              </button>
            </div>
          </div>
        )}
      </section>
      {termsOpen && <PartnerTermsDialog onClose={() => setTermsOpen(false)} />}
    </div>
  );
}

export function PartnerRegistrations() {
  const ctx = usePortal();
  const [statusTab, setStatusTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const remote = useRemote(
    "/superadmin/partner-registrations" +
      query({
        page,
        limit: 15,
        status: statusTab === "ALL" ? undefined : statusTab,
        q: q || undefined,
      }),
    ctx.epoch,
  );

  const rows: Row[] = remote.data?.data ?? [];
  const pendingCount = Number(remote.data?.pending_count ?? 0);
  const approvedCount = Number(remote.data?.approved_count ?? 0);
  const rejectedCount = Number(remote.data?.rejected_count ?? 0);

  function openApprove(reg: Row) {
    ctx.form({
      title: `Arizani tasdiqlash: ${reg.sanatoriumName}`,
      description: `Tasdiqlash bosilganda «@${reg.username}» hamkor hisobi (Direktor) ochiladi, «${reg.sanatoriumName}» sanatoriyalar ro‘yxatiga va katalogga qo‘shiladi hamda «${reg.email}» manziliga email xabari yuboriladi.`,
      button: "Tasdiqlash va hisob ochish",
      fields: [
        {
          key: "reason",
          label: "Izoh (ixtiyoriy)",
          type: "textarea",
          maxLength: 500,
          hint: "Ichki audit uchun izoh qoldirishingiz mumkin",
        },
      ],
      submit: async (v) => {
        setActionBusy(true);
        try {
          const res = await api(`/superadmin/partner-registrations/${reg.id}/approve`, "POST", {
            version: reg.version,
            ...(typeof v.reason === "string" && v.reason.trim() ? { reason: v.reason.trim() } : {}),
          });
          setSelected(null);
          const emailNote =
            res.email_status === "SENT"
              ? ` ${reg.email} manziliga xabar yuborildi.`
              : res.email_status === "SKIPPED"
                ? " (Email provayder sozlanmagan.)"
                : "";
          ctx.notice(`Hisob ochildi va «${reg.sanatoriumName}» katalogga qo‘shildi!${emailNote}`);
          return res;
        } finally {
          setActionBusy(false);
        }
      },
      done: () => {
        ctx.refresh();
      },
    });
  }

  function openReject(reg: Row) {
    ctx.form({
      title: `Arizani rad etish: ${reg.sanatoriumName}`,
      description: `Rad etish sababi «${reg.email}» manziliga xabar qilib yuboriladi.`,
      button: "Rad etish",
      fields: [
        {
          key: "reason",
          label: "Rad etish sababi",
          type: "textarea",
          required: true,
          minLength: 3,
          maxLength: 500,
          hint: "Masalan: Sanatoriya manzili yoki aloqa ma’lumotlari to‘liq emas",
        },
      ],
      submit: async (v) => {
        setActionBusy(true);
        try {
          const res = await api(`/superadmin/partner-registrations/${reg.id}/reject`, "POST", {
            version: reg.version,
            reason: v.reason,
          });
          setSelected(null);
          ctx.notice(`«${reg.sanatoriumName}» arizasi rad etildi.`);
          return res;
        } finally {
          setActionBusy(false);
        }
      },
      done: () => {
        ctx.refresh();
      },
    });
  }

  return (
    <>
      <PageHeading
        title="Hamkor arizalari"
        subtitle="Hamkorlar panelidan yangi hisob ochish va sanatoriyasini qo‘shish uchun yuborilgan arizalarni ko‘rib chiqing va tasdiqlang."
      >
        <button type="button" className="button secondary" onClick={remote.reload}>
          <RefreshCw size={16} />
          Yangilash
        </button>
      </PageHeading>

      <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={18} />
          </div>
          <div className="stat-label">Tasdiq kutayotgan arizalar</div>
          <div className="stat-number">{pendingCount}</div>
          <div className="stat-detail">Superadmin qarorini kutmoqda</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={18} />
          </div>
          <div className="stat-label">Tasdiqlangan hamkorlar</div>
          <div className="stat-number">{approvedCount}</div>
          <div className="stat-detail">Hisob ochilib, katalogga qo‘shilgan</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <XCircle size={18} />
          </div>
          <div className="stat-label">Rad etilgan arizalar</div>
          <div className="stat-number">{rejectedCount}</div>
          <div className="stat-detail">Qayta ariza topshirishi mumkin</div>
        </div>
      </div>

      <Card
        title="Arizalar ro‘yxati"
        aside={
          <div className="toolbar" style={{ margin: 0, gap: 8 }}>
            <input
              type="search"
              placeholder="Sanatoriya, username, email, hudud…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setQ(searchInput.trim());
                }
              }}
              style={{ minWidth: 220 }}
            />
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setPage(1);
                setQ(searchInput.trim());
              }}
            >
              <Search size={15} /> Qidirish
            </button>
          </div>
        }
      >
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="tabs">
            {(
              [
                ["PENDING", `Kutilmoqda (${pendingCount})`],
                ["APPROVED", `Tasdiqlangan (${approvedCount})`],
                ["REJECTED", `Rad etilgan (${rejectedCount})`],
                ["ALL", "Barchasi"],
              ] as const
            ).map(([key, text]) => (
              <button
                key={key}
                type="button"
                className={`tab ${statusTab === key ? "active" : ""}`}
                onClick={() => {
                  setStatusTab(key);
                  setPage(1);
                }}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {remote.loading ? (
          <Loading />
        ) : remote.error ? (
          <ErrorBox message={remote.error} retry={remote.reload} />
        ) : !rows.length ? (
          <Empty text="Ushbu bo‘limda hamkor arizalari yo‘q" />
        ) : (
          <>
            <Table
              rows={rows}
              columns={[
                {
                  label: "Sanatoriya",
                  render: (r) => (
                    <div>
                      <strong>{r.sanatoriumName}</strong>
                      <span className="subcell">
                        {r.region} · {r.address}
                      </span>
                      {r.startingPriceMinor && (
                        <span className="subcell" style={{ color: "var(--green)", fontWeight: 600 }}>
                          Boshlang‘ich narx: {formatMoney(r.startingPriceMinor)}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  label: "Hisob (Direktor)",
                  render: (r) => (
                    <div>
                      <strong>{r.applicantName}</strong>
                      <span className="subcell">
                        @{r.username} · {r.email}
                      </span>
                      <span className="subcell">{r.phone}</span>
                    </div>
                  ),
                },
                {
                  label: "Yuborilgan manba",
                  render: (r) => (
                    <div>
                      <div>{dateTime(r.createdAt)}</div>
                      <span className="subcell">
                        {r.submittedDevice || "Brauzer"}{" "}
                        {r.submittedIp ? `· ${r.submittedIp}` : ""}
                      </span>
                    </div>
                  ),
                },
                {
                  label: "Holat",
                  render: (r) => <Badge value={r.status} />,
                },
              ]}
              actions={(r) => (
                <>
                  <Act onClick={() => setSelected(r)}>Batafsil</Act>
                  {r.status === "PENDING" && (
                    <>
                      <Act onClick={() => openApprove(r)} disabled={actionBusy}>
                        Tasdiqlash
                      </Act>
                      <Act danger onClick={() => openReject(r)} disabled={actionBusy}>
                        Rad etish
                      </Act>
                    </>
                  )}
                </>
              )}
            />
            {remote.data && (
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

      {selected && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1200 }}
          onClick={() => setSelected(null)}
        >
          <section
            className="modal partner-reg-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Ariza tafsilotlari: ${selected.sanatoriumName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0 }}>{selected.sanatoriumName}</h2>
                  <Badge value={selected.status} />
                </div>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  Yuborilgan: {dateTime(selected.createdAt)} · {selected.region}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Yopish"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="partner-reg-body">
              <div className="detail-grid">
                <dl>
                  <dt><User size={13} /> Mas’ul shaxs (Direktor)</dt>
                  <dd>{selected.applicantName}</dd>
                </dl>
                <dl>
                  <dt><ShieldCheck size={13} /> Username (Login)</dt>
                  <dd><strong>@{selected.username}</strong></dd>
                </dl>
                <dl>
                  <dt><Mail size={13} /> Elektron pochta</dt>
                  <dd>{selected.email}</dd>
                </dl>
                <dl>
                  <dt><Phone size={13} /> Telefon / Aloqa</dt>
                  <dd>
                    {selected.phone}
                    {selected.contactPhone && selected.contactPhone !== selected.phone
                      ? ` · Sanatoriya: ${selected.contactPhone}`
                      : ""}
                  </dd>
                </dl>
                <dl>
                  <dt><MapPin size={13} /> Manzil</dt>
                  <dd>{selected.region}, {selected.address}</dd>
                </dl>
                <dl>
                  <dt><Building2 size={13} /> Yuridik ma’lumot</dt>
                  <dd>
                    {selected.legalName || "—"}
                    {selected.stir ? ` · STIR: ${selected.stir}` : ""}
                  </dd>
                </dl>
                <dl>
                  <dt>Joylashish / Ketish</dt>
                  <dd>{selected.checkInTime} / {selected.checkOutTime}</dd>
                </dl>
                <dl>
                  <dt>Boshlang‘ich xona va narx</dt>
                  <dd>
                    {selected.startingPriceMinor
                      ? `${formatMoney(selected.startingPriceMinor)} (${selected.roomTypeName || "Standart xona"}, ${selected.roomsCount || 1} xona)`
                      : "Keyin panelda kiritiladi"}
                  </dd>
                </dl>
                <dl>
                  <dt><Globe size={13} /> IP va Qurilma</dt>
                  <dd>
                    <span className="ip-chip">{selected.submittedIp || "—"}</span>{" "}
                    <span>{selected.submittedDevice || "—"}</span>
                  </dd>
                </dl>
                {selected.mapUrl && (
                  <dl>
                    <dt>Xarita havolasi</dt>
                    <dd>
                      <a href={selected.mapUrl} target="_blank" rel="noreferrer">
                        Xaritada ochish ↗
                      </a>
                    </dd>
                  </dl>
                )}
              </div>

              <div className="partner-detail-box">
                <strong>Sanatoriya tavsifi</strong>
                <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{selected.description}</p>
              </div>

              {selected.meals && (
                <div className="partner-detail-box">
                  <strong>Ovqatlanish</strong>
                  <p style={{ margin: "6px 0 0" }}>{selected.meals}</p>
                </div>
              )}

              {Array.isArray(selected.amenities) && selected.amenities.length > 0 && (
                <div className="partner-detail-box">
                  <strong>Sharoitlar ({selected.amenities.length})</strong>
                  <div className="partner-chip-grid" style={{ marginTop: 8 }}>
                    {selected.amenities.map((a: string) => (
                      <span key={a} className="partner-chip active" style={{ cursor: "default" }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(selected.services) && selected.services.length > 0 && (
                <div className="partner-detail-box">
                  <strong>Davolash yo‘nalishlari va xizmatlar ({selected.services.length})</strong>
                  <div className="partner-chip-grid" style={{ marginTop: 8 }}>
                    {selected.services.map((s: string) => (
                      <span key={s} className="partner-chip active" style={{ cursor: "default" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.decisionReason && (
                <div className="partner-detail-box">
                  <strong>Administrator izohi</strong>
                  <p style={{ margin: "6px 0 0" }}>{selected.decisionReason}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setSelected(null)}
              >
                Yopish
              </button>
              {selected.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    className="button danger-soft"
                    disabled={actionBusy}
                    onClick={() => openReject(selected)}
                  >
                    <XCircle size={16} />
                    Rad etish
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    disabled={actionBusy}
                    onClick={() => openApprove(selected)}
                  >
                    <CheckCircle2 size={16} />
                    Tasdiqlash va hisob ochish
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

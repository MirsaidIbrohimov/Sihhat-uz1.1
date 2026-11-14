"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";
import { api, query } from "@sihhat/api-client";
import {
  normalizeLoginInput,
  validateLoginFormat,
  type LoginAvailabilityResponse,
  type LoginAvailabilityStatus,
} from "./login-rules";

export {
  LOGIN_PATTERN,
  normalizeLoginInput,
  validateLoginFormat,
  type LoginAvailabilityResponse,
  type LoginAvailabilityStatus,
} from "./login-rules";

const DEBOUNCE_MS = 320;

export async function fetchLoginAvailability(
  login: string,
  excludeUserId?: string,
) {
  return api<LoginAvailabilityResponse>(
    "/partner/staff/login-availability" +
      query({
        login,
        ...(excludeUserId ? { exclude_user_id: excludeUserId } : {}),
      }),
  );
}

export function LoginAvailabilityInput({
  name,
  defaultValue = "",
  required,
  minLength = 3,
  maxLength = 64,
  placeholder = "masalan: ali.karimov",
  hint,
  excludeUserId,
  onRegisterVerifier,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
  excludeUserId?: string;
  onRegisterVerifier?: (
    name: string,
    verifier: (() => Promise<string | null>) | null,
  ) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [status, setStatus] = useState<LoginAvailabilityStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(defaultValue);
  const statusRef = useRef<LoginAvailabilityStatus>("idle");
  const checkedLoginRef = useRef<string>("");
  const requestSeqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const applyStatus = useCallback(
    (
      nextStatus: LoginAvailabilityStatus,
      nextChecked: string,
      nextMessage: string | null,
    ) => {
      if (!mountedRef.current) return;
      statusRef.current = nextStatus;
      checkedLoginRef.current = nextChecked;
      setStatus(nextStatus);
      setMessage(nextMessage);
    },
    [],
  );

  const runCheck = useCallback(
    async (
      normalized: string,
      seq: number,
    ): Promise<LoginAvailabilityStatus> => {
      try {
        const res = await fetchLoginAvailability(normalized, excludeUserId);
        if (!mountedRef.current || seq !== requestSeqRef.current) {
          return statusRef.current;
        }
        if (!res.valid) {
          const msg =
            res.reason === "INVALID_FORMAT"
              ? "Login formati noto‘g‘ri (kamida 3 ta lotin harfi, raqam yoki . _ - @)."
              : null;
          applyStatus(
            res.reason === "EMPTY" ? "idle" : "invalid",
            res.login,
            msg,
          );
          return res.reason === "EMPTY" ? "idle" : "invalid";
        }
        if (res.available) {
          applyStatus(
            "available",
            res.login,
            `@${res.login} — bo‘sh, tasdiqlandi`,
          );
          return "available";
        }
        applyStatus(
          "taken",
          res.login,
          `@${res.login} — bazada band, boshqa login kiriting`,
        );
        return "taken";
      } catch {
        if (!mountedRef.current || seq !== requestSeqRef.current) {
          return statusRef.current;
        }
        applyStatus(
          "error",
          normalized,
          "Loginni baza bilan tekshirib bo‘lmadi, qayta urinib ko‘ring.",
        );
        return "error";
      }
    },
    [applyStatus, excludeUserId],
  );

  const scheduleCheck = useCallback(
    (raw: string) => {
      valueRef.current = raw;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const seq = ++requestSeqRef.current;
      const fmt = validateLoginFormat(raw);
      if (!fmt.login) {
        applyStatus("idle", "", null);
        return;
      }
      if (!fmt.valid) {
        applyStatus("invalid", fmt.login, fmt.message);
        return;
      }
      applyStatus("checking", fmt.login, "Baza bilan tekshirilmoqda...");
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void runCheck(fmt.login, seq);
      }, DEBOUNCE_MS);
    },
    [applyStatus, runCheck],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (defaultValue) {
      scheduleCheck(defaultValue);
    }
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [defaultValue, scheduleCheck]);

  useEffect(() => {
    if (!onRegisterVerifier) return;
    const focusInputSoon = () =>
      setTimeout(() => inputRef.current?.focus(), 0);

    onRegisterVerifier(name, async () => {
      const fmt = validateLoginFormat(valueRef.current);
      if (!fmt.login) {
        if (required) {
          focusInputSoon();
          return "Loginni kiriting.";
        }
        return null;
      }
      if (!fmt.valid) {
        applyStatus("invalid", fmt.login, fmt.message);
        focusInputSoon();
        return fmt.message ?? "Login formati noto‘g‘ri.";
      }
      if (
        checkedLoginRef.current === fmt.login &&
        statusRef.current === "available"
      ) {
        return null;
      }
      if (
        checkedLoginRef.current === fmt.login &&
        statusRef.current === "taken"
      ) {
        focusInputSoon();
        return "Bu login bazada mavjud. Boshqa login kiriting.";
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const seq = ++requestSeqRef.current;
      applyStatus("checking", fmt.login, "Baza bilan tekshirilmoqda...");
      const resolved = await runCheck(fmt.login, seq);
      if (resolved === "available") return null;
      focusInputSoon();
      if (resolved === "taken") {
        return "Bu login bazada mavjud. Boshqa login kiriting.";
      }
      if (resolved === "invalid") {
        return "Login formati noto‘g‘ri.";
      }
      return "Loginni baza bilan tekshirib bo‘lmadi, qayta urinib ko‘ring.";
    });

    return () => onRegisterVerifier(name, null);
  }, [applyStatus, name, onRegisterVerifier, required, runCheck]);

  return (
    <div className={`login-check-wrap is-${status}`}>
      <div className="login-check-input-box">
        <input
          ref={inputRef}
          name={name}
          type="text"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            scheduleCheck(next);
          }}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={
            status === "taken" || status === "invalid" ? true : undefined
          }
        />
        {status !== "idle" && (
          <span
            className={`login-check-icon is-${status}`}
            aria-hidden="true"
          >
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
        hint ? (
          <small>{hint}</small>
        ) : null
      ) : (
        <div
          className={`login-check-status is-${status}`}
          role="status"
          aria-live="polite"
        >
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
  );
}

export const LOGIN_PATTERN = /^[a-z0-9._@-]+$/;

export type LoginAvailabilityStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "taken"
  | "error";

export type LoginAvailabilityResponse = {
  login: string;
  valid: boolean;
  available: boolean;
  reason?: "EMPTY" | "INVALID_FORMAT" | "TAKEN" | null;
};

export function normalizeLoginInput(raw: string) {
  return raw.trim().toLowerCase();
}

export function validateLoginFormat(raw: string): {
  login: string;
  valid: boolean;
  message: string | null;
} {
  const login = normalizeLoginInput(raw);
  if (!login) return { login, valid: false, message: null };
  if (login.length < 3) {
    return {
      login,
      valid: false,
      message: "Kamida 3 ta belgi kiriting.",
    };
  }
  if (login.length > 64) {
    return {
      login,
      valid: false,
      message: "Login 64 belgidan oshmasligi kerak.",
    };
  }
  if (!LOGIN_PATTERN.test(login)) {
    return {
      login,
      valid: false,
      message: "Faqat kichik lotin harflari, raqamlar va . _ - @ ishlatiladi.",
    };
  }
  return { login, valid: true, message: null };
}

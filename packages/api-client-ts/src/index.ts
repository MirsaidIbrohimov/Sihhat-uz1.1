export type Money = string;
export type Actor = {
  id: string;
  kind: "SUPERADMIN" | "STAFF" | "CUSTOMER";
  name: string;
  mustChangePassword: boolean;
  idleTimeoutSeconds?: number | null;
  lastActivityAt?: string;
  memberships: {
    id: string;
    sanatoriumId: string;
    role: string;
    status: string;
    permissions: string[];
    version: number;
  }[];
};
export type Page<T> = {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown = null,
    readonly requestId: string | null = null,
  ) {
    super(message);
  }
}
let refreshing: Promise<void> | null = null;
const csrf = () =>
  typeof document === "undefined"
    ? ""
    : decodeURIComponent(
        document.cookie
          .split("; ")
          .find((c) => c.startsWith("sihhat_csrf="))
          ?.split("=")
          .slice(1)
          .join("=") ?? "",
      );
const pendingKeys = new Map<string, string>();
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  const signature = `${method}:${path}:${JSON.stringify(body)}`;
  const mutation = !["GET", "HEAD"].includes(method);
  if (mutation && !pendingKeys.has(signature))
    pendingKeys.set(signature, crypto.randomUUID());
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(mutation
          ? {
              "X-CSRF-Token": csrf(),
              "Idempotency-Key": pendingKeys.get(signature)!,
            }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Server bilan aloqa uzildi. Qayta urinib ko‘ring.",
    );
  }
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    try {
      refreshing ??= api("/auth/refresh", "POST", {}, false)
        .then(() => undefined)
        .finally(() => {
          refreshing = null;
        });
      await refreshing;
      return api<T>(path, method, body, false);
    } catch {
      throw new ApiError(
        401,
        "SESSION_EXPIRED",
        "Kirish muddati tugadi. Qayta kiring.",
      );
    }
  }
  const value = await response.json().catch(() => ({
    code: "INVALID_RESPONSE",
    message: "Server javobini o‘qib bo‘lmadi.",
  }));
  if (!response.ok) {
    if (response.status < 500) pendingKeys.delete(signature);
    throw new ApiError(
      response.status,
      value.code,
      value.message ?? "So‘rov bajarilmadi",
      value.details,
      value.request_id,
    );
  }
  pendingKeys.delete(signature);
  return value as T;
}
export async function restoreSession() {
  try {
    return await api<Actor>("/auth/me", "GET", undefined, false);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await api("/auth/refresh", "POST", {}, false);
      return api<Actor>("/auth/me", "GET", undefined, false);
    }
    throw e;
  }
}
export function formatMoney(minor: Money | bigint | null | undefined) {
  const n = BigInt(minor ?? "0"),
    a = n < 0n ? -n : n;
  const whole = (a / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    fraction = a % 100n;
  return `${n < 0n ? "−" : ""}${whole}${fraction ? "," + fraction.toString().padStart(2, "0") : ""} so‘m`;
}
export function toMinor(value: string): Money {
  const v = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(v))
    throw new Error(
      "Summani so‘mda, ko‘pi bilan ikki kasr raqami bilan kiriting.",
    );
  const [w, f = ""] = v.split(".");
  return (BigInt(w) * 100n + BigInt(f.padEnd(2, "0"))).toString();
}
export const query = (params: Record<string, unknown>) =>
  "?" +
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
export const can = (actor: Actor, tenant: string, permission: string) =>
  actor.kind === "SUPERADMIN" ||
  actor.memberships.some(
    (m) =>
      m.sanatoriumId === tenant &&
      m.status === "ACTIVE" &&
      m.permissions.includes(permission),
  );

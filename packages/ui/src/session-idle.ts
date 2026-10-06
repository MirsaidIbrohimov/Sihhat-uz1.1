"use client";
import { useEffect, useRef } from "react";
import { api, ApiError, restoreSession, type Actor } from "@sihhat/api-client";

// Only user input records activity. Session checks and background requests do not.
export function useIdleSession(actor: Actor | null, onExpired: () => void) {
  const lastActivity = useRef(0);
  useEffect(() => {
    if (actor?.lastActivityAt)
      lastActivity.current = Math.max(
        lastActivity.current,
        Date.parse(actor.lastActivityAt),
      );
  }, [actor?.lastActivityAt]);
  useEffect(() => {
    if (!actor) return;
    const seconds =
      actor.idleTimeoutSeconds ?? (actor.kind === "SUPERADMIN" ? 7200 : 14400);
    lastActivity.current = Date.parse(actor.lastActivityAt ?? "") || Date.now();
    let closed = false,
      sending = false,
      lastSent = lastActivity.current;
    const expire = () => {
      if (closed) return;
      closed = true;
      onExpired();
      void api("/auth/logout", "POST", {}, false).catch(() => undefined);
    };
    const check = () => {
      if (Date.now() - lastActivity.current >= seconds * 1000) expire();
      return closed;
    };
    const activity = (event: Event) => {
      if (!event.isTrusted || document.hidden || check()) return;
      lastActivity.current = Date.now();
      if (sending || Date.now() - lastSent < 15000) return;
      sending = true;
      lastSent = Date.now();
      // Access-token renewal preserves the server's inactivity timestamp.
      void restoreSession()
        .then(() =>
          closed ? undefined : api("/auth/activity", "POST", {}, false),
        )
        .catch((error) => {
          if (error instanceof ApiError && error.status === 401) expire();
        })
        .finally(() => {
          sending = false;
        });
    };
    const events = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
    ];
    for (const event of events)
      window.addEventListener(event, activity, { passive: true });
    const checkVisible = () => {
      check();
    };
    window.addEventListener("focus", checkVisible);
    document.addEventListener("visibilitychange", checkVisible);
    const timer = window.setInterval(check, 1000);
    check();
    return () => {
      closed = true;
      clearInterval(timer);
      for (const event of events) window.removeEventListener(event, activity);
      window.removeEventListener("focus", checkVisible);
      document.removeEventListener("visibilitychange", checkVisible);
    };
  }, [actor?.id, actor?.idleTimeoutSeconds, onExpired]);
}

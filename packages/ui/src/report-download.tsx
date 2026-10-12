"use client";
import { useState } from "react";
import { Download } from "lucide-react";

export function XlsxDownload({ href }: { href: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="button primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch(href, {
              credentials: "same-origin",
              cache: "no-store",
              signal: AbortSignal.timeout(30000),
            });
            if (!response.ok) {
              const result = await response.json().catch(() => ({}));
              throw new Error(result.message ?? "Hisobotni yuklab bo‘lmadi.");
            }
            if (
              !response.headers.get("Content-Type")?.includes("spreadsheetml")
            )
              throw new Error(
                "Hisobot formati noto‘g‘ri. Qayta urinib ko‘ring.",
              );
            const blob = await response.blob(),
              url = URL.createObjectURL(blob),
              anchor = document.createElement("a");
            const params = new URL(href, location.origin).searchParams;
            anchor.href = url;
            anchor.download = `sihhat-report-${params.get("from")}-${params.get("to")}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Server bilan aloqa uzildi.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={17} />
        {busy ? "Hisobot tayyorlanmoqda…" : "Excel yuklash (.xlsx)"}
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

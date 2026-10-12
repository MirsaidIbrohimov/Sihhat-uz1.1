"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const preference = "sihhat-web-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.dataset.theme === "dark");
    const storage = (event: StorageEvent) => {
      if (event.key !== preference) return;
      document.documentElement.dataset.theme =
        event.newValue === "dark" ? "dark" : "light";
      sync();
    };
    sync();
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, []);
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={dark ? "Kunduzgi ko‘rinish" : "Tungi ko‘rinish"}
      title={dark ? "Kunduzgi ko‘rinish" : "Tungi ko‘rinish"}
      aria-pressed={dark}
      onClick={() => {
        const theme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        setDark(!dark);
        try {
          localStorage.setItem(preference, theme);
        } catch {
          /* Private browser storage may be unavailable. */
        }
      }}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

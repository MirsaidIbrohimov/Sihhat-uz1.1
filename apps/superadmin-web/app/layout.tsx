import type { Metadata } from "next";
import "@sihhat/ui/styles.css";
export const metadata: Metadata = {
  title: "Sihhat.uz · Boshqaruv",
  description: "Sihhat.uz boshqaruv paneli",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}

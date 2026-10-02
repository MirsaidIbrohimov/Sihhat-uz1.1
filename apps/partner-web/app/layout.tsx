import type { Metadata } from "next";
import "@sihhat/ui/styles.css";
export const metadata: Metadata = {
  title: "Sihhat.uz · Sanatoriya",
  description: "Sihhat.uz sanatoriya paneli",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}

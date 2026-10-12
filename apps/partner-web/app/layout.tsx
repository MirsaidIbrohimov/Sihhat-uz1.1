import type { Metadata } from "next";
import "@sihhat/ui/styles.css";
export const metadata: Metadata = {
  title: "Sihhat.uz · Sanatoriya",
  description: "Sihhat.uz sanatoriya paneli",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{document.documentElement.dataset.theme=localStorage.getItem("sihhat-web-theme")==="dark"?"dark":"light"}catch{}',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

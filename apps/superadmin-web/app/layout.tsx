import type { Metadata } from "next";
import "@sihhat/ui/styles.css";
export const metadata: Metadata = {
  title: "Sihhat.uz · O'zbekiston Sanatoriylarini Onlayn Tanlash va Bron Qilish",
  description: "O'zbekistonning eng yaxshi sanatoriylariga to'g'ridan-to'g'ri, rasmiy narxlarda onlayn bron qiling.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sihhat.uz",
  },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{document.documentElement.dataset.theme=localStorage.getItem("sihhat-web-theme")==="light"?"light":"dark"}catch{}',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { LandingPage } from "../landing";
import { DynamicPortal } from "../portal-client";

type Props = {
  params: Promise<{ section?: string[] }>;
};

const apiUrl = (
  process.env.SIHHAT_API_URL ||
  (process.env.VERCEL || process.env.RENDER
    ? "https://sihhat-api.onrender.com"
    : "http://127.0.0.1:4000")
).replace(/\/$/, "");

async function preloadLandingData() {
  try {
    const [catRes, adsRes] = await Promise.all([
      fetch(`${apiUrl}/catalog/sanatoriums`, {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(1800),
      }),
      fetch(`${apiUrl}/catalog/ads`, {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(1800),
      }),
    ]);
    const catJson = catRes.ok ? await catRes.json().catch(() => null) : null;
    const adsJson = adsRes.ok ? await adsRes.json().catch(() => null) : null;
    return {
      initialCatalog: Array.isArray(catJson?.data) ? catJson.data : undefined,
      initialAds: Array.isArray(adsJson) ? adsJson : undefined,
    };
  } catch {
    return { initialCatalog: undefined, initialAds: undefined };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  if (!section || section.length === 0) {
    return {
      title: "Sihhat.uz · O'zbekiston Sanatoriylarini Onlayn Tanlash va Bron Qilish",
      description:
        "O'zbekistonning eng yaxshi sanatoriylariga to'g'ridan-to'g'ri, rasmiy narxlarda onlayn bron qiling. Zomin, Chortoq, Chimyon va boshqa shifo maskanlari.",
      robots: { index: true, follow: true },
    };
  }
  return {
    title: "Sihhat.uz · Hamkorlar",
    description: "Sihhat.uz sanatoriya boshqaruv paneli",
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: Props) {
  const { section } = await params;
  if (!section || section.length === 0) {
    const { initialCatalog, initialAds } = await preloadLandingData();
    return (
      <LandingPage
        initialCatalog={initialCatalog}
        initialAds={initialAds}
      />
    );
  }
  return <DynamicPortal mode="partner" />;
}

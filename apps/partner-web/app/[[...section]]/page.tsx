import type { Metadata } from "next";
import { Portal } from "@sihhat/ui";
import { LandingPage } from "@sihhat/ui/landing";

type Props = {
  params: Promise<{ section?: string[] }>;
};

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
    return <LandingPage />;
  }
  return <Portal mode="partner" />;
}

import type { Metadata } from "next";
import { Portal } from "@sihhat/ui";

export const metadata: Metadata = {
  title: "Sihhat.uz · Boshqaruv",
  description: "Sihhat.uz superadmin paneli",
};

export default function Page() {
  return <Portal mode="admin" basePath="/superadmin" />;
}

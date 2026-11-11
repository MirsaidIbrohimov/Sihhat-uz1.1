import { handleApkDownload } from "@sihhat/ui/apk";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleApkDownload(request);
}

export async function HEAD(request: Request) {
  return handleApkDownload(request);
}

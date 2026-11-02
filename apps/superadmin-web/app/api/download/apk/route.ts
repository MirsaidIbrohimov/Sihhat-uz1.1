import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const localCandidates = [
    path.join(process.cwd(), "public", "downloads", "sihhat-uz.apk"),
    path.join(process.cwd(), "public", "sihhat-uz.apk"),
    path.join(process.cwd(), "..", "..", "ilova", "Sihhat-uz-demo-0.1.1.apk"),
    path.join(process.cwd(), "ilova", "Sihhat-uz-demo-0.1.1.apk"),
  ];

  for (const candidate of localCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate);
        if (stat.isFile() && stat.size > 1000000) {
          const buffer = fs.readFileSync(candidate);
          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": "application/vnd.android.package-archive",
              "Content-Disposition": 'attachment; filename="sihhat-uz.apk"',
              "Content-Length": stat.size.toString(),
            },
          });
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return NextResponse.redirect(
    "https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/raw/main/ilova/Sihhat-uz-demo-0.1.1.apk",
    302
  );
}

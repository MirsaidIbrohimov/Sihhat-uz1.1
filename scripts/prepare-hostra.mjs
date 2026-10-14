import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
execFileSync(process.execPath, ["scripts/check-source-secrets.mjs"], {
  cwd: root,
  stdio: "inherit",
});

const candidates = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .split("\0")
  .filter(Boolean);
const selected = (path) =>
  [
    "README.md",
    "package.json",
    "package-lock.json",
    "docs/HOSTRA.md",
    "scripts/start-web.mjs",
  ].includes(path) ||
  /^(?:apps\/(?:api|superadmin-web|partner-web)|packages\/(?:ui|api-client-ts))\//.test(
    path,
  );
const forbidden = (path) =>
  /(^|\/)(?:\.local|node_modules|\.next|\.gradle|\.dart_tool|build|dist|generated|coverage)(\/|$)/.test(
    path,
  ) ||
  (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith("/.env.example")) ||
  /(^|\/)key\.properties$|\.(?:jks|keystore|p12|pem|key|apk|aab|tsbuildinfo)$/i.test(
    path,
  );
const files = [...new Set(candidates)]
  .filter(selected)
  .filter((path) => existsSync(resolve(root, path)))
  .sort();
for (const path of files) {
  if (
    forbidden(path) ||
    /[\r\n]/.test(path) ||
    lstatSync(resolve(root, path)).isSymbolicLink()
  ) {
    throw new Error(`Hostra paketiga ruxsat etilmagan fayl: ${path}`);
  }
}
if (
  !files.includes("apps/api/src/main.ts") ||
  !files.includes("apps/superadmin-web/package.json") ||
  !files.includes("apps/partner-web/package.json")
)
  throw new Error("Hostra paketida zarur source fayllari yo‘q.");

const contentHash = createHash("sha256");
for (const path of files)
  contentHash
    .update(path)
    .update("\0")
    .update(readFileSync(resolve(root, path)))
    .update("\0");
const sourceHash = contentHash.digest("hex");
const release = `${new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d{3}Z$/, "Z")}-${sourceHash.slice(0, 12)}`;
const destination = resolve(root, ".local/hostra/releases", release);
mkdirSync(destination, { recursive: true });
const list = resolve(destination, "files.list");
const archive = resolve(destination, "source.tar.gz");
writeFileSync(list, files.map((path) => `./${path}`).join("\0") + "\0");
execFileSync("tar", ["-czf", archive, "--null", "-T", list], {
  cwd: root,
  stdio: "pipe",
});
const entries = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((path) => path.replace(/^\.\//, ""))
  .sort();
if (JSON.stringify(entries) !== JSON.stringify(files))
  throw new Error("Hostra arxivining fayllar ro‘yxati mos kelmadi.");
const report = {
  prepared_at: new Date().toISOString(),
  release,
  source_commit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  includes_worktree_changes: true,
  source_sha256: sourceHash,
  archive_sha256: createHash("sha256")
    .update(readFileSync(archive))
    .digest("hex"),
  archive: archive.replaceAll("\\", "/"),
  bytes: statSync(archive).size,
  files: files.length,
  source_files: files,
  uploaded: false,
  remote_services_verified: false,
};
writeFileSync(
  resolve(destination, "manifest.json"),
  JSON.stringify(report, null, 2),
);
writeFileSync(
  resolve(root, ".local/hostra/latest-package.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, source_files: undefined }));

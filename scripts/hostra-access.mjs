import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const folder = resolve(root, ".local/hostra");
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

async function main() {
  const access = JSON.parse(
    await readFile(resolve(folder, "owner-access.json"), "utf8"),
  );
  if (
    !/^[a-z0-9._@-]{3,64}$/.test(access.login ?? "") ||
    typeof access.password !== "string" ||
    access.password.length < 12 ||
    !/^[A-Z2-7]{32}$/.test(access.mfa_secret ?? "")
  ) {
    throw new Error("ACCESS_INVALID");
  }
  const enrollment = new URL(access.mfa_uri);
  if (
    enrollment.protocol !== "otpauth:" ||
    enrollment.hostname !== "totp" ||
    enrollment.searchParams.get("secret") !== access.mfa_secret ||
    (enrollment.searchParams.get("digits") ?? "6") !== "6" ||
    (enrollment.searchParams.get("period") ?? "30") !== "30" ||
    (enrollment.searchParams.get("algorithm") ?? "SHA1").toUpperCase() !==
      "SHA1"
  ) {
    throw new Error("ENROLLMENT_INVALID");
  }
  for (const key of ["admin_url", "partner_url"]) {
    const url = new URL(access[key]);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("URL_INVALID");
    }
  }
  const values = {
    LOGIN: access.login,
    PASSWORD: access.password,
    MFA_SECRET: access.mfa_secret,
    MFA_URI: access.mfa_uri,
    ADMIN_URL: access.admin_url,
    PARTNER_URL: access.partner_url,
  };
  const template = await readFile(
    resolve(root, "scripts/hostra-access.html"),
    "utf8",
  );
  const html = template.replace(
    /\{\{(LOGIN|PASSWORD|MFA_SECRET|MFA_URI|ADMIN_URL|PARTNER_URL)\}\}/g,
    (_, key) => escape(values[key]),
  );
  await mkdir(folder, { recursive: true, mode: 0o700 });
  await writeFile(resolve(folder, "HOSTRA_KIRISH.html"), html, { mode: 0o600 });
  console.log(
    "Hostra kirish fayli tayyor: .local/hostra/HOSTRA_KIRISH.html. Login, parol va MFA kaliti o‘zgartirilmadi; sirlar logga chiqarilmadi.",
  );
}
main().catch(() => {
  console.error(
    "Hostra kirish fayli tayyorlanmadi. Private owner-access.json ma’lumotlarini tekshiring; sirlar logga chiqarilmadi.",
  );
  process.exitCode = 1;
});

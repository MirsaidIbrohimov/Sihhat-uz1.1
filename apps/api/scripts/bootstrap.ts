import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createApp } from "../src/app";
import { AuthService } from "../src/auth/auth.service";
import { base32 } from "../src/common/crypto";

async function main() {
  if (!process.env.BOOTSTRAP_LOGIN || !process.env.BOOTSTRAP_PASSWORD)
    throw new Error(
      "BOOTSTRAP_LOGIN va BOOTSTRAP_PASSWORD environment orqali kerak",
    );
  const { app } = await createApp({ quiet: true, swagger: false });
  const output = resolve(
    process.env.BOOTSTRAP_MFA_FILE ??
      resolve(__dirname, "../../../.local/bootstrap-mfa.json"),
  );
  let written = false,
    created = false;
  try {
    const secret = base32(randomBytes(20));
    const uri = `otpauth://totp/Sihhat%20uz:${encodeURIComponent(process.env.BOOTSTRAP_LOGIN)}?secret=${secret}&issuer=Sihhat%20uz&digits=6&period=30`;
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    // Refuse to overwrite enrollment data. Never print the secret or URI in logs.
    await writeFile(
      output,
      JSON.stringify(
        {
          issuer: "Sihhat uz",
          login: process.env.BOOTSTRAP_LOGIN,
          secret,
          uri,
          digits: 6,
          period: 30,
        },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    );
    written = true;
    await app
      .get(AuthService)
      .bootstrap(
        process.env.BOOTSTRAP_LOGIN,
        process.env.BOOTSTRAP_PASSWORD,
        secret,
      );
    created = true;
    console.log(
      `Superadmin yaratildi. Maxfiy authenticator ulash fayli: ${output}. Telefon ilovasiga bir marta ulang; faylni webda e’lon qilmang.`,
    );
  } finally {
    if (written && !created) await unlink(output);
    await app.close();
  }
}
main().catch(() => {
  console.error(
    "Superadmin bootstrap bajarilmadi. Hisob, muhit va private MFA fayl manzilini tekshiring. Sirlar logga chiqarilmadi.",
  );
  process.exitCode = 1;
});

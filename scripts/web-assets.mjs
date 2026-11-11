import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
for (const app of ["superadmin-web", "partner-web"]) {
  const publicRoot = join(root, "apps", app, "public");
  for (const directory of ["fonts", "branding"])
    mkdirSync(join(publicRoot, directory), { recursive: true });
  for (const font of ["DMSans", "Manrope"]) {
    copyFileSync(
      join(root, "apps/mobile/assets/fonts", `${font}.ttf`),
      join(publicRoot, "fonts", `${font}.ttf`),
    );
    copyFileSync(
      join(root, "apps/mobile/assets/licenses", `${font}-OFL.txt`),
      join(publicRoot, "fonts", `${font}-OFL.txt`),
    );
  }
  copyFileSync(
    join(root, "apps/mobile/assets/welcome-retreat.png"),
    join(publicRoot, "branding/welcome-retreat.png"),
  );
  copyFileSync(
    join(root, "apps/mobile/assets/illustrations/wellness-retreat.png"),
    join(publicRoot, "branding/wellness-retreat.png"),
  );
  const logoPng = join(root, "apps/mobile/assets/branding/sihhat-logo.png");
  if (existsSync(logoPng)) {
    copyFileSync(logoPng, join(publicRoot, "branding/sihhat-logo.png"));
  }
}
console.log(
  "Web panellarning lokal shriftlari va Sihhat illustratsiyasi tayyor.",
);

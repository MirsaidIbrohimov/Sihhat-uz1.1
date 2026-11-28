import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const webBrandingSource = join(root, "assets/branding/web");
const webImages = existsSync(webBrandingSource)
  ? readdirSync(webBrandingSource).filter((file) =>
      /\.(?:jpg|jpeg|png|webp)$/i.test(file),
    )
  : [];

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
  for (const image of webImages) {
    copyFileSync(
      join(webBrandingSource, image),
      join(publicRoot, "branding", image),
    );
  }
  // Legacy web fallback paths also receive photographic artwork so no flat default
  // placeholder illustration can appear on cached or legacy web panel views.
  const defaultCover = join(webBrandingSource, "sanatorium-default-cover.jpg");
  if (existsSync(defaultCover)) {
    await sharp(defaultCover)
      .resize(960, 540, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(publicRoot, "branding/welcome-retreat.png"));
  }
  const heroRetreat = join(webBrandingSource, "hero-retreat.jpg");
  if (existsSync(heroRetreat)) {
    await sharp(heroRetreat)
      .resize(1280, 720, { fit: "cover", position: "right" })
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(publicRoot, "branding/wellness-retreat.png"));
  }
  const logoPng = join(root, "apps/mobile/assets/branding/sihhat-logo.png");
  if (existsSync(logoPng)) {
    copyFileSync(logoPng, join(publicRoot, "branding/sihhat-logo.png"));
  }
}
console.log(
  `Web panellarning lokal shriftlari va ${webImages.length} ta yangi Sihhat surati tayyor.`,
);

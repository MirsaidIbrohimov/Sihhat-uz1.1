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
    const srcPath = join(webBrandingSource, image);
    const dstPath = join(publicRoot, "branding", image);
    if (/\.(?:jpg|jpeg)$/i.test(image)) {
      await sharp(srcPath)
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 76, mozjpeg: true, progressive: true })
        .toFile(dstPath);
    } else if (/\.png$/i.test(image)) {
      await sharp(srcPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 78 })
        .toFile(dstPath);
    } else {
      copyFileSync(srcPath, dstPath);
    }
  }
  // Legacy web fallback paths also receive compact photographic artwork
  const defaultCover = join(webBrandingSource, "sanatorium-default-cover.jpg");
  if (existsSync(defaultCover)) {
    await sharp(defaultCover)
      .resize(800, 450, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9, palette: true, quality: 72 })
      .toFile(join(publicRoot, "branding/welcome-retreat.png"));
  }
  const heroRetreat = join(webBrandingSource, "hero-retreat.jpg");
  if (existsSync(heroRetreat)) {
    await sharp(heroRetreat)
      .resize(960, 540, { fit: "cover", position: "right" })
      .png({ compressionLevel: 9, palette: true, quality: 72 })
      .toFile(join(publicRoot, "branding/wellness-retreat.png"));
  }
  const logoPng = join(root, "apps/mobile/assets/branding/sihhat-logo.png");
  if (existsSync(logoPng)) {
    await sharp(logoPng)
      .resize(224, 224, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true, quality: 85 })
      .toFile(join(publicRoot, "branding/sihhat-logo.png"));
    await sharp(logoPng)
      .resize(192, 192, { fit: "cover" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(join(publicRoot, "branding/sihhat-logo.jpg"));
    await sharp(logoPng)
      .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true, quality: 85 })
      .toFile(join(publicRoot, "favicon.png"));
    await sharp(logoPng)
      .resize(180, 180, { fit: "contain", background: { r: 10, g: 15, b: 31, alpha: 1 } })
      .png({ compressionLevel: 9, palette: true, quality: 85 })
      .toFile(join(publicRoot, "apple-touch-icon.png"));
    if (app === "superadmin-web") {
      await sharp(logoPng)
        .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9, palette: true, quality: 85 })
        .toFile(join(publicRoot, "branding/sihhat-app-icon.png"));
    }
  }
}
console.log(
  `Web panellarning lokal shriftlari va ${webImages.length} ta siqilgan Sihhat surati tayyor.`,
);

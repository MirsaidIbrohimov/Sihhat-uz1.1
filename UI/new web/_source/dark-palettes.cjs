"use strict";
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const SRC_DIR = __dirname;
const OUT_DIR = path.resolve(SRC_DIR, "..", "tungi_ranglar");
fs.mkdirSync(OUT_DIR, { recursive: true });

const PAGE_URL = pathToFileURL(path.join(SRC_DIR, "dark-palettes.html")).href;

const PALETTES = [
  "T1-tungi-yorqin-indigo",
  "T2-karbon-qora-elektr-kok",
  "T3-chuqur-sapphire-feruza",
  "T4-tungi-binafsha-orxideya",
  "T5-tungi-zumrad-aqua",
  "T6-tungi-aurora-multi",
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1040 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  for (const id of PALETTES) {
    await page.goto(`${PAGE_URL}?palette=${encodeURIComponent(id)}`, { waitUntil: "networkidle" });
    await page.waitForSelector('body[data-ready="true"]');
    await page.evaluate(() => document.fonts.ready);

    const outPath = path.join(OUT_DIR, `${id}.png`);
    await page.locator("#stage").screenshot({ path: outPath, type: "png" });
    const stat = fs.statSync(outPath);
    console.log(`Rendered ${id}.png (${(stat.size / 1024).toFixed(1)} KB) [OK]`);
  }

  await page.goto(`${PAGE_URL}?palette=compare`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
  const cmpPath = path.join(OUT_DIR, "00-tungi-ranglar-taqqoslash.png");
  await page.locator("#stage").screenshot({ path: cmpPath, type: "png" });
  const cmpStat = fs.statSync(cmpPath);
  console.log(`Rendered 00-tungi-ranglar-taqqoslash.png (${(cmpStat.size / 1024).toFixed(1)} KB) [OK]`);

  await browser.close();
  if (errors.length) {
    console.error("Page errors:", errors);
    process.exit(1);
  }
  console.log(`Done! Saved 7 dark palette images to ${OUT_DIR}`);
})();

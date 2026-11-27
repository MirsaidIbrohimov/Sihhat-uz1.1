"use strict";
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const SRC_DIR = __dirname;
const OUT_DIR = path.resolve(SRC_DIR, "..");
const STUDIO_URL = pathToFileURL(path.join(SRC_DIR, "studio.html")).href;

const BOARDS = [
  "00-superadmin-dizayn-tizimi",
  "01-superadmin-kirish",
  "02-superadmin-bosh-sahifa-kunduzgi",
  "03-superadmin-bosh-sahifa-tungi",
  "04-superadmin-sanatoriyalar-va-mashhur",
  "05-superadmin-hamkor-arizalari",
  "06-superadmin-bronlar-va-bugungi-ishlar",
  "07-superadmin-jamoa-va-ilova-foydalanuvchilari",
  "08-superadmin-moliya-va-reklama",
  "09-superadmin-yordam-jonli-chat-biriktirish",
  "10-superadmin-elonlar-va-xabarlar-markazi",
  "11-superadmin-amallar-tarixi-va-xavfsizlik",
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1040 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  for (const id of BOARDS) {
    const url = `${STUDIO_URL}?board=${encodeURIComponent(id)}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector('body[data-ready="true"]');
    await page.evaluate(() => document.fonts.ready);

    const outPath = path.join(OUT_DIR, `${id}.png`);
    const stage = page.locator("#stage");
    await stage.screenshot({ path: outPath, type: "png" });

    const audit = await page.evaluate(() => {
      const issues = [];
      const stageEl = document.getElementById("stage");
      if (stageEl.scrollHeight > stageEl.clientHeight + 2) {
        issues.push(`stage vertical overflow: ${stageEl.scrollHeight} > ${stageEl.clientHeight}`);
      }
      if (stageEl.scrollWidth > stageEl.clientWidth + 2) {
        issues.push(`stage horizontal overflow: ${stageEl.scrollWidth} > ${stageEl.clientWidth}`);
      }
      document.querySelectorAll(".card").forEach((el, i) => {
        const tbl = el.querySelector("table.dt");
        if (tbl && tbl.scrollWidth > el.clientWidth + 4) {
          issues.push(`card#${i} table overflow: ${tbl.scrollWidth} > ${el.clientWidth}`);
        }
      });
      document.querySelectorAll(".sb-item").forEach((el) => {
        if (el.getBoundingClientRect().height > 40) {
          issues.push(`sidebar item wrapped: "${el.textContent.trim()}"`);
        }
      });
      return issues;
    });

    const stat = fs.statSync(outPath);
    console.log(
      `${id}.png (${(stat.size / 1024).toFixed(1)} KB) ` +
        (audit.length ? `[WARN: ${audit.join(" | ")}]` : "[FIT OK]")
    );
  }

  await browser.close();
  if (errors.length) {
    console.error("Page errors:", errors);
    process.exit(1);
  }
  console.log(`Rendered ${BOARDS.length} Superadmin design mockups into ${OUT_DIR}`);
})();

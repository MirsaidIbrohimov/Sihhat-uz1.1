"use strict";
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const DIR = __dirname;
const STUDIO_URL = pathToFileURL(path.join(DIR, "studio.html")).href;

const BOARDS = [
  "00-umumiy-dizayn-konsepsiyasi",
  "01-superadmin-kirish-va-mfa",
  "02-superadmin-bosh-sahifa-kunduzgi",
  "03-superadmin-bosh-sahifa-tungi",
  "04-superadmin-sanatoriyalar-va-mashhur",
  "05-superadmin-ilova-foydalanuvchilari-modal",
  "06-superadmin-jamoa-va-ruxsatlar",
  "07-superadmin-moliya-tezcheck-va-reklama",
  "08-superadmin-aloqa-yordam-chat-va-elon",
  "09-hamkorlar-kirish-va-shartlar",
  "10-hamkorlar-direktor-bosh-sahifa-va-bugun",
  "11-hamkorlar-shaxmatka-bandlik-kalendari",
  "12-hamkorlar-bronlar-crm-va-profsoyuz",
  "13-hamkorlar-bron-tafsiloti-va-emehmon",
  "14-hamkorlar-sanatoriya-profili-va-ustaxona",
  "15-hamkorlar-hisobchi-va-mobil-tungi",
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
    const url = `${STUDIO_URL}?board=${encodeURIComponent(id)}&capture=1`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector('body[data-ready="true"]');
    await page.evaluate(() => document.fonts.ready);

    const outPath = path.join(DIR, `${id}.png`);
    const stage = page.locator("#stage");
    await stage.screenshot({ path: outPath, type: "png" });
    const overflow = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll(".glass-card, .tg-hub-v3").forEach((el, i) => {
        const table = el.querySelector("table");
        if (table && table.scrollWidth > el.clientWidth + 4) {
          issues.push(`card#${i} table scrollWidth=${table.scrollWidth} > clientWidth=${el.clientWidth}`);
        }
      });
      return issues;
    });
    const stat = fs.statSync(outPath);
    console.log(
      `Rendered ${id}.png (${(stat.size / 1024).toFixed(1)} KB)` +
        (overflow.length ? ` [OVERFLOW: ${overflow.join("; ")}]` : " [FIT OK]")
    );
  }

  await browser.close();

  if (errors.length > 0) {
    console.error("Page errors detected:", errors);
    process.exit(1);
  }
  console.log(`Successfully rendered all ${BOARDS.length} design boards in ${DIR}`);
})();

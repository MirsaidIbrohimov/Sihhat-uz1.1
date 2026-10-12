const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const web = path.resolve(__dirname, "..");
const root = path.resolve(web, "../..");
const localBrowser =
  "C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(localBrowser) ? { executablePath: localBrowser } : {}),
  });
  const results = [];
  try {
    for (const file of ["index.html", "preview.html"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        offline: true,
      });
      const page = await context.newPage();
      const errors = [],
        failed = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => failed.push(r.url()));
      await page.goto(pathToFileURL(path.join(web, file)).href, {
        waitUntil: "networkidle",
      });
      await page.evaluate(async () => {
        for (const image of document.images) image.loading = "eager";
        await Promise.all(
          Array.from(document.images).map((image) => image.decode()),
        );
        await document.fonts.ready;
      });
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        images: Array.from(document.images).length,
        imagesMissing: Array.from(document.images).filter(
          (i) => !i.naturalWidth,
        ).length,
        fonts: Array.from(document.fonts).map((f) => ({
          family: f.family,
          status: f.status,
        })),
        ready: document.querySelector(".screen-card,.shell") !== null,
      }));
      if (
        errors.length ||
        failed.length ||
        metrics.imagesMissing ||
        !metrics.ready ||
        metrics.documentWidth > metrics.width ||
        metrics.fonts.some((f) => f.status !== "loaded")
      )
        throw new Error(
          `${file} offline failed: ${JSON.stringify({ errors, failed, metrics })}`,
        );
      if (file === "index.html") {
        await page
          .getByRole("button", { name: "Taqqoslash", exact: true })
          .click();
        await page.getByLabel("Ekranni qidirish").fill("04");
        await page.locator(".screen-preview").click();
        if ((await page.locator("#viewer-body img").count()) !== 2)
          throw new Error("Offline comparison did not open.");
        await page.keyboard.press("Escape");
      }
      results.push({ file, errors: 0, failedRequests: 0, ...metrics });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(root, ".local/web-ui-offline-validation.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        offline: true,
        protocol: "file:",
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      fileProtocol: true,
      offline: true,
      pages: results.length,
      fontsLoaded: true,
      allImagesDecoded: true,
      comparisonWorks: true,
      errors: 0,
    }),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

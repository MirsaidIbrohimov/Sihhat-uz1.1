const { chromium, expect } = require("@playwright/test");
const {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} = require("node:fs");
const { resolve, join } = require("node:path");
const { mock, cases, bookings, inventory } = require("./current.cjs");
const root = resolve(__dirname, "../../..");
const web = join(root, "UI/web");
const browserPath =
  "C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
const screens = JSON.parse(
  readFileSync(join(web, "manifest.json"), "utf8"),
).screens;

function response(path, role, section) {
  if (/\/support\/tickets\//.test(path))
    return {
      id: path.split("/").at(-1),
      title: "Bron sanasini aniqlashtirish",
      status: "OPEN",
      messages: [
        {
          id: "support-1",
          userId: "other-user",
          text: "Mehmon kelish sanasini aniqlashtirib bera olasizmi?",
          createdAt: "2026-10-10T05:00:00Z",
        },
        {
          id: "support-2",
          userId: "ui-actor",
          text: "Bron tafsilotlarini ko‘rib chiqdik. Mehmon bilan kelish vaqti tasdiqlandi.",
          createdAt: "2026-10-10T06:00:00Z",
        },
      ],
    };
  if (/\/bookings\//.test(path))
    return {
      ...bookings[0],
      payment: { status: "SUCCEEDED" },
      refund: null,
      items: [
        {
          id: "item-1",
          roomId: inventory.rooms[0].id,
          roomTypeId: inventory.types[0].id,
          adults: 2,
          childrenAges: [],
          amount: bookings[0].amount,
        },
      ],
      offline_payments: [],
      events: [
        {
          id: "event-1",
          status: "CONFIRMED",
          reason: "Onlayn to‘lov tasdiqlandi",
          createdAt: bookings[0].createdAt,
        },
      ],
    };
  const data = mock(path, role, section === "login");
  if (
    section === "profile-edit" &&
    Array.isArray(data?.revisions) &&
    /\/sanatoriums\//.test(path) &&
    !path.endsWith("/inventory")
  )
    return {
      ...data,
      publicRevisionId: null,
      revisions: data.revisions.map((revision) => ({
        ...revision,
        status: "DRAFT",
      })),
    };
  return data;
}
async function prepare(browser, screen, theme, width = screen.width) {
  const errors = [],
    external = [],
    context = await browser.newContext({
      viewport: { width, height: width < 700 ? 844 : 1000 },
      locale: "uz-UZ",
      timezoneId: "Asia/Tashkent",
    });
  await context.addInitScript(
    (value) => localStorage.setItem("sihhat-web-theme", value),
    theme,
  );
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.slice(4);
      if (path.startsWith("/media/"))
        return route.fulfill({
          status: 200,
          contentType: "image/png",
          body: readFileSync(join(web, "assets/retreat.png")),
        });
      if (route.request().method() !== "GET" && path !== "/auth/refresh")
        return route.fulfill({
          status: 409,
          json: {
            code: "UI_PREVIEW_ONLY",
            message: "Rasm tekshiruvida o‘zgarish saqlanmaydi.",
          },
        });
      const data = response(path, screen.role, screen.section);
      return route.fulfill(
        data === null
          ? {
              status: 401,
              json: {
                code: "SESSION_REQUIRED",
                message: "Hisobingizga kiring.",
              },
            }
          : { status: 200, json: data },
      );
    }
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      external.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const section =
    { "booking-detail": "bookings", "profile-edit": "profile" }[
      screen.section
    ] ?? screen.section;
  await page.goto(
    `http://127.0.0.1:${screen.role === "admin" ? 3000 : 3001}/${["login", "dashboard"].includes(section) ? "" : section}`,
    { waitUntil: "networkidle" },
  );
  await page
    .locator(section === "login" ? ".login-form" : ".app-shell")
    .waitFor();
  await expect(page.locator(".skeletons")).toHaveCount(0);
  if (screen.section === "booking-detail") {
    await page
      .locator("main")
      .getByRole("button", { name: "Ochish", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Bron ma’lumotlari", exact: true }),
    ).toBeVisible();
  }
  if (screen.section === "profile-edit") {
    await page
      .locator("main")
      .getByRole("button", { name: "Tahrirlash", exact: true })
      .click();
    await expect(page.locator("main input[name='name']")).toBeVisible();
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) => image.decode().catch(() => {})),
    );
  });
  return { page, context, errors, external };
}
async function metrics(page) {
  return page.evaluate(() => {
    const rectangles = Array.from(
      document.querySelectorAll(".money-amount"),
      (node) => ({
        width: node.getBoundingClientRect().width,
        scroll: node.scrollWidth,
      }),
    );
    return {
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      missingImages: Array.from(document.images).filter(
        (image) => !image.complete || !image.naturalWidth,
      ).length,
      theme: document.documentElement.dataset.theme,
      fontsLoaded:
        document.fonts.check('14px "DM Sans"') &&
        document.fonts.check('20px "Manrope"'),
      moneyClipped: rectangles.some((rect) => rect.scroll > rect.width + 1),
      errors: Array.from(
        document.querySelectorAll(".error-box"),
        (node) => node.textContent,
      ),
    };
  });
}
async function run() {
  mkdirSync(join(web, "joriy"), { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(existsSync(browserPath) ? { executablePath: browserPath } : {}),
  });
  const results = [],
    interactions = [];
  const auditOnly = process.argv.includes("--audit");
  try {
    const matrix = auditOnly
      ? cases.flatMap(([id, role, section, title]) => [
          { id, role, section, title, width: 1440, theme: "dark" },
          { id, role, section, title, width: 390, theme: "light" },
        ])
      : screens;
    for (const screen of matrix) {
      const theme = screen.theme ?? "light";
      const { page, context, errors, external } = await prepare(
        browser,
        screen,
        theme,
      );
      const measured = await metrics(page);
      const valid =
        !errors.length &&
        !external.length &&
        !measured.missingImages &&
        !measured.errors.length &&
        !measured.moneyClipped &&
        measured.documentWidth <= measured.width &&
        measured.fontsLoaded &&
        measured.theme === theme;
      if (!auditOnly)
        await page.screenshot({
          path: join(web, "joriy", `${screen.id}.png`),
          fullPage: true,
          animations: "disabled",
        });
      results.push({
        id: screen.id,
        width: screen.width,
        theme,
        valid,
        ...measured,
        pageErrors: errors,
        externalRequests: external,
      });
      console.log(
        JSON.stringify({
          screen: screen.id,
          width: screen.width,
          theme,
          valid,
          overflow: measured.documentWidth - measured.width,
          moneyClipped: measured.moneyClipped,
          errors: errors.length + measured.errors.length,
        }),
      );
      if (!valid)
        throw new Error(
          `UI verification failed: ${screen.id}, ${theme}, ${screen.width}px`,
        );
      await context.close();
    }
    if (auditOnly) {
      const screen = { role: "admin", section: "sanatoriums", width: 1440 };
      const { page, context } = await prepare(browser, screen, "light");
      const menu = page.locator("main .row-actions").first();
      await menu.getByRole("button", { name: /Boshqa amallar/ }).click();
      await expect(
        menu.getByRole("button", { name: "Arxivlash", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        menu.getByRole("button", { name: "Arxivlash", exact: true }),
      ).toBeHidden();
      await menu.getByRole("button", { name: /Boshqa amallar/ }).click();
      await menu
        .getByRole("button", { name: "To‘xtatish", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByLabel("Sabab", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Tungi ko‘rinish", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const finance = page.getByRole("button", { name: "Moliya", exact: true });
      await finance.click();
      await page
        .locator("nav")
        .getByRole("button", { name: "To‘lovlar", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Menyuni ochish", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Panel menyusi" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
      for (const width of [320, 360, 390, 768, 1024]) {
        await page.setViewportSize({ width, height: 844 });
        expect((await metrics(page)).documentWidth).toBeLessThanOrEqual(width);
      }
      interactions.push(
        "row menu, Escape, guarded danger dialog, persistent theme, theme across navigation, mobile drawer, 320–1024px",
      );
      await context.close();
      const login = await prepare(
        browser,
        { role: "director", section: "login", width: 390 },
        "dark",
      );
      await login.page
        .getByLabel("Parol", { exact: true })
        .fill("SyntheticPreviewPassword");
      await login.page
        .getByRole("button", { name: "Parolni ko‘rsatish" })
        .click();
      await expect(
        login.page.locator("input[name='password']"),
      ).toHaveAttribute("type", "text");
      await login.page
        .getByRole("button", { name: "Parolni yashirish" })
        .click();
      await expect(
        login.page.locator("input[name='password']"),
      ).toHaveAttribute("type", "password");
      interactions.push("mobile dark login password visibility");
      await login.context.close();
    }
  } finally {
    await browser.close();
    writeFileSync(
      join(
        root,
        `.local/web-ui-${auditOnly ? "design-audit" : "implemented"}-validation.json`,
      ),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          data: "Actual React UI with intercepted synthetic masked data. No live login, mutation or provider request.",
          results,
          interactions,
        },
        null,
        2,
      ),
    );
  }
  console.log(
    JSON.stringify({
      passed: results.length,
      interactions: interactions.length,
      syntheticData: true,
    }),
  );
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

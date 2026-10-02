import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const root = resolve(import.meta.dirname, '..');
const folder = resolve(root, '.local');
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await page.goto('https://my.eskiz.uz', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const language = page.getByRole('button', { name: "O'zbekcha", exact: true });
  await language.waitFor({ state: 'visible', timeout: 15000 });
  await language.click();
  await page.locator('.langs').waitFor({ state: 'hidden', timeout: 15000 });
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 30000 });
  if (process.argv.includes('--login')) {
    const secrets = parse(await readFile(resolve(folder, 'secrets/providers.env'), 'utf8'));
    const password = page.locator('input[type=password]');
    await password.fill(secrets.ESKIZ_ACCOUNT_PASSWORD ?? secrets.ESKIZ_PASSWORD);
    const inputs = page.locator('input:not([type=password]):not([type=checkbox]):not([type=hidden])');
    await inputs.first().fill(secrets.ESKIZ_ACCOUNT_EMAIL ?? secrets.ESKIZ_EMAIL);
    await page.getByRole('button', { name: /войти|kirish|login|sign in/i }).first().click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    if (process.argv.includes('--sms')) {
      await page.locator('a').filter({ hasText: /^\s*SMS\s*$/ }).click();
      await page.waitForTimeout(2000);
      if (process.argv.includes('--texts')) {
        await page.locator('a').filter({ hasText: /^\s*Mening matnlarim\s*$/ }).click();
        await page.waitForTimeout(1500);
        if (process.argv.includes('--inspect-otp')) {
          const sample = (secrets.ESKIZ_OTP_TEMPLATE ?? 'Sihhat uz kirish kodi: {code}. Kodni hech kimga bermang.').replace('{code}', '123456');
          const text = await page.locator('body').innerText();
          console.log(JSON.stringify({ template_matches: await page.getByText(sample, { exact: true }).count(), relevant_lines: text.split('\n').filter(line => /Sihhat|kirish kodi|moderats|tasdiq|test rejim|xato|matn mavjud/i.test(line)).slice(0, 30), template_rows: await page.locator('tr').filter({ hasText: /Sihhat/i }).allTextContents(), sms_sent: false }));
        }
        if (process.argv.includes('--template-modal')) {
          const sample = (secrets.ESKIZ_OTP_TEMPLATE ?? 'Sihhat uz kirish kodi: {code}. Kodni hech kimga bermang.').replace('{code}', '123456');
          const existing = page.locator('tr').filter({ hasText: sample });
          if (process.argv.includes('--register-otp') && await existing.count()) {
            console.log(JSON.stringify({ template_already_present: true, template_rows: await existing.allTextContents(), sms_sent: false }));
          } else {
          await page.getByRole('button', { name: /Matn qo'shish/ }).click();
          await page.waitForTimeout(500);
          const modal = page.locator('textarea[name=text]').locator('xpath=ancestor::*[contains(@class,"modal-content")]');
          console.log(JSON.stringify({ template_form_instructions: (await modal.innerText()).slice(0, 5000), guides: await modal.locator('a').evaluateAll(elements => elements.map(e => ({ text: e.innerText, href: e.href }))) }));
          if (process.argv.includes('--inspect-form')) {
            console.log(JSON.stringify({ controls: await modal.locator('textarea,input,button,form').evaluateAll(elements => elements.map(e => ({ tag: e.tagName, attributes: Object.fromEntries([...e.attributes].filter(a => !['value'].includes(a.name)).map(a => [a.name, a.value])) }))), scripts: await page.locator('script[src]').evaluateAll(elements => elements.map(e => e.src)) }));
          }
          if (process.argv.includes('--register-otp')) {
            await modal.locator('textarea[name=text]').fill(sample);
            await modal.locator('textarea[name=comment]').fill('Sihhat.uz ilovasiga kirish uchun olti raqamli bir martalik tasdiqlash kodi. 123456 o\'zgaruvchan kod namunasidir.');
            await modal.locator('input[name=terms_condition]').check();
            await modal.locator('input[name=terms_condition_2]').check();
            const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).hostname === 'my.eskiz.uz' && (r.request().postData() ?? '').includes('123456'), { timeout: 20000 });
            await modal.getByRole('button', { name: 'Saqlash', exact: true }).click();
            const saved = await response;
            await page.waitForTimeout(2000);
            const pending = page.locator('tr').filter({ hasText: sample });
            const hide = value => Object.values(secrets).filter(Boolean).reduce((text, secret) => text.replaceAll(secret, '[private]'), value).replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]').replace(/eyJ[\w.-]{20,}|AQ\.[\w-]+|AIza[\w-]+/g, '[private]').slice(0, 1200);
            const payload = await saved.json().catch(() => ({}));
            const responseInfo = Object.fromEntries(['message', 'error', 'status', 'success', 'reason'].filter(key => typeof payload[key] === 'string' || typeof payload[key] === 'boolean').map(key => [key, typeof payload[key] === 'string' ? hide(payload[key]) : payload[key]]));
            const evidence = { template_submit_status: saved.status(), template_submit_path: new URL(saved.url()).pathname, response: responseInfo, modal_closed: !await modal.isVisible(), notices: (await page.locator('.alert,.invalid-feedback,.help-block,.swal2-html-container,[role=alert]').allTextContents()).map(hide), template_rows: await pending.allTextContents(), sms_sent: false };
            await writeFile(resolve(folder, 'eskiz-otp-template.json'), JSON.stringify(evidence, null, 2));
            console.log(JSON.stringify(evidence));
          }
          }
        }
      }
      if (process.argv.includes('--gateway')) {
        await page.locator('a').filter({ hasText: /^\s*SMS shlyuz\s*$/ }).click();
        await page.waitForTimeout(1500);
        if (process.argv.includes('--save-api')) {
          const fields = await page.locator('input:not([name=domain])').evaluateAll(elements => elements.map(e => e.value));
          const email = fields.find(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
          const password = fields.find(value => value !== email && value.length >= 8 && !/^[*•●]+$/.test(value));
          if (!email || !password || !/^[\w.@+-]+$/.test(password)) throw new Error('Eskiz API fields could not be read safely.');
          const form = new FormData(); form.set('email', email); form.set('password', password);
          const response = await fetch('https://notify.eskiz.uz/api/auth/login', { method: 'POST', body: form, signal: AbortSignal.timeout(15000), redirect: 'error' });
          const body = await response.json();
          if (!response.ok || typeof body?.data?.token !== 'string') throw new Error('Eskiz gateway credentials were not accepted.');
          const path = resolve(folder, 'secrets/providers.env');
          let raw = await readFile(path, 'utf8');
          raw += `\nESKIZ_ACCOUNT_EMAIL=${secrets.ESKIZ_EMAIL}\nESKIZ_ACCOUNT_PASSWORD=${secrets.ESKIZ_PASSWORD}\n`;
          raw = raw.replace(/^ESKIZ_EMAIL=.*$/m, `ESKIZ_EMAIL=${email}`).replace(/^ESKIZ_PASSWORD=.*$/m, `ESKIZ_PASSWORD=${password}`);
          await writeFile(path, raw);
          const headers = { Authorization: `Bearer ${body.data.token}` };
          const templates = await fetch('https://notify.eskiz.uz/api/user/templates', { headers, signal: AbortSignal.timeout(15000), redirect: 'error' });
          const payload = await templates.json();
          console.log(JSON.stringify({ sms_api_authenticated: true, templates_status: templates.status, templates: (payload?.result ?? []).map(t => ({ id: t.id, status: t.status, original_text: t.original_text })), sms_sent: false }));
        }
      }
    }
  }
  // Capture only visible page text for this explicitly requested Eskiz workflow.
  if (!process.argv.includes('--login')) {
    await writeFile(resolve(folder, 'eskiz-page.txt'), (await page.locator('body').innerText()).slice(0, 10000), { mode: 0o600 });
    await page.screenshot({ path: resolve(folder, 'eskiz-page.png'), fullPage: false });
  }
  console.log(JSON.stringify({ url: page.url(), headings: await page.getByRole('heading').allTextContents(), inputs: await page.locator('input,textarea,select').evaluateAll(elements => elements.map(e => ({ tag: e.tagName, type: e.type, placeholder: e.placeholder, name: e.name, readonly: e.readOnly }))), buttons: await page.getByRole('button').allTextContents(), links: await page.getByRole('link').allTextContents() }));
} finally { await browser.close(); }

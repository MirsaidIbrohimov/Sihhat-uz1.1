import { loadConfig } from '../src/common/config';

// Deliberately emits only connection status. No response bodies, keys, tokens,
// passwords, prompts or customer data may be printed by this diagnostic.
async function main() {
  const config = loadConfig();
  const report: Record<string, unknown> = {};
  if (config.GEMINI_API_KEY) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
        headers: { 'x-goog-api-key': config.GEMINI_API_KEY }, signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      const body = await response.json() as any;
      report.gemini = { authenticated: response.ok, http_status: response.status, error_code: response.ok ? null : body?.error?.status ?? 'PROVIDER_REJECTED', error_reason: response.ok ? null : body?.error?.details?.find((d: any) => d.reason)?.reason ?? null };
    } catch { report.gemini = { authenticated: false, error_code: 'NETWORK_ERROR' }; }
  } else report.gemini = { configured: false };
  if (config.ESKIZ_TOKEN || (config.ESKIZ_EMAIL && config.ESKIZ_PASSWORD)) {
    try {
      const form = new FormData(); form.set('email', config.ESKIZ_EMAIL); form.set('password', config.ESKIZ_PASSWORD);
      const response = config.ESKIZ_TOKEN
        ? await fetch('https://notify.eskiz.uz/api/auth/user', { headers: { Authorization: `Bearer ${config.ESKIZ_TOKEN}` }, signal: AbortSignal.timeout(15000), redirect: 'error' })
        : await fetch('https://notify.eskiz.uz/api/auth/login', { method: 'POST', body: form, signal: AbortSignal.timeout(15000), redirect: 'error' });
      const body = await response.json() as any;
      const authenticated = response.ok && (config.ESKIZ_TOKEN ? Boolean(body?.data ?? body?.id) : typeof body?.data?.token === 'string');
      const state: Record<string, unknown> = { authenticated, http_status: response.status, sms_sent: false };
      report.eskiz = state;
      if (authenticated) {
        const headers = { Authorization: `Bearer ${config.ESKIZ_TOKEN || body.data.token}` };
        const accountResponse = await fetch('https://notify.eskiz.uz/api/auth/user', { headers, signal: AbortSignal.timeout(15000), redirect: 'error' });
        const account = (await accountResponse.json() as any)?.data;
        state.account_status = account?.status ?? null; state.contract_account = account?.is_vip ?? null;
        const templates = async () => {
          const r = await fetch('https://notify.eskiz.uz/api/user/templates', { headers, signal: AbortSignal.timeout(15000), redirect: 'error' });
          if (!r.ok) throw new Error('TEMPLATE_CHECK_FAILED');
          return ((await r.json()) as any)?.result ?? [];
        };
        const sample = config.ESKIZ_OTP_TEMPLATE.replaceAll('{code}', '123456');
        let matching = (await templates()).filter((t: any) => t.original_text === sample);
        if (!matching.length && process.argv.includes('--register-otp')) {
          const registration = new FormData(); registration.set('template', sample);
          const r = await fetch('https://notify.eskiz.uz/api/user/template', { method: 'POST', headers, body: registration, signal: AbortSignal.timeout(15000), redirect: 'error' });
          state.template_registration_http_status = r.status;
          if (!r.ok) {
            const error = await r.json() as any;
            const hide = (text: string) => [config.GEMINI_API_KEY, config.ESKIZ_EMAIL, config.ESKIZ_PASSWORD, config.ESKIZ_TOKEN].filter(Boolean).reduce((v, secret) => v.replaceAll(secret, '[private]'), text).slice(0, 250);
            const clean = (v: any, key = ''): any => /token|password|secret|email|phone/i.test(key) ? '[private]' : typeof v === 'string' ? hide(v).replace(/eyJ[\w.-]{20,}/g, '[token]') : Array.isArray(v) ? v.slice(0, 5).map(x => clean(x)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).slice(0, 10).map(([k, x]) => [k, clean(x, k)])) : v;
            state.template_registration_reason = clean(error);
          }
          if (r.ok) matching = (await templates()).filter((t: any) => t.original_text === sample);
        }
        state.otp_templates = matching.map((t: any) => ({ id: t.id, status: t.status }));
        state.otp_template_approved = matching.some((t: any) => t.status === 'service');
      }
    } catch { report.eskiz = { authenticated: false, error_code: 'NETWORK_ERROR', sms_sent: false }; }
  } else report.eskiz = { configured: false, sms_sent: false };
  console.log(JSON.stringify(report, null, 2));
}
void main().catch(() => { console.error('Provider configuration could not be loaded.'); process.exitCode = 1; });

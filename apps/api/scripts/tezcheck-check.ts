import { loadConfig } from '../src/common/config';
import { TezcheckClient, TezcheckError } from '../src/payments/tezcheck.client';

async function main() {
  const config = loadConfig(), client = new TezcheckClient(config);
  const me = await client.request('/me', undefined, { method: 'GET' });
  const desks = await client.desks();
  const selected = config.TEZCHECK_CASH_DESK_CODE ? desks.find(d => d.code === config.TEZCHECK_CASH_DESK_CODE) : desks.length === 1 ? desks[0] : undefined;
  const report: Record<string, unknown> = { checked_at: new Date().toISOString(), authenticated: true, signed: me.data?.api_client?.request_signed === true, desk_count: desks.length, selected: Boolean(selected), state: selected?.state, accepts_payments: selected?.accepts_payments ?? false, currency: selected?.currency };
  if (selected) {
    const methods = await client.request('/payment-methods', {}, { desk: selected.code });
    const transactions = await client.request('/transactions', { limit: 1 }, { desk: selected.code });
    await client.request('/balance', {}, { desk: selected.code });
    report.methods = Array.isArray(methods.data) ? methods.data.map((m: any) => ({ provider: m.provider_code, name: m.name })) : [];
    report.transaction_sample_count = Array.isArray(transactions.data) ? transactions.data.length : null;
    report.balance_endpoint = 'ok';
  }
  // Never emit credentials, cash-desk codes, payer URLs or customer transactions.
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(JSON.stringify({ error: error instanceof TezcheckError ? error.code : 'configuration_or_response_invalid' })); process.exitCode = 1; });

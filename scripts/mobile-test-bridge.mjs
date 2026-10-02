import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomBytes,randomInt} from 'node:crypto';
import {resolve} from 'node:path';
import {config} from 'dotenv';
config({path:resolve('apps/api/.env'),quiet:true});
if(process.env.NODE_ENV==='production'||process.env.SMS_ADAPTER!=='local'||process.env.PAYMENT_MODE!=='local'||new URL(process.env.DATABASE_URL).pathname!=='/sihhat')throw new Error('Test bridge faqat local demo muhitga ruxsat etilgan.');
const access=JSON.parse(await readFile('.local/dev-access.json','utf8'));
const fixture={key:randomBytes(32).toString('hex'),phone:`+99897${randomInt(1000000,9999999)}`,sanatorium_id:access.sanatoriums[0].id,sanatorium_name:access.sanatoriums[0].name};
const recovery = {phase: 'prepare', events: [], booking_id: null, reference: null, user_id: null};
async function body(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 16_384) throw new Error('Test so‘rovi juda katta.');
  }
  return JSON.parse(data);
}
const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers['x-test-key'] !== fixture.key) {
    res.writeHead(403);
    return res.end('{}');
  }
  const send = value => res.end(JSON.stringify(value));
  try {
    if (req.method === 'GET' && req.url === '/fixture') {
      return send({phone: fixture.phone, sanatorium_id: fixture.sanatorium_id, sanatorium_name: fixture.sanatorium_name});
    }
    const otp = /^\/otp\/([a-f0-9-]{36})$/.exec(req.url ?? '');
    if (req.method === 'GET' && otp) {
      const sms = JSON.parse(await readFile(resolve('.local/dev-sms', otp[1] + '.json'), 'utf8'));
      if (sms.phone !== fixture.phone || new Date(sms.expiresAt) <= new Date()) throw new Error('OTP yaroqsiz.');
      return send({code: sms.code});
    }
    if (req.method === 'GET' && req.url === '/recovery') return send(recovery);
    if (req.method === 'POST' && req.url === '/recovery/phase') {
      const input = await body(req);
      if (!['restore_payment', 'restore_confirmed'].includes(input.phase)) throw new Error('Test bosqichi noto‘g‘ri.');
      recovery.phase = input.phase;
      return send({ok: true});
    }
    if (req.method === 'POST' && req.url === '/recovery/report') {
      const input = await body(req);
      if (!['prepared', 'restored', 'confirmed', 'completed', 'failed'].includes(input.event)) throw new Error('Test hodisasi noto‘g‘ri.');
      const event = {event: input.event, at: new Date().toISOString()};
      // Retain public evidence only, never credentials or OTP.
      for (const key of ['booking_id', 'reference', 'user_id', 'status', 'payment_status', 'room_count',
        'session_restored', 'pending_restored', 'pending_cleared', 'return_did_not_confirm', 'booking_visible']) {
        if (input[key] !== undefined) event[key] = input[key];
      }
      if (input.event === 'prepared') {
        recovery.booking_id = event.booking_id;
        recovery.reference = event.reference;
        recovery.user_id = event.user_id;
      }
      recovery.events.push(event);
      return send({ok: true});
    }
    if (req.method === 'POST' && req.url === '/recovery/provider-start') {
      const input = await body(req), amount = Number(input.amount);
      if (!/^[a-f0-9-]{36}$/.test(input.order_id) || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Test buyurtmasi noto‘g‘ri.');
      const response = await fetch('http://127.0.0.1:4000/payments/payme', {
        method: 'POST', signal: AbortSignal.timeout(20_000),
        headers: {'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`Paycom:${process.env.AUTH_SECRET}`).toString('base64')}`},
        body: JSON.stringify({id: 'android-recovery', method: 'CreateTransaction', params: {
          id: `local_${input.order_id}`, time: Date.now(), amount, account: {order_id: input.order_id},
        }}),
      });
      const result = await response.json();
      if (!response.ok || result.error || result.result?.state !== 1) throw new Error('Mahalliy provider-start bajarilmadi.');
      return send({state: 1});
    }
    res.writeHead(404);
    send({});
  } catch {
    res.writeHead(400);
    send({error: 'Mahalliy test so‘rovi bajarilmadi.'});
  }
});
await new Promise((resolveReady, reject) => {
  server.once('error', reject);
  server.listen(4001, '127.0.0.1', resolveReady);
});
await mkdir('.local',{recursive:true});await writeFile('.local/mobile-test.json',JSON.stringify(fixture),{mode:0o600});
console.log('Mahalliy Android test bridge: 127.0.0.1:4001 (maxfiy test kaliti faylda, kodlar loglanmaydi).');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));

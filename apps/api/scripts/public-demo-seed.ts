import { createApp } from '../src/app';
import { Db } from '../src/common/db';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const { app, config } = await createApp({ quiet: true, swagger: false });
  try {
    if (!config.PUBLIC_DEMO_ENABLED) throw new Error('Seed requires the isolated public demo configuration');
    const db = app.get(Db);
    const name = 'Sihhat — Demo sanatoriya';
    if (await db.sanatorium.findFirst({ where: { name } })) return;
    const actorId = randomUUID(), id = randomUUID(), revisionId = randomUUID();
    const photos = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const image = await readFile(resolve('../../apps/partner-web/public/branding/sihhat-logo.jpg'));
    await mkdir(resolve(config.STORAGE_PATH, id), { recursive: true, mode: 0o700 });
    for (const photo of photos) await writeFile(resolve(config.STORAGE_PATH, id, photo), image, { mode: 0o600 });
    await db.atomic(async tx => {
      // This internal seed actor has no login/password and can never sign in.
      await tx.user.create({ data: { id: actorId, kind: 'SUPERADMIN', status: 'BLOCKED', name: 'Demo tizimi' } });
      await tx.sanatorium.create({ data: { id, name, featuredOnHome: true } });
      await tx.sanatoriumRevision.create({ data: { id: revisionId, sanatoriumId: id, createdBy: actorId,
        status: 'APPROVED', approvedAt: new Date(), data: { name,
          description: 'Faqat ilova namoyishi uchun sinov ma’lumotlari. Haqiqiy sanatoriya taklifi yoki bron emas.',
          legal_name: 'Demo', stir: '000000000', region: 'Toshkent', address: 'Demo manzil',
          contact_phone: '+998000000000', latitude: 41.3, longitude: 69.2,
          check_in_time: '14:00', check_out_time: '12:00', amenities: ['Wi-Fi'], services: ['Demo namoyish'],
          meals: 'Demo', child_rules: 'Sinov ma’lumotlari', medical_requirements: 'Demo', directions: 'Demo',
          required_documents: 'Demo', photo_ids: photos, document_ids: [], terms_accepted: true,
        } } });
      for (const photo of photos) await tx.mediaAsset.create({ data: { id: photo, sanatoriumId: id,
        revisionId, key: `${id}/${photo}`, uploadedBy: actorId, mime: 'image/jpeg', size: image.length, visibility: 'PUBLIC' } });
      await tx.sanatorium.update({ where: { id }, data: { publicRevisionId: revisionId } });
      const policy = await tx.refundPolicy.create({ data: { name: 'Demo', kind: 'FULL_BEFORE_CUTOFF', cutoffHours: 24 } });
      const roomType = await tx.roomType.create({ data: { sanatoriumId: id, name: 'Demo xona', maxGuests: 2, maxAdults: 2, maxChildren: 0 } });
      await tx.room.create({ data: { sanatoriumId: id, roomTypeId: roomType.id, code: 'DEMO-1' } });
      await tx.ratePlan.create({ data: { sanatoriumId: id, roomTypeId: roomType.id, name: 'Demo tarif', mode: 'ROOM', baseAmount: 45000000n, policyId: policy.id } });
    });
    console.log(JSON.stringify({ demo_catalog_created: true, real_payments_enabled: false }));
  } finally { await app.close(); }
}
main().catch(() => { console.error('Isolated demo seed failed; private configuration was not logged.'); process.exitCode = 1; });

import { createApp } from '../src/app';
import { Db } from '../src/common/db';
import { HomeService } from '../src/catalog/home.service';
import type { Actor } from '../src/auth/permissions';

async function main() {
  const { app, config } = await createApp({ quiet: true, swagger: false });
  try {
    const url = new URL(config.DATABASE_URL);
    if (config.NODE_ENV === 'production' || url.hostname !== '127.0.0.1' || url.pathname !== '/sihhat') throw new Error('Local preview only');
    const db = app.get(Db);
    const admin = await db.user.findFirst({ where: { kind: 'SUPERADMIN' }, select: { id: true } });
    if (!admin) throw new Error('Local admin required');
    const title = 'Sanatoriyalarni bir joyda solishtiring';
    if (!await db.publicArticle.findFirst({ where: { title, createdBy: admin.id } })) {
      const actor: Actor = { id: admin.id, kind: 'SUPERADMIN', name: 'Local preview', sessionId: 'local-preview', mustChangePassword: false, memberships: [] };
      await app.get(HomeService).create(actor, { title, kind: 'NEWS', status: 'PUBLISHED', summary: 'Sihhat.uz ilovasida uchta sanatoriyaning sharoitlari, xizmatlari va tariflarini solishtirishingiz mumkin.', body: 'Bosh sahifadan sizga qiziq bo‘lgan sanatoriyalarni tanlang va “Solishtirishga qo‘shish” belgisini bosing. Uchtagacha variantni solishtirish mumkin. Keyin yoqqan sanatoriyangizning xizmatlari va boshlang‘ich tarifini ko‘ring.\n\nYakuniy narx va mavjud xonalar bron hisobida sanalar va mehmonlar soniga qarab tekshiriladi. Yoqqan variantlarni Saqlangan bo‘limiga qo‘shishingiz mumkin.' });
    }
    const home = await app.get(HomeService).home();
    console.log(JSON.stringify({ sanatoriums: home.sanatorium_count, regions: home.regions.length, news: home.news.length, tips: home.tips.length }));
  } finally { await app.close(); }
}
void main().catch(() => { console.error('Local home preview could not be prepared.'); process.exitCode = 1; });

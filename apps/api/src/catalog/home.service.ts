import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db, audit } from '../common/db';
import { parse, fail, pageQuery, paged, uuid } from '../common/errors';
import { type Actor, requirePlatform } from '../auth/permissions';
import { CatalogService } from './catalog.service';
import { publicGuidance } from './guidance';

export const articleInput = z.object({
  title: z.string().trim().min(3).max(160), summary: z.string().trim().min(10).max(500),
  body: z.string().trim().min(20).max(12000), kind: z.enum(['NEWS', 'TIP']).default('NEWS'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
}).strict();
export const articleUpdate = articleInput.extend({ version: z.number().int().positive() });
const publicArticle = (a: any) => ({ id: a.id, title: a.title, summary: a.summary, body: a.body, kind: a.kind, published_at: a.publishedAt });

@Injectable()
export class HomeService {
  constructor(@Inject(Db) readonly db: Db, @Inject(CatalogService) readonly catalog: CatalogService) {}
  async home() {
    const [list, news, tips] = await Promise.all([
      this.catalog.list({ limit: 100, sort: 'PRICE' }),
      this.db.publicArticle.findMany({ where: { kind: 'NEWS', status: 'PUBLISHED', publishedAt: { lte: new Date() } }, orderBy: { publishedAt: 'desc' }, take: 4 }),
      this.db.publicArticle.findMany({ where: { kind: 'TIP', status: 'PUBLISHED', publishedAt: { lte: new Date() } }, orderBy: { publishedAt: 'desc' }, take: 2 }),
    ]);
    const regions = [...new Set(list.data.map((s: any) => s.region as string))].sort();
    return {
      generated_at: new Date().toISOString(), sanatorium_count: list.total,
      featured: list.data.slice(0, 6), regions,
      news: news.map(publicArticle),
      tips: [...tips.map(publicArticle), ...publicGuidance().map(f => ({ id: f.id, title: f.title, summary: f.text, body: f.text, kind: 'TIP', published_at: null }))],
    };
  }
  async article(id: string) {
    parse(uuid, id);
    const a = await this.db.publicArticle.findFirst({ where: { id, status: 'PUBLISHED', publishedAt: { lte: new Date() } } });
    if (!a) fail('NOT_FOUND', 'Yangilik topilmadi', 404);
    return publicArticle(a);
  }
  async list(actor: Actor, query: unknown) {
    requirePlatform(actor, 'catalog.manage'); const i = parse(pageQuery.strict(), query);
    const [data, total] = await Promise.all([this.db.publicArticle.findMany({ orderBy: { updatedAt: 'desc' }, skip: (i.page - 1) * i.limit, take: i.limit }), this.db.publicArticle.count()]);
    return paged(data, total, i.page, i.limit);
  }
  async create(actor: Actor, body: unknown) {
    requirePlatform(actor, 'catalog.manage'); const i = parse(articleInput, body);
    return this.db.atomic(async tx => {
      const a = await tx.publicArticle.create({ data: { ...i, createdBy: actor.id, publishedAt: i.status === 'PUBLISHED' ? new Date() : null } });
      await audit(tx, actor.id, 'article.created', a.id, undefined, undefined, a); return a;
    });
  }
  async update(actor: Actor, id: string, body: unknown) {
    requirePlatform(actor, 'catalog.manage'); parse(uuid, id); const i = parse(articleUpdate, body);
    return this.db.atomic(async tx => {
      const before = await tx.publicArticle.findUnique({ where: { id } });
      if (!before) fail('NOT_FOUND', 'Yangilik topilmadi', 404);
      const changed = await tx.publicArticle.updateMany({ where: { id, version: i.version }, data: { title: i.title, summary: i.summary, body: i.body, kind: i.kind, status: i.status, publishedAt: i.status === 'PUBLISHED' ? before.publishedAt ?? new Date() : before.publishedAt, version: { increment: 1 } } });
      if (!changed.count) fail('VERSION_CONFLICT', 'Yangilik o‘zgargan. Sahifani yangilang.');
      const after = await tx.publicArticle.findUniqueOrThrow({ where: { id } });
      await audit(tx, actor.id, 'article.updated', id, undefined, before, after); return after;
    });
  }
}

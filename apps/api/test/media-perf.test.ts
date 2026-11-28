import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { MediaService, normalizeMediaWidth } from '../src/media/media.service';

test('normalizeMediaWidth clamps arbitrary widths into bounded cache buckets', () => {
  assert.equal(normalizeMediaWidth(undefined), null);
  assert.equal(normalizeMediaWidth(''), null);
  assert.equal(normalizeMediaWidth('32'), null);
  assert.equal(normalizeMediaWidth('320'), 480);
  assert.equal(normalizeMediaWidth('640'), 640);
  assert.equal(normalizeMediaWidth('700'), 960);
  assert.equal(normalizeMediaWidth('1280'), 1280);
  assert.equal(normalizeMediaWidth('4000'), 1600);
});

test('MediaService serves fast WebP thumbnails on ?w=640 while preserving original MIME without ?w=', async () => {
  const storageDir = mkdtempSync(join(tmpdir(), 'sihhat-media-perf-'));
  try {
    const sanId = '11111111-1111-4111-8111-111111111111';
    const assetId = '22222222-2222-4222-8222-222222222222';
    const key = 'test-photo.png';
    // Create a large 1800x1200 PNG (> 40 KB)
    const largePng = await sharp({
      create: {
        width: 1800,
        height: 1200,
        channels: 3,
        background: { r: 30, g: 80, b: 160 },
      },
    })
      .png({ compressionLevel: 1 })
      .toBuffer();
    writeFileSync(join(storageDir, key), largePng);

    const mockDb: any = {
      async $queryRaw() {
        return [
          {
            id: assetId,
            sanatoriumId: sanId,
            revisionId: '33333333-3333-4333-8333-333333333333',
            key,
            mime: 'image/png',
            visibility: 'PUBLIC',
            sanatoriumPublic: true,
          },
        ];
      },
    };
    const config: any = {
      STORAGE_ADAPTER: 'local',
      STORAGE_PATH: storageDir,
    };
    const service = new MediaService(mockDb, config, {} as any);

    // Without ?w= -> preserves original image/png for backward compatibility
    const orig = await service.fetch(assetId, undefined, 'WEB', undefined);
    assert.equal(orig.mime, 'image/png');
    assert.equal(orig.bytes?.length, largePng.length);
    assert.equal(orig.sanatoriumPublic, true);

    // With ?w=640 -> converts to compact image/webp thumbnail + ETag
    const thumb = await service.fetch(assetId, undefined, 'WEB', '640');
    assert.equal(thumb.mime, 'image/webp');
    assert.equal(thumb.widthBucket, 640);
    assert.ok(thumb.bytes && thumb.bytes.length < largePng.length);
    assert.match(thumb.etag, /^W\/".+-w640-webp"$/);
    const meta = await sharp(thumb.bytes!).metadata();
    assert.equal(meta.width, 640);
  } finally {
    rmSync(storageDir, { recursive: true, force: true });
  }
});

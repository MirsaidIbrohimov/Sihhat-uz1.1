import { z } from 'zod';
import { uuid } from '../common/errors';

export const advertisementUrl = z.string().trim().max(2048).url().refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') && url.hostname.includes('.') &&
      !url.hostname.endsWith('.local') && !url.hostname.endsWith('.localhost') &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) && !url.hostname.includes(':');
  } catch { return false; }
}, 'Haqiqiy saytning HTTPS havolasini kiriting.');

export const adInput = z.object({
  sanatorium_id: uuid,
  title: z.string().trim().min(2).max(120),
  placement: z.enum(['HOME', 'POPUP']),
  starts_at: z.iso.datetime(),
  ends_at: z.iso.datetime(),
  image_asset_id: uuid,
  text: z.string().trim().max(500).default(''),
  target_kind: z.enum(['SANATORIUM', 'URL']).default('SANATORIUM'),
  target_sanatorium_id: uuid.optional(),
  target_url: advertisementUrl.optional(),
  has_discount: z.boolean().default(false),
  discount_percent: z.number().int().min(1).max(100).optional(),
  discount_text: z.string().trim().min(3).max(120).optional(),
}).strict().superRefine((value, ctx) => {
  if (Date.parse(value.ends_at) <= Date.parse(value.starts_at))
    ctx.addIssue({code:'custom',path:['ends_at'],message:'Tugash boshlanishdan keyin bo‘lsin.'});
  if (value.target_kind === 'URL' && !value.target_url)
    ctx.addIssue({code:'custom',path:['target_url'],message:'Reklama ochadigan havolani kiriting.'});
  if (value.target_kind === 'SANATORIUM' && value.target_url)
    ctx.addIssue({code:'custom',path:['target_url'],message:'Sanatoriya yoki havoladan bittasini tanlang.'});
  if (value.target_kind === 'URL' && value.target_sanatorium_id)
    ctx.addIssue({code:'custom',path:['target_sanatorium_id'],message:'Sanatoriya yoki havoladan bittasini tanlang.'});
  if (value.has_discount && !value.discount_percent && !value.discount_text)
    ctx.addIssue({code:'custom',path:['discount_text'],message:'Chegirma foizi yoki shartini kiriting.'});
  if (!value.has_discount && (value.discount_percent || value.discount_text))
    ctx.addIssue({code:'custom',path:['has_discount'],message:'Chegirma borligini belgilang.'});
});

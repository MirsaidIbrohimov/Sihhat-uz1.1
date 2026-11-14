export type AdminAlertTopic =
  | 'partner.password_reset_requested'
  | 'auth.bruteforce_alert'
  | 'payment.exception'
  | 'refund.requested'
  | 'provider.sms.failed'
  | 'system.health.issue'
  | 'sanatorium.submitted'
  | 'staff.invited'
  | 'ad.requested'
  | 'support.opened'
  | 'bank.change_requested';

const ADMIN_EMAIL_TOPIC_SET = new Set<string>([
  'partner.password_reset_requested',
  'auth.bruteforce_alert',
  'payment.exception',
  'refund.requested',
  'provider.sms.failed',
  'system.health.issue',
  'sanatorium.submitted',
  'staff.invited',
  'ad.requested',
  'support.opened',
  'bank.change_requested',
]);

export const AUTO_SUPERADMIN_TOPICS = new Set<string>([
  'payment.exception',
  'refund.requested',
  'provider.sms.failed',
  'system.health.issue',
  'partner.password_reset_requested',
  'auth.bruteforce_alert',
  'staff.invited',
  'sanatorium.submitted',
  'ad.requested',
  'bank.change_requested',
]);

export const URGENT_TELEGRAM_TOPICS = new Set<string>([
  'payment.exception',
  'system.health.issue',
  'provider.sms.failed',
  'support.opened',
  'support.replied',
  'partner.password_reset_requested',
  'auth.bruteforce_alert',
]);

export function isAdminEmailTopic(topic: string): boolean {
  return ADMIN_EMAIL_TOPIC_SET.has(topic);
}

export type FormattedAdminAlert = {
  severity: 'critical' | 'warning' | 'info';
  badge: string;
  subject: string;
  headline: string;
  summary: string;
  rows: Array<{ label: string; value: string }>;
  telegramText: string;
  siteSection?: string;
  siteLabel?: string;
};

const safeText = (v: unknown, max = 300): string => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

export function formatAdminAlert(topic: string, payload: Record<string, any> = {}): FormattedAdminAlert {
  const nowStr = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
  switch (topic) {
    case 'partner.password_reset_requested': {
      const login = safeText(payload.attempted_login || '—', 80);
      const userName = safeText(payload.user_name || (payload.user_found ? 'Xodim' : 'Bazadan topilmadi'), 120);
      const sanatoriumName = safeText(payload.sanatorium_name || '', 120);
      const phone = safeText(payload.contact_phone || payload.user_phone || 'Ko‘rsatilmagan', 40);
      const note = safeText(payload.note || 'Yo‘q', 300);
      const ip = safeText(payload.ip || 'Noma’lum', 80);
      const rows = [
        { label: 'Kiritilgan login', value: `@${login}` },
        { label: 'Hisob egasi', value: sanatoriumName ? `${userName} (${sanatoriumName})` : userName },
        { label: 'Aloqa telefoni', value: phone },
        { label: 'Izoh', value: note },
        { label: 'IP manzil', value: ip },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'warning',
        badge: 'PAROL TIKLASH SO‘ROVI',
        subject: `Sihhat.uz — Hamkor parolni tiklash so‘rovi (@${login})`,
        headline: 'Hamkor parolni tiklashni so‘radi',
        summary: `Hamkorlar panelining kirish sahifasida «Parolni unutdingizmi?» tugmasi bosildi. Xodim hisobini tekshirib, vaqtinchalik parol bering.`,
        rows,
        telegramText: `🔐 Hamkor parolini tiklash so‘rovi!\n\n${rows.map(r => `${r.label}: ${r.value}`).join('\n')}`,
        siteSection: 'staff',
        siteLabel: '🖥 Xodimlar bo‘limini ochish',
      };
    }

    case 'auth.bruteforce_alert': {
      const login = safeText(payload.attempted_login || '—', 80);
      const attempts = Number(payload.attempts || 5);
      const owner = safeText(
        payload.user_name ? `${payload.user_name}${payload.user_kind ? ` (${payload.user_kind})` : ''}` : 'Hisob bazada topilmadi',
        120,
      );
      const ip = safeText(payload.ip || 'Noma’lum', 80);
      const device = safeText(payload.device || 'Brauzer', 120);
      const rows = [
        { label: 'Kiritilgan login', value: `@${login}` },
        { label: 'Hisob egasi', value: owner },
        { label: 'Xato urinishlar', value: `${attempts} marta (so‘nggi 1 soat ichida)` },
        { label: 'IP manzil', value: ip },
        { label: 'Qurilma', value: device },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'critical',
        badge: 'XAVFSIZLIK OGOHLANTIRISHI',
        subject: `Sihhat.uz — 🚨 1 soatda ${attempts} marta xato parol bilan kirish urinishi (@${login})`,
        headline: 'Ko‘p martalik xato parol urinishi aniqlandi',
        summary: `So‘nggi 1 soat ichida «@${login}» hisobiga ${attempts} marta noto‘g‘ri parol bilan kirishga harakat qilindi. Audit jurnalini tekshiring.`,
        rows,
        telegramText: `🚨 Xavfsizlik ogohlantirishi: Xato parol urinishlari!\n\n${rows.map(r => `${r.label}: ${r.value}`).join('\n')}`,
        siteSection: 'audit',
        siteLabel: '🖥 Audit jurnalini ochish',
      };
    }

    case 'payment.exception': {
      const bookingId = safeText(payload.booking_id || '—', 80);
      const orderId = safeText(payload.order_id || '—', 80);
      const reason = safeText(payload.reason || 'To‘lov holatida tafovut', 200);
      const rows = [
        { label: 'Bron ID', value: bookingId },
        { label: 'To‘lov order ID', value: orderId },
        { label: 'Sabab', value: reason },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'critical',
        badge: 'TO‘LOV XATOLIGI',
        subject: 'Sihhat.uz — ⚠️ To‘lovda tekshiruv talab qilinadi',
        headline: 'To‘lov tranzaksiyasida muammo aniqlandi',
        summary: 'Mijoz to‘lovi bilan bog‘liq favqulodda holat (PAYMENT_EXCEPTION) yuz berdi. Zudlik bilan tekshiring.',
        rows,
        telegramText: `⚠️ To‘lovda favqulodda holat!\n\n${rows.map(r => `${r.label}: ${r.value}`).join('\n')}`,
        siteSection: 'payments',
        siteLabel: '🖥 To‘lovlarni ochish',
      };
    }

    case 'refund.requested': {
      const bookingId = safeText(payload.booking_id || '—', 80);
      const refundId = safeText(payload.refund_id || '—', 80);
      const rows = [
        { label: 'So‘rov ID', value: refundId },
        { label: 'Bron ID', value: bookingId },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'warning',
        badge: 'PUL QAYTARISH SO‘ROVI',
        subject: 'Sihhat.uz — 💸 Yangi pul qaytarish (refund) so‘rovi',
        headline: 'Yangi pul qaytarish so‘rovi kelib tushdi',
        summary: 'Mijoz yoki sanatoriya tomonidan pulni qaytarish bo‘yicha yangi so‘rov yuborildi.',
        rows,
        telegramText: `💸 Yangi pul qaytarish (refund) so‘rovi!\n\n${rows.map(r => `${r.label}: ${r.value}`).join('\n')}`,
        siteSection: 'refunds',
        siteLabel: '🖥 Qaytarishlarni ochish',
      };
    }

    case 'provider.sms.failed': {
      const rows = [{ label: 'Hodisa', value: 'SMS provayder orqali kod yuborilmadi' }, { label: 'Vaqt', value: nowStr }];
      return {
        severity: 'critical',
        badge: 'SMS XIZMATI XATOSI',
        subject: 'Sihhat.uz — ⚠️ SMS xizmatida uzilish yuz berdi',
        headline: 'SMS yuborish xizmatida xatolik',
        summary: 'SMS provayder (Eskiz/HTTP) tasdiqlash kodini yubora olmadi. Sozlamalar va balansni tekshiring.',
        rows,
        telegramText: `⚠️ SMS yuborish bajarilmadi! Xizmat sozlamalari va balansni tekshiring.\nVaqt: ${nowStr}`,
        siteSection: 'dashboard',
        siteLabel: '🖥 Panelni ochish',
      };
    }

    case 'system.health.issue': {
      const apiReady = payload.api_ready ? 'Tayyor' : 'Javob bermayapti';
      const pending = Number(payload.pending || 0);
      const workerReady = payload.worker_ready ? 'Faol' : 'Tekshirish kerak';
      const rows = [
        { label: 'API holati', value: apiReady },
        { label: 'Kechikkan outbox xabarlar', value: String(pending) },
        { label: 'Worker holati', value: workerReady },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'critical',
        badge: 'TIZIM MONITORINGI',
        subject: 'Sihhat.uz — 🚨 Server / Worker holati ogohlantirishi',
        headline: 'Tizim sog‘lig‘ida og‘ish aniqlandi',
        summary: 'Platforma monitoringi API, worker yoki navbatdagi xabarlarda kechikish aniqladi.',
        rows,
        telegramText: `⚠️ Tizim tekshiruvi!\n\n${rows.map(r => `${r.label}: ${r.value}`).join('\n')}`,
        siteSection: 'dashboard',
        siteLabel: '🖥 Panelni ochish',
      };
    }

    case 'sanatorium.submitted': {
      const revisionId = safeText(payload.revision_id || '—', 80);
      const rows = [
        { label: 'Anketa / Tahrir ID', value: revisionId },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'info',
        badge: 'MODERATSIYA',
        subject: 'Sihhat.uz — 🏥 Sanatoriya anketasi tekshiruvga yuborildi',
        headline: 'Sanatoriya anketasi moderatsiyaga keldi',
        summary: 'Hamkor sanatoriya profilini tekshirish va katalogga chiqarish uchun yubordi.',
        rows,
        telegramText: `📝 Sanatoriya anketasi tekshiruvga yuborildi.\nTahrir ID: ${revisionId}`,
        siteSection: 'moderations',
        siteLabel: '🖥 Moderatsiyani ochish',
      };
    }

    case 'staff.invited': {
      const membershipId = safeText(payload.membership_id || '—', 80);
      const rows = [
        { label: 'Taklif ID', value: membershipId },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'info',
        badge: 'XODIM TASDIQLASH',
        subject: 'Sihhat.uz — 👤 Yangi xodim / resepsion tasdiq kutmoqda',
        headline: 'Yangi xodim tasdiqlashni kutmoqda',
        summary: 'Sanatoriya direktori yangi xodim taklif qildi. Ish boshlashi uchun superadmin tasdig‘i zarur.',
        rows,
        telegramText: `📝 Yangi xodim (resepsion) tasdiqlashni kutmoqda.\nID: ${membershipId}`,
        siteSection: 'approvals',
        siteLabel: '🖥 Tasdiqlashlarni ochish',
      };
    }

    case 'ad.requested': {
      const title = safeText(payload.title || 'Yangi reklama', 120);
      const placement = payload.placement === 'POPUP' ? 'Qalqib chiquvchi (POPUP)' : 'Asosiy sahifada';
      const rows = [
        { label: 'Sarlavha', value: title },
        { label: 'Joylashuv', value: placement },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'info',
        badge: 'REKLAMA ARIZASI',
        subject: `Sihhat.uz — 📢 Yangi reklama arizasi: ${title}`,
        headline: 'Yangi reklama joylashtirish arizasi',
        summary: 'Hamkor sanatoriya yangi reklama kampaniyasi uchun ariza yubordi.',
        rows,
        telegramText: `📢 Yangi reklama arizasi!\nSarlavha: ${title}\nJoylashuv: ${placement}`,
        siteSection: 'billing',
        siteLabel: '🖥 E‘lonlarni saytda ko‘rish',
      };
    }

    case 'support.opened': {
      const ticketId = safeText(payload.ticket_id || '—', 80);
      const rows = [
        { label: 'Murojaat ID', value: ticketId },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'info',
        badge: 'YORDAM XIZMATI',
        subject: 'Sihhat.uz — 💬 Yordam xizmatiga yangi murojaat keldi',
        headline: 'Yangi qo‘llab-quvvatlash murojaati',
        summary: 'Foydalanuvchi yoki hamkor yordam xizmatiga yangi xabar qoldirdi.',
        rows,
        telegramText: `💬 Yangi murojaat keldi!\nID: ${ticketId}`,
        siteSection: 'support',
        siteLabel: '🖥 Murojaatlarni ochish',
      };
    }

    case 'bank.change_requested': {
      const revisionId = safeText(payload.revision_id || '—', 80);
      const sanatoriumName = safeText(payload.sanatorium_name || payload.sanatorium_id || 'Sanatoriya', 120);
      const rows = [
        { label: 'Sanatoriya', value: sanatoriumName },
        { label: 'Rekvizit arizasi ID', value: revisionId },
        { label: 'Vaqt', value: nowStr },
      ];
      return {
        severity: 'warning',
        badge: 'BANK REKVIZITI',
        subject: `Sihhat.uz — 🏦 Bank rekviziti o‘zgartirish so‘rovi (${sanatoriumName})`,
        headline: 'Sanatoriya bank rekvizitini yangiladi',
        summary: 'Hamkor bank hisobi ma’lumotlarini tasdiqlash uchun yubordi.',
        rows,
        telegramText: `🏦 Bank rekviziti o‘zgartirish so‘rovi!\n\n${rows.map(r => `${r.label}: ${r.value}`).join('\n')}`,
        siteSection: 'payouts',
        siteLabel: '🖥 Moliya va rekvizitlarni ochish',
      };
    }

    default: {
      return {
        severity: 'info',
        badge: 'PLATFORMA XABARI',
        subject: `Sihhat.uz — Muhim hodisa (${topic})`,
        headline: 'Platformadan muhim xabar',
        summary: `Tizimda «${topic}» hodisasi qayd etildi.`,
        rows: [{ label: 'Vaqt', value: nowStr }],
        telegramText: `🔔 Platforma xabari: ${topic}\nVaqt: ${nowStr}`,
        siteSection: 'notifications',
        siteLabel: '🖥 Bildirishnomalarni ochish',
      };
    }
  }
}

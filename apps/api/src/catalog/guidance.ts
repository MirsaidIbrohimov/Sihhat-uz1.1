// Product guidance uses actual booking behavior, never generated medical claims.
export const guidance = [
  { id: 'booking', title: 'Bronni qanday rasmiylashtiraman?', text: 'Sanatoriyani tanlang, kelish va ketish sanalarini, xona va mehmonlarni kiriting. Bron hisobini tekshirib, bekor qilish shartlariga rozilik bildiring. Bronlar bo‘limida to‘lov va tasdiqlash holatini kuzatishingiz mumkin.', keywords: /bron|band|buyurtma|booking|брони/i },
  { id: 'price', title: 'Boshlang‘ich va yakuniy narx', text: 'Kartadagi summa boshlang‘ich tarifdir. Yakuniy narx sanalar, xona, kattalar, bolalar yoshi va xizmat paketiga qarab bron hisobida aniqlanadi. To‘lashdan oldin shu hisobni tekshiring.', keywords: /narx|summa|pul|tarif|price|цена/i },
  { id: 'refund', title: 'Bekor qilish va pulni qaytarish', text: 'Har bir tarifning bekor qilish va pulni qaytarish shartlari bor. Ularni bronni tasdiqlashdan oldin ko‘ring. Mavjud bron bo‘yicha so‘rov va uning holati Bronlar bo‘limida ko‘rsatiladi.', keywords: /bekor|qaytar|refund|cancel|возврат/i },
  { id: 'documents', title: 'Safar oldidan tekshiring', text: 'Sanatoriya sahifasida kelish va ketish vaqti, ovqatlanish, bolalar qoidalari, manzil va talab qilinadigan hujjatlarni tekshiring. Maxsus talablarni sanatoriyaning o‘zi bilan aniqlashtiring.', keywords: /hujjat|manzil|ovqat|bola|kelish|document|документ/i },
  { id: 'payment', title: 'To‘lov holati qayerda ko‘rinadi?', text: 'To‘lov oynasidan qaytgach, bron holatini Bronlar bo‘limida yangilang. Bron faqat server to‘lovni tasdiqlaganida tasdiqlangan hisoblanadi. To‘lov hali kutilayotgan bo‘lsa, qayta to‘lashdan oldin holatni tekshiring.', keywords: /to‘lov|to'lov|tolov|payment|оплат/i },
];
export const publicGuidance = () => guidance.map(({ keywords, ...item }) => item);

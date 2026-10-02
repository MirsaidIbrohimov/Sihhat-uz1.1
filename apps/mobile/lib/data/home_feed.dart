import 'dart:convert';

import 'api.dart';

class HomeFeed {
  final Api api;
  HomeFeed(this.api);
  String get cacheKey => 'public_home_${Uri.encodeComponent(api.baseUrl)}';
  Future<Json?> cached() async {
    try {
      final raw = await api.store.read(cacheKey);
      if (raw == null) return null;
      final value = asJson(jsonDecode(raw));
      final date = DateTime.tryParse(value['generated_at'] ?? '');
      if (date == null ||
          DateTime.now().difference(date) > const Duration(days: 7)) {
        return null;
      }
      return value;
    } catch (_) {
      return null;
    }
  }

  Future<Json> refresh() async {
    final value = asJson(await api.send('/catalog/home'));
    if (value['featured'] is! List ||
        value['regions'] is! List ||
        value['news'] is! List) {
      throw const ApiException(
        'INVALID_RESPONSE',
        'Bosh sahifa ma’lumotlari to‘liq emas.',
      );
    }
    try {
      await api.store.write(cacheKey, jsonEncode(value));
    } catch (_) {
      /* Public data remains usable without cache. */
    }
    return value;
  }
}

const homeTips = [
  {
    'id': 'price',
    'title': 'Narxni oldindan tekshiring',
    'summary': 'Boshlang‘ich tarif kartada ko‘rsatiladi. Sanalar, xona va mehmonlarni tanlagach, yakuniy bron hisobini ko‘ring.',
  },
  {
    'id': 'documents',
    'title': 'Safarga tayyorlaning',
    'summary': 'Kelish va ketish vaqti, ovqatlanish va kerakli hujjatlarni sanatoriya sahifasidan tekshiring.',
  },
  {
    'id': 'refund',
    'title': 'Bron shartlari bilan tanishing',
    'summary': 'Bekor qilish va pulni qaytarish shartlari tarifga bog‘liq. Ularni to‘lovdan oldin o‘qing.',
  },
];

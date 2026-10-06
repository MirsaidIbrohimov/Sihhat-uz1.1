import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/advertisements.dart';
import 'package:sihhat_mobile/screens/catalog.dart';

import 'api_test.dart' show MemoryStore;
import 'home_test.dart' show home, jsonResponse, item;

final popup = <String, dynamic>{
  'id': 'popup',
  'placement': 'POPUP',
  'title': 'Kirish uchun maxsus taklif',
  'sanatorium_id': 'owner',
  'target': {'kind': 'SANATORIUM', 'sanatorium_id': 'destination'},
  'has_discount': true,
  'discount_percent': 20,
  'discount_text': 'Faqat ish kunlari',
};
Json detail() => {
  'id': 'destination',
  'name': 'Reklamadagi sanatoriya',
  'region': 'Toshkent',
  'address': 'Yangi manzil',
  'description': 'Sanatoriya haqida ma’lumot',
  'amenities': <String>[],
  'services': <String>[],
  'photo_ids': <String>[],
  'rate_plans': <Json>[],
  'meals': 'Uch mahal',
  'child_rules': 'Bolalar uchun',
  'medical_requirements': 'Aniqlang',
  'required_documents': 'Pasport',
  'check_in_time': '14:00',
  'check_out_time': '12:00',
  'map_url': 'https://www.google.com/maps/search/?api=1&query=41.3,69.2',
};
Api testApi(List<Json> ads, List<String> events) => Api(
  baseUrl: 'http://localhost',
  store: MemoryStore(),
  client: MockClient((r) async {
    if (r.url.path == '/catalog/ads') return jsonResponse(ads);
    if (r.url.path == '/catalog/home') return jsonResponse(home());
    if (r.url.path == '/catalog/sanatoriums/destination') {
      return jsonResponse(detail());
    }
    if (r.url.path == '/catalog/sanatoriums') {
      return jsonResponse({
        'data': [item],
        'total': 1,
        'pages': 1,
      });
    }
    if (r.url.path.endsWith('/events')) events.add(jsonDecode(r.body)['kind']);
    return jsonResponse({'success': true});
  }),
)..accessToken = 'local-test-token';

void main() {
  test('advertisements accept HTTPS destinations and preserve sanatorium targeting', () {
    expect(
      advertisementLink({
        'target': {'kind': 'URL', 'url': 'https://example.com/taklif?q=1'},
      })?.host,
      'example.com',
    );
    expect(advertisementLink(popup), isNull);
    for (final url in [
      'javascript:alert(1)',
      'http://example.com',
      'https://user:pass@example.com',
      'https://localhost',
    ]) {
      expect(
        advertisementLink({
          'target': {'kind': 'URL', 'url': url},
        }),
        isNull,
      );
    }
  });
  testWidgets(
    'entrance popup shows discount and can be closed; changing tabs never repeats it',
    (tester) async {
      final events = <String>[], api = testApi([popup], events);
      await tester.pumpWidget(MaterialApp(home: Home(api)));
      await tester.pumpAndSettle();
      expect(find.byType(Dialog), findsOneWidget);
      expect(find.text('20% chegirma'), findsOneWidget);
      expect(find.text('Faqat ish kunlari'), findsOneWidget);
      await tester.tap(find.byTooltip('Reklamani yopish'));
      await tester.pumpAndSettle();
      expect(find.byType(Dialog), findsNothing);
      expect(events.where((e) => e == 'IMPRESSION').length, 1);
      expect(events.contains('CLICK'), isFalse);
      await tester.tap(find.text('Sanatoriyalar'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Bosh sahifa'));
      await tester.pumpAndSettle();
      expect(find.byType(Dialog), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
  testWidgets(
    'popup opens its selected sanatorium and records a single click',
    (tester) async {
      final events = <String>[], api = testApi([popup], events);
      await tester.pumpWidget(MaterialApp(home: Home(api)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Taklifni ko‘rish'));
      await tester.pumpAndSettle();
      expect(find.byType(Dialog), findsNothing);
      expect(find.byType(SanatoriumScreen), findsOneWidget);
      expect(find.text('Reklamadagi sanatoriya'), findsOneWidget);
      expect(events.where((e) => e == 'CLICK').length, 1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
  testWidgets('a home advertisement never becomes an entrance popup', (
    tester,
  ) async {
    final api = testApi([
      {...popup, 'placement': 'HOME'},
    ], []);
    await tester.pumpWidget(MaterialApp(home: Home(api)));
    await tester.pumpAndSettle();
    expect(find.byType(Dialog), findsNothing);
    await tester.scrollUntilVisible(
      find.text('Kirish uchun maxsus taklif'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Kirish uchun maxsus taklif'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    api.client.close();
  });
}

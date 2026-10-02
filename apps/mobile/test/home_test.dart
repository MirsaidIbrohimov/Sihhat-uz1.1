import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/data/home_feed.dart';
import 'package:sihhat_mobile/screens/catalog.dart';
import 'package:sihhat_mobile/screens/home_info.dart';

import 'api_test.dart' show MemoryStore;

http.Response jsonResponse(Object body) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

final item = <String, dynamic>{
  'id': 'sanatorium',
  'name': 'Tog‘ dam olish maskani',
  'region': 'Toshkent',
  'amenities': ['Wi-Fi'],
  'from_amount': '45000000',
};
Json home() => {
  'generated_at': DateTime.now().toUtc().toIso8601String(),
  'sanatorium_count': 1,
  'featured': [item],
  'regions': ['Toshkent'],
  'news': [
    {
      'id': 'news',
      'title': 'Sanatoriyalarni solishtiring',
      'summary': 'Uchta variantning xizmatlarini solishtiring.',
      'published_at': DateTime.now().toUtc().toIso8601String(),
    },
  ],
  'tips': homeTips,
};

void main() {
  test('fresh public feed is fetched and cached for this server', () async {
    final api = Api(
      baseUrl: 'http://localhost',
      store: MemoryStore(),
      client: MockClient((request) async {
        expect(request.url.path, '/catalog/home');
        return jsonResponse(home());
      }),
    );
    final feed = HomeFeed(api);
    final data = await feed.refresh();
    expect(data['sanatorium_count'], 1);
    expect((await feed.cached())?['news'], data['news']);
    api.client.close();
  });

  testWidgets(
    'public home appears before slow saved-session validation completes',
    (tester) async {
      final store = MemoryStore();
      await store.write('access', 'saved-token');
      await store.write('refresh', 'saved-refresh');
      final auth = Completer<http.Response>();
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((r) async {
          if (r.url.path == '/auth/me') return auth.future;
          if (r.url.path == '/catalog/home') {
            return jsonResponse(home());
          }
          return jsonResponse({
            'data': [if (r.url.path == '/catalog/sanatoriums') item],
            'pages': 1,
          });
        }),
      );
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      expect(auth.isCompleted, false);
      expect(
        tester.widget<HomeHighlights>(find.byType(HomeHighlights)).data,
        isNotNull,
      );
      expect(
        find.text('Sog‘lom dam olish shu yerdan boshlanadi.'),
        findsOneWidget,
      );
      expect(find.text('1 ta'), findsNWidgets(2));
      expect(find.text('SMS kodini kiriting'), findsNothing);
      expect(tester.takeException(), isNull);
      auth.complete(http.Response('{"id":"customer"}', 200));
      await tester.pumpAndSettle();
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'cached public home remains visible offline; cache is scoped to the API host',
    (tester) async {
      final store = MemoryStore();
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((_) async => throw http.ClientException('offline')),
      );
      final feed = HomeFeed(api);
      await store.write(feed.cacheKey, jsonEncode(home()));
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: CatalogScreen(api))),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Saqlangan ma’lumot'), findsOneWidget);
      expect(find.textContaining('Katalog yangilanmadi'), findsOneWidget);
      expect(find.text('Tog‘ dam olish maskani'), findsOneWidget);
      expect(tester.takeException(), isNull);
      final other = Api(baseUrl: 'http://other-server', store: store);
      expect(await HomeFeed(other).cached(), isNull);
      other.client.close();
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'region chips apply an API filter and news is readable without sign-in',
    (tester) async {
      final paths = <String>[];
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((r) async {
          paths.add(r.url.toString());
          if (r.url.path == '/catalog/home') {
            return jsonResponse(home());
          }
          if (r.url.path == '/catalog/news/news') {
            return jsonResponse({
              'title': 'Sanatoriyalarni solishtiring',
              'body': 'Yashash, ovqatlanish va sharoitlarni bir joyda solishtiring.',
              'published_at': DateTime.now().toUtc().toIso8601String(),
            });
          }
          return jsonResponse({
            'data': [if (r.url.path == '/catalog/sanatoriums') item],
            'pages': 1,
          });
        }),
      );
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: CatalogScreen(api))),
      );
      await tester.pumpAndSettle();
      final chip = find.widgetWithText(ChoiceChip, 'Toshkent');
      await tester.ensureVisible(chip);
      await tester.tap(chip);
      await tester.pumpAndSettle();
      expect(
        paths.any((p) => Uri.parse(p).queryParameters['region'] == 'Toshkent'),
        true,
      );
      final news = find.text('Sanatoriyalarni solishtiring').hitTestable();
      await tester.scrollUntilVisible(
        news,
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(news);
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Yashash, ovqatlanish va sharoitlarni bir joyda solishtiring.',
        ),
        findsOneWidget,
      );
      expect(api.signedIn, false);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

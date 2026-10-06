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
import 'package:sihhat_mobile/screens/home.dart';

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
      'title': 'Safaringizni rejalashtiring',
      'summary': 'Kelish shartlarini oldindan tekshiring.',
      'published_at': DateTime.now().toUtc().toIso8601String(),
    },
  ],
  'tips': homeTips,
};

void main() {
  testWidgets(
    'home shows featured sanatoriums and only HOME advertisements, then refreshes them',
    (tester) async {
      final paths = <String>[];
      var ads = <Json>[
        {
          'id': 'one',
          'sanatorium_id': 'sanatorium',
          'placement': 'HOME',
          'title': 'Birinchi reklama',
        },
        {
          'id': 'two',
          'sanatorium_id': 'sanatorium',
          'placement': 'HOME',
          'title': 'Ikkinchi reklama',
        },
        {
          'id': 'search',
          'sanatorium_id': 'sanatorium',
          'placement': 'SEARCH',
          'title': 'Qidiruv reklamasi',
        },
      ];
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((r) async {
          paths.add(r.url.path);
          if (r.url.path == '/catalog/ads') return jsonResponse(ads);
          if (r.url.path == '/catalog/home') return jsonResponse(home());
          return jsonResponse({'success': true});
        }),
      );
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: HomeScreen(api))),
      );
      await tester.pumpAndSettle();
      expect(find.text(item['name']), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Birinchi reklama'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Birinchi reklama'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Ikkinchi reklama'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Ikkinchi reklama'), findsOneWidget);
      expect(find.text('Qidiruv reklamasi'), findsNothing);
      expect(paths.contains('/catalog/sanatoriums'), false);
      ads = [
        {
          'id': 'new',
          'sanatorium_id': 'sanatorium',
          'placement': 'HOME',
          'title': 'Yangi reklama',
        },
      ];
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Yangi reklama'),
        -200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Yangi reklama'), findsOneWidget);
      expect(find.text('Birinchi reklama'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'sanatorium section lists all catalog entries and searches without save or compare controls',
    (tester) async {
      final queries = <Map<String, String>>[];
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((r) async {
          queries.add(r.url.queryParameters);
          return jsonResponse({
            'data': [
              item,
              {...item, 'id': 'second', 'name': 'Ikkinchi sanatoriya'},
            ],
            'total': 2,
            'pages': 1,
          });
        }),
      );
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: CatalogScreen(api))),
      );
      await tester.pumpAndSettle();
      expect(find.text(item['name']), findsOneWidget);
      expect(find.text('Ikkinchi sanatoriya'), findsOneWidget);
      expect(find.text('Solishtirish'), findsNothing);
      expect(find.byIcon(Icons.favorite_border), findsNothing);
      expect(find.byType(Checkbox), findsNothing);
      await tester.enterText(find.byType(TextField).first, 'Toshkent');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      // The full catalogue is downloaded; subsequent searches run offline.
      expect(queries.last['q'], isNull);
      expect(find.text(item['name']), findsOneWidget);
      expect(queries.first['limit'], '100');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'an empty, loading, expired or failed advertisement leaves no gap',
    (tester) async {
      tester.view.physicalSize = const Size(420, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final first = Completer<http.Response>();
      var requests = 0, fail = false;
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((r) async {
          if (r.url.path == '/catalog/home') {
            return jsonResponse({...home(), 'featured': <Json>[]});
          }
          if (r.url.path == '/catalog/ads') {
            requests++;
            if (requests == 1) return first.future;
            if (fail) throw http.ClientException('offline');
            return jsonResponse(<Json>[]);
          }
          return jsonResponse({'success': true});
        }),
      );
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: HomeScreen(api))),
      );
      await tester.pumpAndSettle();
      final service = find.text('Tezkor xizmatlar');
      final position = tester.getTopLeft(service);
      expect(find.byKey(const ValueKey('home-advertisements')), findsNothing);
      expect(find.text('Yangi takliflar shu yerda chiqadi.'), findsNothing);
      first.complete(
        jsonResponse([
          {'id': 'active', 'placement': 'HOME', 'title': 'Faol reklama'},
        ]),
      );
      await tester.pumpAndSettle();
      expect(find.text('Faol reklama'), findsOneWidget);
      expect(tester.getTopLeft(service).dy, greaterThan(position.dy));
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('home-advertisements')), findsNothing);
      expect(tester.getTopLeft(service), position);
      fail = true;
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('home-advertisements')), findsNothing);
      expect(tester.getTopLeft(service), position);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'masthead search preserves its query and home shortcuts open working sections',
    (tester) async {
      final queries = <Map<String, String>>[];
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore()
          ..data.addAll({'access': 'saved-access', 'refresh': 'saved-refresh'}),
        client: MockClient((r) async {
          if (r.url.path == '/catalog/home') return jsonResponse(home());
          if (r.url.path == '/catalog/ads') return jsonResponse(<Json>[]);
          if (r.url.path == '/catalog/sanatoriums') {
            queries.add(r.url.queryParameters);
            return jsonResponse({
              'data': [item],
              'pages': 1,
              'total': 1,
            });
          }
          return jsonResponse({'data': <Json>[], 'pages': 1, 'total': 0});
        }),
      );
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Toshkent');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(queries.last['q'], isNull);
      expect(find.text(item['name']), findsOneWidget);
      expect(find.byType(CatalogScreen), findsOneWidget);
      await tester.tap(find.text('Bosh sahifa'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Hudud va\nsharoitlar'));
      await tester.pumpAndSettle();
      expect(find.text('Natijalarni ko‘rish'), findsOneWidget);
      Navigator.of(tester.element(find.text('Natijalarni ko‘rish'))).pop();
      await tester.pumpAndSettle();
      Navigator.of(tester.element(find.byType(CatalogScreen))).pop();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Bronlarim'));
      await tester.pumpAndSettle();
      expect(find.text('Hozircha bronlaringiz yo‘q.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  test('fresh public feed is cached only for its server', () async {
    final store = MemoryStore(),
        api = Api(
          baseUrl: 'http://localhost',
          store: store,
          client: MockClient((_) async => jsonResponse(home())),
        );
    final feed = HomeFeed(api), data = await feed.refresh();
    expect((await feed.cached())?['news'], data['news']);
    final other = Api(baseUrl: 'http://other-server', store: store);
    expect(await HomeFeed(other).cached(), isNull);
    other.client.close();
    api.client.close();
  });

  testWidgets(
    'home waits for session validation and replaces saved tab with Sanatoriyalar',
    (tester) async {
      final store = MemoryStore()
            ..data.addAll({
              'access': 'saved-token',
              'refresh': 'saved-refresh',
            }),
          auth = Completer<http.Response>();
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((r) async {
          if (r.url.path == '/auth/me') return auth.future;
          if (r.url.path == '/catalog/home') return jsonResponse(home());
          return jsonResponse({
            'data': [if (r.url.path == '/catalog/sanatoriums') item],
            'total': 1,
            'pages': 1,
          });
        }),
      );
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pump();
      expect(find.byType(NavigationBar), findsNothing);
      auth.complete(jsonResponse({'id': 'customer'}));
      await tester.pumpAndSettle();
      expect(find.byType(HomeScreen), findsOneWidget);
      expect(find.text('Saqlanganlar'), findsNothing);
      await tester.tap(find.text('Sanatoriyalar'));
      await tester.pumpAndSettle();
      expect(find.byType(CatalogScreen), findsOneWidget);
      expect(find.text(item['name']), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'offline home retains public content but never shows an ad placeholder',
    (tester) async {
      final store = MemoryStore(),
          api = Api(
            baseUrl: 'http://localhost',
            store: store,
            client: MockClient(
              (_) async => throw http.ClientException('offline'),
            ),
          );
      // This cache belongs to the same API instance; other hosts must never use it.
      await api.store.write(HomeFeed(api).cacheKey, jsonEncode(home()));
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: HomeScreen(api))),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Saqlangan ma’lumot. Narx va mavjudlik bron hisobida yangilanadi.',
        ),
        findsOneWidget,
      );
      expect(find.text(item['name']), findsOneWidget);
      expect(find.byKey(const ValueKey('home-advertisements')), findsNothing);
      await tester.scrollUntilVisible(
        find.text('Safaringizni rejalashtiring'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Safaringizni rejalashtiring'), findsOneWidget);
      final other = Api(baseUrl: 'http://other-server', store: store);
      expect(await HomeFeed(other).cached(), isNull);
      other.client.close();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

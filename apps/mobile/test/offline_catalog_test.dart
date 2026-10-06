import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/data/catalog_cache.dart';
import 'package:sihhat_mobile/data/home_feed.dart';
import 'package:sihhat_mobile/screens/account.dart';
import 'package:sihhat_mobile/screens/booking.dart';
import 'package:sihhat_mobile/screens/catalog.dart';
import 'package:sihhat_mobile/screens/home.dart';

import 'api_test.dart' show MemoryStore;
import 'design_test.dart' show reply;
import 'home_test.dart' show home;
import 'booking_test.dart' show sanatorium;

Json listing(String id) => {
  'id': id,
  'name': 'Test $id',
  'region': 'Toshkent',
  'description': 'Dam olish',
  'amenities': ['Wi-Fi'],
  'photo_ids': <String>[],
  'from_amount': '10000',
};
Json detail(String id) => {
  ...listing(id),
  ...sanatorium,
  'id': id,
  'name': 'Test $id',
  'address': 'Sinov manzili',
  'services': ['Yashash'],
  'meals': 'Uch mahal',
  'reviews': <Json>[],
};

void main() {
  test('all pages and unopened tariffs persist across restart; failed pages keep the snapshot and reconnect updates/removes entries', () async {
    final store = MemoryStore();
    var remote = List.generate(101, (n) => listing('site-$n'));
    var failPage = false, price = '10000';
    final api = Api(
      baseUrl: 'http://localhost',
      store: store,
      client: MockClient((request) async {
        if (request.url.path == '/catalog/sanatoriums') {
          final page = int.parse(request.url.queryParameters['page']!);
          if (failPage && page == 2) throw http.ClientException('offline');
          return reply({
            'data': remote.skip((page - 1) * 100).take(100).toList(),
            'pages': (remote.length / 100).ceil(),
            'total': remote.length,
          });
        }
        final id = request.url.path.split('/').last;
        return reply({
          ...detail(id),
          'rate_plans': [
            {...rows(sanatorium['rate_plans']).first, 'baseAmount': price},
          ],
        });
      }),
    );
    final catalog = CatalogCache(api);
    await catalog.sync();
    expect(catalog.items.length, 101);
    expect((await catalog.cachedDetail('site-100'))?['rate_plans'], isNotEmpty);

    // Downloads have no seven-day expiry and belong to their API host.
    final raw = asJson(jsonDecode(store.data[catalog.cacheKey]!));
    store.data[catalog.cacheKey] = jsonEncode({
      ...raw,
      'saved_at': '2020-01-01T00:00:00Z',
    });
    final restarted = Api(
      baseUrl: api.baseUrl,
      store: store,
      client: MockClient((_) async => throw http.ClientException('offline')),
    );
    await CatalogCache(restarted).load();
    expect(
      CatalogCache(
        restarted,
      ).search(query: 'site-100', amenity: 'Wi-Fi', maxPrice: '100')['total'],
      1,
    );
    expect(
      (await CatalogCache(restarted).cachedDetail('site-100'))?['room_types'],
      isNotEmpty,
    );
    final other = Api(baseUrl: 'http://other-server', store: store);
    await CatalogCache(other).load();
    expect(CatalogCache(other).hasSnapshot, false);

    failPage = true;
    remote = [listing('new-site'), ...remote];
    await catalog.sync();
    expect(catalog.items.length, 101);
    expect(catalog.items.any((s) => s['id'] == 'new-site'), false);
    failPage = false;
    price = '22000';
    remote = [listing('new-site'), listing('site-100')];
    await catalog.sync();
    expect(catalog.items.map((s) => s['id']), ['new-site', 'site-100']);
    expect(
      (await catalog.cachedDetail('new-site'))?['rate_plans'][0]['baseAmount'],
      '22000',
    );
    expect(await catalog.cachedDetail('site-0'), isNull);
    api.client.close();
    restarted.client.close();
    other.client.close();
  });

  test('public photos survive restart in persistent files without another request and remain isolated by server', () async {
    final folder = await Directory.systemTemp.createTemp('sihhat-photos-test-');
    expect(
      folder.absolute.path.startsWith(Directory.systemTemp.absolute.path),
      true,
    );
    addTearDown(() => folder.delete(recursive: true));
    var calls = 0;
    final bytes = base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
    );
    final api = Api(
      baseUrl: 'http://localhost',
      store: MemoryStore(),
      client: MockClient((_) async {
        calls++;
        return http.Response.bytes(
          bytes,
          200,
          headers: {'content-type': 'image/png'},
        );
      }),
    );
    final photos = CatalogPhotos(api, directory: () async => folder);
    expect(await (await photos.file('public-photo'))!.readAsBytes(), bytes);
    final offline = Api(
      baseUrl: api.baseUrl,
      store: MemoryStore(),
      client: MockClient((_) async {
        calls++;
        throw http.ClientException('offline');
      }),
    );
    final saved = await CatalogPhotos(
      offline,
      directory: () async => folder,
    ).file('public-photo');
    expect(await saved!.readAsBytes(), bytes);
    expect(calls, 1);
    final other = Api(
      baseUrl: 'http://other-server',
      store: MemoryStore(),
      client: offline.client,
    );
    expect(
      await CatalogPhotos(
        other,
        directory: () async => folder,
      ).file('public-photo'),
      isNull,
    );
    expect(await photos.file('../private-file'), isNull);
    api.client.close();
    offline.client.close();
  });

  testWidgets(
    'saved home and profile open immediately while session validation is still waiting for the network',
    (tester) async {
      final store = MemoryStore();
      final prepare = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient(
          (request) async => request.url.path == '/catalog/sanatoriums'
              ? reply({
                  'data': [listing('site')],
                  'pages': 1,
                })
              : reply(detail('site')),
        ),
      );
      await prepare.tokens({
        'access_token': 'saved-access',
        'refresh_token': 'saved-refresh',
        'user': {
          'id': 'customer',
          'name': 'Saqlangan mijoz',
          'phone': '+998901234567',
        },
      });
      await CatalogCache(prepare).sync();
      store.data[HomeFeed(prepare).cacheKey] = jsonEncode(home());
      final waiting = Completer<http.Response>();
      final offline = Api(
        baseUrl: prepare.baseUrl,
        store: store,
        client: MockClient((request) async {
          if (request.url.path == '/auth/me') return waiting.future;
          throw http.ClientException('offline');
        }),
      );
      await tester.pumpWidget(SihhatApp(api: offline));
      await tester.pumpAndSettle();
      expect(find.byType(HomeScreen), findsOneWidget);
      await tester.tap(find.text('Profil'));
      await tester.pumpAndSettle();
      expect(find.text('Saqlangan mijoz'), findsOneWidget);
      expect(find.text('+998901234567'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      waiting.completeError(http.ClientException('offline'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      prepare.client.close();
      offline.client.close();
    },
  );

  testWidgets(
    'offline catalogue search opens a downloaded profile and its selected tariff without requesting a quote',
    (tester) async {
      final store = MemoryStore();
      final prepared = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient(
          (request) async => request.url.path == '/catalog/sanatoriums'
              ? reply({
                  'data': [listing('site')],
                  'pages': 1,
                })
              : reply(detail('site')),
        ),
      );
      await CatalogCache(prepared).sync();
      final requests = <String>[];
      final api = Api(
        baseUrl: prepared.baseUrl,
        store: store,
        client: MockClient((request) async {
          requests.add(request.url.path);
          throw http.ClientException('offline');
        }),
      );
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: CatalogScreen(api))),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'site');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Test site'));
      await tester.pumpAndSettle();
      expect(find.text('Xonalar va tariflar'), findsOneWidget);
      final choose = find.byKey(const ValueKey('select-rate-rate'));
      await tester.ensureVisible(choose);
      await tester.pumpAndSettle();
      await tester.tap(choose);
      await tester.pumpAndSettle();
      expect(find.byType(BookingComposer), findsOneWidget);
      expect(find.text('Standart xona'), findsOneWidget);
      expect(requests.any((path) => path.startsWith('/customer/')), false);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      prepared.client.close();
      api.client.close();
    },
  );

  testWidgets(
    'profile edits update the downloaded name and preserve the phone when offline',
    (tester) async {
      var offline = false, currentName = 'Avvalgi ism';
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((request) async {
          if (offline) throw http.ClientException('offline');
          if (request.method == 'PATCH') {
            currentName = jsonDecode(request.body)['name'];
            return reply({'id': 'customer', 'name': currentName});
          }
          return reply({
            'id': 'customer',
            'name': currentName,
            'phone': '+998901234567',
          });
        }),
      );
      await api.tokens({
        'access_token': 'saved-access',
        'refresh_token': 'saved-refresh',
        'user': {
          'id': 'customer',
          'name': currentName,
          'phone': '+998901234567',
        },
      });
      Widget screen() =>
          MaterialApp(home: Scaffold(body: ProfileScreen(api, () {})));
      await tester.pumpWidget(screen());
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Ism-familiyani o‘zgartirish'));
      await tester.tap(find.text('Ism-familiyani o‘zgartirish'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Yangi ism');
      await tester.tap(find.text('Saqlash'));
      await tester.pumpAndSettle();
      offline = true;
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(screen());
      await tester.pumpAndSettle();
      expect(find.text('Yangi ism'), findsOneWidget);
      expect(find.text('+998901234567'), findsOneWidget);
      expect((await api.cachedProfile())?['name'], 'Yangi ism');
      await tester.pumpWidget(const SizedBox.shrink());
      await api.clear();
      expect(await api.cachedProfile(), isNull);
      expect(tester.takeException(), isNull);
      api.client.close();
    },
  );

  test(
    'a response arriving after logout cannot restore private profile data',
    () async {
      final pending = Completer<http.Response>();
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((_) => pending.future),
      );
      await api.tokens({
        'access_token': 'access',
        'refresh_token': 'refresh',
        'user': {'id': 'customer', 'name': 'Mijoz'},
      });
      final request = api.refreshProfile();
      await Future<void>.delayed(Duration.zero);
      await api.clear();
      pending.complete(reply({'id': 'customer', 'name': 'Old customer'}));
      await request;
      expect(await api.cachedProfile(), isNull);
      api.client.close();
    },
  );
}

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/data/booking_cache.dart';
import 'package:sihhat_mobile/screens/booking.dart';

import 'api_test.dart' show MemoryStore;
import 'design_test.dart' show reply;

Json savedBooking(
  String id, {
  String status = 'CONFIRMED',
  DateTime? created,
}) => {
  'id': id,
  'userId': 'customer',
  'reference': 'SH-$id',
  'status': status,
  'createdAt': (created ?? DateTime.now()).toUtc().toIso8601String(),
  'checkIn': '2027-01-01',
  'checkOut': '2027-01-03',
  'amount': '20000',
  'sanatorium_name': 'Saqlangan sanatoriya',
  'guest': {'name': 'Saqlangan mehmon'},
  'items': <Json>[],
  'payment_status': status == 'CONFIRMED' ? 'SUCCEEDED' : 'CREATED',
  'payment': {'status': status == 'CONFIRMED' ? 'SUCCEEDED' : 'CREATED'},
};

Future<Api> signedApi(
  MemoryStore store,
  http.Client client, {
  String server = 'http://localhost',
  String owner = 'customer',
}) async {
  final api = Api(baseUrl: server, store: store, client: client);
  await api.tokens({
    'access_token': 'test-access',
    'refresh_token': 'test-refresh',
    'user': {'id': owner},
  });
  return api;
}

void main() {
  test(
    'a server reply arriving after logout cannot recreate private downloads',
    () async {
      final store = MemoryStore(),
          started = Completer<void>(),
          response = Completer<http.Response>();
      final api = await signedApi(
        store,
        MockClient((_) {
          started.complete();
          return response.future;
        }),
      );
      final loading = BookingCache(api).refresh('late');
      await started.future;
      await api.clear();
      response.complete(reply(savedBooking('late')));
      await loading;
      expect(await store.read('booking_cache'), isNull);
      expect(await BookingCache(api).cached('late'), isNull);
      api.client.close();
    },
  );
  test('five minute boundary and immediate cancellation hide unpaid bookings; captured and refunded payments remain', () {
    final created = DateTime.utc(2026, 10, 6, 8);
    final unpaid = savedBooking(
      'unpaid',
      status: 'PAYMENT_PENDING',
      created: created,
    );
    expect(
      bookingVisible(
        unpaid,
        now: created
            .add(const Duration(minutes: 5))
            .subtract(const Duration(milliseconds: 1)),
      ),
      isTrue,
    );
    expect(
      bookingVisible(unpaid, now: created.add(const Duration(minutes: 5))),
      isFalse,
    );
    expect(
      bookingVisible({...unpaid, 'status': 'CANCELLED'}, now: created),
      isFalse,
    );
    expect(
      bookingVisible({...unpaid, 'status': 'EXPIRED'}, now: created),
      isFalse,
    );
    expect(
      bookingVisible({
        ...unpaid,
        'payment_status': 'REFUNDED',
      }, now: created.add(const Duration(days: 40))),
      isTrue,
    );
    expect(
      bookingVisible({
        ...unpaid,
        'history_preserved': true,
      }, now: created.add(const Duration(days: 40))),
      isTrue,
    );
  });

  test('all booking pages and unopened details survive offline restart; interrupted sync keeps prior data and successful sync replaces it', () async {
    final store = MemoryStore();
    var remote = List.generate(101, (n) => savedBooking('b-$n'));
    var failPage = false;
    final api = await signedApi(
      store,
      MockClient((request) async {
        if (request.url.path == '/customer/bookings') {
          final page = int.parse(request.url.queryParameters['page']!);
          if (failPage && page == 2) throw http.ClientException('offline');
          return reply({
            'data': remote.skip((page - 1) * 100).take(100).toList(),
            'pages': (remote.length / 100).ceil(),
          });
        }
        return reply({
          ...remote.firstWhere(
            (b) => b['id'] == request.url.path.split('/').last,
          ),
          'items': [
            {'adults': 2, 'childrenAges': <int>[], 'amount': '20000'},
          ],
        });
      }),
    );
    final cache = BookingCache(api);
    await cache.sync();
    expect((await cache.page(1))?['total'], 101);
    expect((await cache.cached('b-100'))?['items'], isNotEmpty);
    final restarted = Api(
      baseUrl: api.baseUrl,
      store: store,
      client: MockClient((_) async => throw http.ClientException('offline')),
    );
    await restarted.restore();
    await BookingCache(restarted).sync();
    expect((await BookingCache(restarted).page(7))?['data'], hasLength(11));
    expect(
      (await BookingCache(restarted).cached('b-100'))?['guest']['name'],
      'Saqlangan mehmon',
    );
    failPage = true;
    await cache.sync();
    expect((await cache.page(1))?['total'], 101);
    failPage = false;
    remote = [savedBooking('new')];
    await cache.sync();
    expect((await cache.page(1))?['total'], 1);
    expect(await cache.cached('b-100'), isNull);
    api.client.close();
    restarted.client.close();
  });

  test(
    'private downloads are isolated by server/account and cleared on logout',
    () async {
      final store = MemoryStore();
      final api = await signedApi(store, MockClient((_) async => reply([])));
      await BookingCache(api).remember(savedBooking('private'));
      final otherHost = Api(baseUrl: 'http://other-server', store: store);
      await otherHost.restore();
      expect(await BookingCache(otherHost).page(1), isNull);
      await api.tokens({
        'access_token': 'other-access',
        'refresh_token': 'other-refresh',
        'user': {'id': 'other'},
      });
      expect(await BookingCache(api).cached('private'), isNull);
      expect(await store.read('booking_cache'), isNull);
      await api.clear();
      expect(await store.read('booking_cache'), isNull);
      api.client.close();
      otherHost.client.close();
    },
  );

  test('unpaid offline snapshots expire on reopen and successful cancellation removes local details immediately', () async {
    final store = MemoryStore();
    final api = await signedApi(
      store,
      MockClient((_) async => reply({'success': true, 'status': 'CANCELLED'})),
    );
    await BookingCache(api).remember(savedBooking('pending', status: 'HOLD'));
    await api.pendingBooking('pending');
    await BookingCache(api).cancel('pending', 'Safar bekor qilindi');
    expect(await BookingCache(api).cached('pending'), isNull);
    expect(await api.getPendingBooking(), isNull);
    await store.write(
      'booking_cache',
      jsonEncode({
        'owner': 'customer',
        'server': api.baseUrl,
        'bookings': [
          savedBooking(
            'old',
            status: 'PAYMENT_PENDING',
            created: DateTime.now().subtract(const Duration(minutes: 5)),
          ),
          savedBooking('paid', created: DateTime.utc(2020)),
        ],
      }),
    );
    final restarted = Api(baseUrl: api.baseUrl, store: store);
    await restarted.restore();
    expect((await BookingCache(restarted).page(1))?['total'], 1);
    expect(await BookingCache(restarted).cached('old'), isNull);
    expect(await BookingCache(restarted).cached('paid'), isNotNull);
    api.client.close();
    restarted.client.close();
  });

  testWidgets(
    'saved history and booking QR open without an internet connection',
    (tester) async {
      final store = MemoryStore();
      final api = await signedApi(
        store,
        MockClient((_) async => throw http.ClientException('offline')),
      );
      await BookingCache(api).remember(savedBooking('offline'));
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: BookingsScreen(api))),
      );
      await tester.pumpAndSettle();
      expect(find.text('SH-offline'), findsOneWidget);
      await tester.tap(find.text('SH-offline'));
      await tester.pumpAndSettle();
      expect(find.text('Broningiz tasdiqlandi!'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byType(QrImageView),
        180,
        scrollable: find.byType(Scrollable).last,
      );
      expect(find.byType(QrImageView), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

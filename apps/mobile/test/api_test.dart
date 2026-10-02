import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';

class MemoryStore implements TokenStore {
  final data = <String, String>{};
  @override
  Future<String?> read(String key) async => data[key];
  @override
  Future<void> write(String key, String? value) async {
    if (value == null) {
      data.remove(key);
    } else {
      data[key] = value;
    }
  }
}

void main() {
  test('integer money retains tiyin beyond JavaScript safe integer', () {
    expect(money('900719925474099101'), '9 007 199 254 740 991,01 so‘m');
    expect(money('-101'), '−1,01 so‘m');
  });
  test('an interrupted hold retries with the same key; changed payload gets a new key', () async {
    final keys = <String>[];
    var attempts = 0;
    final api = Api(
      baseUrl: 'http://localhost',
      store: MemoryStore(),
      client: MockClient((request) async {
        keys.add(request.headers['Idempotency-Key']!);
        if (attempts++ == 0) throw http.ClientException('lost response');
        return http.Response('{"id":"booking"}', 201);
      }),
    );
    final body = {
      'quote_id': 'same',
      'accepted_policy_versions': ['policy'],
      'guest': {'name': 'Guest', 'phone': '+998901234567'},
    };
    await expectLater(
      api.send('/customer/bookings/hold', method: 'POST', body: body),
      throwsA(isA<ApiException>()),
    );
    await api.send('/customer/bookings/hold', method: 'POST', body: body);
    await api.send(
      '/customer/bookings/hold',
      method: 'POST',
      body: {...body, 'quote_id': 'changed'},
    );
    expect(keys[0], keys[1]);
    expect(keys[1], isNot(keys[2]));
  });
  test('expired mobile access rotates persisted tokens and retries checkout without duplicating its key', () async {
    final store = MemoryStore();
    await store.write('access', 'old');
    await store.write('refresh', 'old-refresh');
    final keys = <String>[];
    var calls = 0;
    final api = Api(
      baseUrl: 'http://localhost',
      store: store,
      client: MockClient((request) async {
        if (request.url.path == '/auth/refresh') {
          expect(jsonDecode(request.body)['refresh_token'], 'old-refresh');
          return http.Response(
            '{"access_token":"new","refresh_token":"new-refresh"}',
            201,
          );
        }
        keys.add(request.headers['Idempotency-Key']!);
        if (calls++ == 0) {
          return http.Response(
            '{"code":"UNAUTHENTICATED","message":"expired"}',
            401,
          );
        }
        expect(request.headers['Authorization'], 'Bearer new');
        return http.Response('{"order_id":"order","mode":"payme"}', 201);
      }),
    );
    await api.restore();
    await api.send(
      '/customer/bookings/booking/checkout',
      method: 'POST',
      body: {},
    );
    expect(keys[0], keys[1]);
    expect(await store.read('access'), 'new');
    expect(await store.read('refresh'), 'new-refresh');
  });
  test(
    'restart recovers pending payment identifier and uses backend status',
    () async {
      final store = MemoryStore();
      final original = Api(baseUrl: 'http://localhost', store: store);
      await original.tokens({
        'access_token': 'token',
        'refresh_token': 'refresh',
      });
      await original.pendingBooking('booking-id');
      final restarted = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((request) async {
          expect(request.url.path, '/customer/bookings/booking-id');
          return http.Response('{"status":"PAYMENT_PENDING"}', 200);
        }),
      );
      await restarted.restore();
      final id = await restarted.getPendingBooking();
      expect(id, 'booking-id');
      final booking = asJson(await restarted.send('/customer/bookings/$id'));
      expect(booking['status'], 'PAYMENT_PENDING');
      expect(booking['status'], isNot('CONFIRMED'));
    },
  );
  test(
    'revoked refresh removes secure credentials and pending payment',
    () async {
      final store = MemoryStore();
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient(
          (_) async => http.Response(
            '{"code":"UNAUTHENTICATED","message":"revoked"}',
            401,
          ),
        ),
      );
      await api.tokens({'access_token': 'token', 'refresh_token': 'refresh'});
      await api.pendingBooking('booking');
      await expectLater(
        api.send('/customer/bookings'),
        throwsA(isA<ApiException>()),
      );
      expect(api.signedIn, false);
      expect(await store.read('refresh'), null);
      expect(await api.getPendingBooking(), null);
    },
  );
}

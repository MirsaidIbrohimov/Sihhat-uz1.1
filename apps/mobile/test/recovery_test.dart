import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/booking.dart';

import 'api_test.dart' show MemoryStore;

Json booking(String status) => {
  'id': 'booking',
  'reference': 'BRON-RECOVERY',
  'status': status,
  'checkIn': '2026-10-09',
  'checkOut': '2026-10-11',
  'amount': '20000',
  'guest': {'name': 'Test mehmon'},
  'items': <dynamic>[],
  'payment': {'status': status == 'CONFIRMED' ? 'SUCCEEDED' : 'PENDING'},
};

void main() {
  for (final status in ['PAYMENT_PENDING', 'CONFIRMED']) {
    testWidgets(
      'cold start rotates expired session and restores $status from server',
      (tester) async {
        final store = MemoryStore();
        await store.write('access', 'expired-access');
        await store.write('refresh', 'saved-refresh');
        await store.write('pending_booking', 'booking');
        var refreshes = 0;
        final api = Api(
          baseUrl: 'http://localhost',
          store: store,
          client: MockClient((request) async {
            if (request.url.path == '/auth/me') {
              return http.Response(
                '{"code":"UNAUTHENTICATED","message":"expired"}',
                401,
              );
            }
            if (request.url.path == '/auth/refresh') {
              refreshes++;
              expect(
                jsonDecode(request.body)['refresh_token'],
                'saved-refresh',
              );
              return http.Response(
                jsonEncode({
                  'access_token': 'new-access',
                  'refresh_token': 'new-refresh',
                  'user': {'id': 'customer', 'name': 'Test mehmon'},
                }),
                201,
              );
            }
            if (request.url.path == '/customer/bookings/booking') {
              expect(request.headers['Authorization'], 'Bearer new-access');
              return http.Response(jsonEncode(booking(status)), 200);
            }
            return http.Response('{"data":[]}', 200);
          }),
        );
        await tester.pumpWidget(SihhatApp(api: api));
        await tester.pumpAndSettle();
        expect(refreshes, 1);
        expect(await store.read('refresh'), 'new-refresh');
        expect(find.byType(BookingScreen), findsOneWidget);
        expect(find.text(states[status]!), findsOneWidget);
        expect(
          await api.getPendingBooking(),
          status == 'CONFIRMED' ? null : 'booking',
        );
        expect(find.text('SMS kodini kiriting'), findsNothing);
        await tester.pumpWidget(const SizedBox.shrink());
        api.client.close();
      },
    );
  }

  testWidgets(
    'cold start with revoked session clears credentials and interrupted payment',
    (tester) async {
      final store = MemoryStore();
      await store.write('access', 'old-access');
      await store.write('refresh', 'revoked-refresh');
      await store.write('pending_booking', 'booking');
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((request) async {
          if (request.url.path.startsWith('/auth/')) {
            return http.Response(
              '{"code":"UNAUTHENTICATED","message":"revoked"}',
              401,
            );
          }
          expect(request.url.path.startsWith('/customer/'), false);
          return http.Response('{"data":[]}', 200);
        }),
      );
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      expect(api.signedIn, false);
      expect(await store.read('refresh'), isNull);
      expect(await api.getPendingBooking(), isNull);
      expect(find.byType(BookingScreen), findsNothing);
      expect(
        find.text('Sog‘lom dam olish shu yerdan boshlanadi.'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

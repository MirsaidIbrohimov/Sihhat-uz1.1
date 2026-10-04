import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/booking.dart';

import 'api_test.dart' show MemoryStore;

const sanatorium = {
  'id': 'sanatorium',
  'name': 'Test sanatoriyasi',
  'rate_plans': [
    {
      'id': 'rate',
      'roomTypeId': 'type',
      'name': 'Standart',
      'baseAmount': '10000',
    },
  ],
  'room_types': [
    {'id': 'type', 'name': 'Standart xona', 'maxGuests': 3, 'maxAdults': 2},
  ],
};

void main() {
  testWidgets(
    'good wishes appear only after server confirmation and disappear for a payment exception',
    (tester) async {
      var status = 'HOLD';
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient(
          (_) async => http.Response.bytes(
            utf8.encode(
              jsonEncode({
                'id': 'booking',
                'reference': 'BRON-TEST',
                'status': status,
                'checkIn': '2026-10-10',
                'checkOut': '2026-10-17',
                'amount': '20000',
                'guest': {'name': 'Test mehmon'},
                'items': <dynamic>[],
              }),
            ),
            200,
          ),
        ),
      );
      await tester.pumpWidget(MaterialApp(home: BookingScreen(api, 'booking')));
      await tester.pumpAndSettle();
      final wishes = find.text(
        'Yaxshi dam oling! Safaringiz yoqimli va xotirjam o‘tsin.',
      );
      expect(wishes, findsNothing);
      Future<void> refresh(String value) async {
        status = value;
        await tester.tap(find.byTooltip('Holatni yangilash'));
        await tester.pumpAndSettle();
      }

      await refresh('PAYMENT_PENDING');
      expect(wishes, findsNothing);
      await refresh('CONFIRMED');
      expect(wishes, findsOneWidget);
      await refresh('CONFIRMED');
      expect(wishes, findsOneWidget);
      await refresh('PAYMENT_EXCEPTION');
      expect(wishes, findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
  for (final success in [true, false]) {
    testWidgets(
      'leaving quote screen before ${success ? 'success' : 'failure'} is safe',
      (tester) async {
        final response = Completer<http.Response>();
        final api = Api(
          baseUrl: 'http://localhost',
          store: MemoryStore(),
          client: MockClient((_) => response.future),
        );
        await tester.pumpWidget(
          MaterialApp(home: BookingComposer(api, sanatorium)),
        );
        final calculate = find.text('Narx va bo‘sh joyni tekshirish');
        await tester.ensureVisible(calculate);
        await tester.tap(calculate);
        await tester.pump();
        final ages = tester.widget<TextFormField>(find.byType(TextFormField));
        expect(ages.enabled, false);
        await tester.pumpWidget(const SizedBox.shrink());
        response.complete(
          success
              ? http.Response('{"id":"quote"}', 201)
              : http.Response(
                  '{"code":"INVENTORY_UNAVAILABLE","message":"Xona band"}',
                  409,
                ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'leaving checkout screen before ${success ? 'success' : 'failure'} retains recovery',
      (tester) async {
        final response = Completer<http.Response>(), store = MemoryStore();
        final api = Api(
          baseUrl: 'http://localhost',
          store: store,
          client: MockClient((request) async {
            if (request.url.path.endsWith('/checkout')) {
              return response.future;
            }
            return http.Response(
              jsonEncode({
                'id': 'booking',
                'reference': 'BRON-TEST',
                'status': 'HOLD',
                'checkIn': '2026-10-02',
                'checkOut': '2026-10-04',
                'amount': '20000',
                'guest': {'name': 'Test mehmon'},
                'items': <dynamic>[],
              }),
              200,
            );
          }),
        );
        await tester.pumpWidget(
          MaterialApp(home: BookingScreen(api, 'booking')),
        );
        await tester.pumpAndSettle();
        final pay = find.text('To‘lovga o‘tish');
        await tester.ensureVisible(pay);
        await tester.tap(pay);
        await tester.pump();
        await tester.pumpWidget(const SizedBox.shrink());
        response.complete(
          success
              ? http.Response('{"order_id":"order","mode":"local"}', 201)
              : http.Response(
                  '{"code":"PAYMENT_FAILED","message":"Payment unavailable"}',
                  503,
                ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(await api.getPendingBooking(), 'booking');
      },
    );
  }
}

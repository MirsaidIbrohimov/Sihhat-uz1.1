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
    {
      'id': 'type',
      'name': 'Standart xona',
      'maxGuests': 3,
      'maxAdults': 2,
      'maxChildren': 2,
    },
  ],
};

Json roomChoices() => {
  ...sanatorium,
  'room_types': [
    ...rows(sanatorium['room_types']),
    {
      'id': 'suite',
      'name': 'Suite xona',
      'maxGuests': 1,
      'maxAdults': 1,
      'maxChildren': 0,
    },
  ],
  'rate_plans': [
    ...rows(sanatorium['rate_plans']),
    {
      'id': 'comfort',
      'roomTypeId': 'type',
      'name': 'Komfort',
      'baseAmount': '12000',
    },
    {
      'id': 'suite-rate',
      'roomTypeId': 'suite',
      'name': 'Suite tarifi',
      'baseAmount': '35000',
    },
  ],
};

void main() {
  testWidgets(
    'selected tariffs stay offline until payment and room types filter tariffs; holds accept only the fresh server policy',
    (tester) async {
      var offline = true;
      final quotes = <Json>[], holds = <Json>[];
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((request) async {
          if (request.url.path == '/customer/quotes') {
            quotes.add(asJson(jsonDecode(request.body)));
            if (offline) throw http.ClientException('offline');
            return http.Response(
              jsonEncode({
                'id': 'fresh-quote',
                'amount': '70000',
                'data': {
                  'nights': 2,
                  'items': [
                    {'room_type_name': 'Suite xona', 'amount': '70000'},
                  ],
                  'policies': [
                    {
                      'id': 'fresh-policy',
                      'name': 'Amaldagi shart',
                      'kind': 'FULL_BEFORE_CUTOFF',
                      'cutoff_hours': 24,
                    },
                  ],
                },
              }),
              201,
            );
          }
          if (request.url.path == '/customer/bookings/hold') {
            holds.add(asJson(jsonDecode(request.body)));
            return http.Response('{"id":"booking"}', 201);
          }
          return http.Response(
            jsonEncode({
              'id': 'booking',
              'reference': 'BRON-TEST',
              'status': 'HOLD',
              'amount': '70000',
              'checkIn': '2026-10-10',
              'checkOut': '2026-10-12',
              'guest': {'name': 'Test mehmon'},
              'items': <Json>[],
            }),
            200,
          );
        }),
      );
      await api.tokens({
        'access_token': 'saved-access',
        'refresh_token': 'saved-refresh',
        'user': {
          'id': 'customer',
          'name': 'Test mehmon',
          'phone': '+998901234567',
        },
      });
      await tester.pumpWidget(
        MaterialApp(
          home: BookingComposer(api, roomChoices(), initialRateId: 'comfort'),
        ),
      );
      await tester.pumpAndSettle();
      expect(quotes, isEmpty);
      expect(find.text('Komfort · 120 so‘m'), findsOneWidget);
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Suite xona').last);
      await tester.pumpAndSettle();
      expect(find.text('Suite tarifi · 350 so‘m / tun'), findsOneWidget);
      expect(find.text('Bolalar bilan kelaman'), findsNothing);
      await tester.tap(find.text('To‘lovga o‘tish'));
      await tester.pumpAndSettle();
      expect(quotes.single['items'][0]['room_type_id'], 'suite');
      expect(quotes.single['items'][0]['rate_plan_id'], 'suite-rate');
      expect(holds, isEmpty);
      expect(
        find.text(
          'To‘lovga o‘tish uchun internetga ulaning. Tanlovlaringiz saqlanadi.',
        ),
        findsOneWidget,
      );
      offline = false;
      await tester.tap(find.text('To‘lovga o‘tish'));
      await tester.pumpAndSettle();
      final accept = find.text('Shartlarni o‘qidim va qabul qilaman');
      await tester.ensureVisible(accept);
      await tester.pumpAndSettle();
      await tester.tap(accept);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Bronni tasdiqlash'));
      await tester.pumpAndSettle();
      expect(holds.single['quote_id'], 'fresh-quote');
      expect(holds.single['accepted_policy_versions'], ['fresh-policy']);
      expect(holds.single['guest']['phone'], '+998901234567');
      expect(find.byType(BookingScreen), findsOneWidget);
      expect(find.text('Broningiz tasdiqlandi!'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets('compact room selection fits a small screen and large text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.4;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final api = Api(baseUrl: 'http://localhost', store: MemoryStore());
    await tester.pumpWidget(
      MaterialApp(
        home: BookingComposer(api, roomChoices(), initialRateId: 'comfort'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('To‘lovga o‘tish').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    api.client.close();
  });
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
        api.accessToken = 'test-token';
        final calculate = find.text('To‘lovga o‘tish');
        await tester.ensureVisible(calculate);
        await tester.tap(calculate);
        await tester.pump();
        expect(
          tester
              .widget<DropdownButtonFormField<String>>(
                find.byType(DropdownButtonFormField<String>),
              )
              .onChanged,
          isNull,
        );
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

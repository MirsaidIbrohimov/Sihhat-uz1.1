import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/booking.dart';

Future<Json> bridge(String path, [Json? body]) async {
  final uri = Uri.parse('http://127.0.0.1:4001$path');
  final headers = {
    'Content-Type': 'application/json',
    'X-Test-Key': const String.fromEnvironment('TEST_BRIDGE_KEY'),
  };
  final response = body == null
      ? await http.get(uri, headers: headers)
      : await http.post(uri, headers: headers, body: jsonEncode(body));
  expect(response.statusCode, 200);
  return asJson(jsonDecode(response.body));
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android OS force-stop and payment-return recovery', (
    tester,
  ) async {
    final api = Api(baseUrl: const String.fromEnvironment('API_BASE_URL'));
    Json? finalReport;
    Future<void> waitFor(Finder finder) async {
      for (var n = 0; n < 180; n++) {
        await tester.pump(const Duration(milliseconds: 250));
        if (finder.evaluate().isNotEmpty) return;
      }
      expect(finder, findsWidgets);
    }

    Future<void> tapText(String text) async {
      final finder = find.text(text);
      if (finder.evaluate().isEmpty) {
        await waitFor(find.byType(ListView));
        await tester.scrollUntilVisible(
          finder,
          250,
          scrollable: find
              .descendant(
                of: find.byType(ListView).last,
                matching: find.byType(Scrollable),
              )
              .first,
          maxScrolls: 60,
          duration: const Duration(milliseconds: 250),
        );
      }
      await waitFor(finder);
      await tester.ensureVisible(finder.last);
      await tester.tap(finder.last);
      await tester.pumpAndSettle();
    }

    try {
      final state = await bridge('/recovery');
      if (state['phase'] == 'prepare') {
        final fixture = await bridge('/fixture');
        await api.clear();
        final challenge = asJson(
          await api.send(
            '/auth/customer/otp/request',
            method: 'POST',
            body: {'phone': fixture['phone']},
          ),
        );
        final sms = await bridge('/otp/${challenge['challenge_id']}');
        final login = asJson(
          await api.send(
            '/auth/customer/otp/verify',
            method: 'POST',
            body: {
              'challenge_id': challenge['challenge_id'],
              'code': sms['code'],
            },
          ),
        );
        await api.tokens(login);
        final sanatorium = asJson(
          await api.send('/catalog/sanatoriums/${fixture['sanatorium_id']}'),
        );
        final rate = rows(sanatorium['rate_plans']).first;
        Json? quote;
        for (var offset = 7; offset < 67; offset += 3) {
          final start = DateTime.now().add(Duration(days: offset));
          try {
            quote = asJson(
              await api.send(
                '/customer/quotes',
                method: 'POST',
                body: {
                  'sanatorium_id': sanatorium['id'],
                  'check_in': dateOnly(start),
                  'check_out': dateOnly(start.add(const Duration(days: 2))),
                  'items': List.generate(
                    2,
                    (_) => {
                      'room_type_id': rate['roomTypeId'],
                      'rate_plan_id': rate['id'],
                      'adults': 1,
                      'children_ages': <int>[],
                    },
                  ),
                },
              ),
            );
            break;
          } on ApiException catch (e) {
            if (e.code != 'INVENTORY_UNAVAILABLE') rethrow;
          }
        }
        expect(quote, isNotNull);
        final hold = asJson(
          await api.send(
            '/customer/bookings/hold',
            method: 'POST',
            body: {
              'quote_id': quote!['id'],
              'accepted_policy_versions': rows(quote['data']['policies'])
                  .map((p) => p['id'])
                  .toList(),
              'guest': {
                'name': 'Android OS tiklanish sinovi',
                'phone': fixture['phone'],
              },
            },
          ),
        );
        await api.pendingBooking(hold['id']);
        final checkout = asJson(
          await api.send(
            '/customer/bookings/${hold['id']}/checkout',
            method: 'POST',
            body: {},
          ),
        );
        expect(checkout['mode'], 'local');
        await bridge('/recovery/provider-start', {
          'order_id': checkout['order_id'],
          'amount': checkout['amount'],
        });
        await tester.pumpWidget(SihhatApp(api: api));
        await waitFor(find.text('Provayderda kutilmoqda'));
        final booking = asJson(
          await api.send('/customer/bookings/${hold['id']}'),
        );
        expect(booking['status'], 'PAYMENT_PENDING');
        finalReport = {
          'event': 'prepared',
          'booking_id': hold['id'],
          'reference': booking['reference'],
          'user_id': login['user']['id'],
          'status': booking['status'],
          'room_count': (booking['items'] as List).length,
        };
      } else {
        // A new Android process reads the actual secure store. The host
        // supplies public expected IDs, never access/refresh tokens.
        await api.restore();
        expect(api.signedIn, true);
        expect(asJson(await api.send('/auth/me'))['id'], state['user_id']);
        final pending = await api.getPendingBooking();
        if (state['phase'] == 'restore_payment') {
          expect(pending, state['booking_id']);
          await tester.pumpWidget(SihhatApp(api: api));
          await waitFor(find.byType(BookingScreen));
          await waitFor(find.text('Provayderda kutilmoqda'));
          final booking = asJson(await api.send('/customer/bookings/$pending'));
          expect(booking['status'], 'PAYMENT_PENDING');
          expect(booking['payment']['status'], 'PENDING');
          // Android opened sihhat://payment-return?status=success. A return
          // URI must never replace the backend payment state.
          expect(find.text('Bron tasdiqlangan'), findsNothing);
          await bridge('/recovery/report', {
            'event': 'restored',
            'session_restored': true,
            'pending_restored': true,
            'return_did_not_confirm': true,
            'status': booking['status'],
          });
          await tapText('To‘lovga o‘tish');
          await tapText('Sinov to‘lovini tasdiqlash');
          await waitFor(find.text('Bron tasdiqlangan'));
          final confirmed = asJson(
            await api.send('/customer/bookings/$pending'),
          );
          expect(confirmed['status'], 'CONFIRMED');
          expect(confirmed['payment']['status'], 'SUCCEEDED');
          expect((confirmed['items'] as List).length, 2);
          expect(await api.getPendingBooking(), isNull);
          finalReport = {
            'event': 'confirmed',
            'status': confirmed['status'],
            'payment_status': confirmed['payment']['status'],
            'pending_cleared': true,
          };
        } else {
          expect(state['phase'], 'restore_confirmed');
          expect(pending, isNull);
          await tester.pumpWidget(SihhatApp(api: api));
          await waitFor(find.text('Sog‘lom dam olish shu yerdan boshlanadi.'));
          expect(find.byType(BookingScreen), findsNothing);
          await tapText('Bronlar');
          await waitFor(find.text(state['reference']));
          await tapText(state['reference']);
          await waitFor(find.text('Bron tasdiqlangan'));
          finalReport = {
            'event': 'completed',
            'session_restored': true,
            'pending_cleared': true,
            'booking_visible': true,
          };
        }
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      await bridge('/recovery/report', finalReport);
    } catch (_) {
      await bridge('/recovery/report', {'event': 'failed'});
      rethrow;
    } finally {
      api.client.close();
    }
  });
}

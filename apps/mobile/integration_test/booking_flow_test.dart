import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:http/http.dart' as http;
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/booking.dart';

class ObservedApi extends Api {
  String? challenge;
  ObservedApi() : super(baseUrl: const String.fromEnvironment('API_BASE_URL'));
  @override
  Future<dynamic> send(
    String path, {
    String method = 'GET',
    Json? body,
    bool retry = true,
    String? idempotencyKey,
  }) async {
    final value = await super.send(
      path,
      method: method,
      body: body,
      retry: retry,
      idempotencyKey: idempotencyKey,
    );
    if (path == '/auth/customer/otp/request') challenge = value['challenge_id'];
    return value;
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'Android: OTP, two-room quote, hold, secure restart recovery and provider-confirmed local payment',
    (tester) async {
      Future<Json> bridge(String path) async {
        final r = await http.get(
          Uri.parse('http://127.0.0.1:4001$path'),
          headers: {
            'X-Test-Key': const String.fromEnvironment('TEST_BRIDGE_KEY'),
          },
        );
        expect(r.statusCode, 200);
        return asJson(jsonDecode(r.body));
      }

      Future<void> waitFor(Finder finder) async {
        for (var n = 0; n < 120; n++) {
          await tester.pump(const Duration(milliseconds: 250));
          if (finder.evaluate().isNotEmpty) return;
        }
        expect(finder, findsWidgets);
      }

      Future<void> reveal(Finder finder) async {
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
      }

      Future<void> tapText(String text) async {
        final f = find.text(text);
        await reveal(f);
        await tester.tap(f.last);
        await tester.pumpAndSettle();
      }

      final fixture = await bridge('/fixture'), api = ObservedApi();
      await api.clear();
      await tester.pumpWidget(SihhatApp(api: api));
      await waitFor(find.text('Kod yuborish'));
      await tester.enterText(find.byType(TextField).first, fixture['phone']);
      await tapText('Kod yuborish');
      await waitFor(find.text('SMS kodini kiriting'));
      final sms = await bridge('/otp/${api.challenge}');
      await tester.enterText(find.byType(TextField).last, sms['code']);
      await tapText('Tasdiqlash');
      expect(api.signedIn, true);
      await waitFor(find.text('Mashhur sanatoriyalar'));
      await tapText('Bronlar');
      debugPrint('Android test: OTP login passed');
      await tapText('Sanatoriyalar');
      await waitFor(find.text(fixture['sanatorium_name']));
      await tapText(fixture['sanatorium_name']);
      await tapText('Shu tarifni tanlash');
      await waitFor(find.byType(BookingComposer));
      debugPrint('Android test: booking composer opened');
      await tapText('Qo‘shimcha xona');
      await tapText('Yana xona qo‘shish');
      await tapText('To‘lovga o‘tish');
      await waitFor(find.text('Mehmon ism-familiyasi'));
      debugPrint('Android test: two-room quote received');
      final name = find.byWidgetPredicate(
        (w) =>
            w is TextField &&
            w.decoration?.labelText == 'Mehmon ism-familiyasi',
      );
      await reveal(name);
      await tester.enterText(name, 'Android integratsion sinov');
      final phone = find.byWidgetPredicate(
        (w) => w is TextField && w.decoration?.labelText == 'Mehmon telefoni',
      );
      await reveal(phone);
      await tester.enterText(phone, fixture['phone']);
      await tapText('Shartlarni o‘qidim va qabul qilaman');
      await tapText('Bronni tasdiqlash');
      await waitFor(find.byType(BookingScreen));
      await waitFor(find.text('To‘lovga o‘tish'));
      final pending = await api.getPendingBooking();
      expect(pending, isNotNull);
      debugPrint('Android test: hold created and persisted');
      // Dispose the running tree, then reconstruct API and app using the Android secure store.
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      final restored = Api(
        baseUrl: const String.fromEnvironment('API_BASE_URL'),
      );
      await tester.pumpWidget(SihhatApp(api: restored));
      await waitFor(find.byType(BookingScreen));
      await waitFor(find.text('To‘lovga o‘tish'));
      expect(await restored.getPendingBooking(), pending);
      debugPrint('Android test: secure-store recovery passed');
      await tapText('To‘lovga o‘tish');
      await tapText('Sinov to‘lovini tasdiqlash');
      await waitFor(find.text('Bron tasdiqlangan'));
      final booking = asJson(
        await restored.send('/customer/bookings/$pending'),
      );
      expect(booking['status'], 'CONFIRMED');
      expect(booking['payment']['status'], 'SUCCEEDED');
      expect((booking['items'] as List).length, 2);
      expect(await restored.getPendingBooking(), null);
      debugPrint('Android test: two-room local payment confirmed');
    },
  );
}

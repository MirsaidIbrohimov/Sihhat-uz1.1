import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/login.dart';
import 'package:sihhat_mobile/screens/home_info.dart';

import 'api_test.dart' show MemoryStore;
import 'design_test.dart' show reply;
import 'home_test.dart' show home, item;

Api loginApi(MemoryStore store, List<String> requests) => Api(
  baseUrl: 'http://localhost',
  store: store,
  client: MockClient((request) async {
    requests.add(request.url.path);
    switch (request.url.path) {
      case '/auth/customer/otp/request':
        return reply({
          'challenge_id': 'challenge',
          'resend_after': 60,
          'demo_code': '135790',
        });
      case '/auth/customer/otp/verify':
        if (jsonDecode(request.body)['code'] != '135790') {
          return http.Response(
            '{"code":"OTP_INVALID","message":"Kod xato"}',
            401,
          );
        }
        return reply({
          'access_token': 'verified-access',
          'refresh_token': 'verified-refresh',
          'user': {'id': 'customer', 'name': 'Mijoz'},
        });
      case '/auth/me':
        return reply({'id': 'customer', 'name': 'Mijoz'});
      case '/catalog/home':
        return reply(home());
      case '/catalog/news/news':
        return reply({
          'title': 'Sanatoriyalarni solishtiring',
          'body': 'Tavsiyalar',
          'published_at': DateTime.now().toUtc().toIso8601String(),
        });
      default:
        return reply({
          'data': [if (request.url.path == '/catalog/sanatoriums') item],
          'pages': 1,
        });
    }
  }),
);

Future<void> tapVisible(WidgetTester tester, String label) async {
  final finder = find.text(label);
  final scrollable = find.byType(Scrollable).first;
  final scroll = tester.state<ScrollableState>(scrollable).position;
  scroll.jumpTo(scroll.minScrollExtent);
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(finder, 150, scrollable: scrollable);
  await tester.pumpAndSettle();
  await tester.tap(finder.hitTestable().last);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'first launch stays on login until valid OTP; logout removes pushed pages and back cannot reopen home',
    (tester) async {
      final store = MemoryStore(), requests = <String>[];
      final api = loginApi(store, requests);
      await tester.pumpWidget(SihhatApp(api: api, showDemoOtp: true));
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(requests, isEmpty);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, '+998901234567');
      await tapVisible(tester, 'Kod yuborish');
      expect(find.text('Demo SMS kodi: 135790'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, '000000');
      await tapVisible(tester, 'Tasdiqlash');
      expect(find.text('Kod xato'), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(store.data['access'], isNull);
      expect(requests.any((path) => path.startsWith('/catalog/')), false);
      await tapVisible(tester, 'Demo koddan foydalanish');
      await tapVisible(tester, 'Tasdiqlash');
      expect(find.byType(LoginScreen), findsNothing);
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(store.data['access'], 'verified-access');
      // Revocation while a detail route is open must remove the whole protected stack.
      Navigator.of(tester.element(find.byType(NavigationBar)))
          .push(MaterialPageRoute(builder: (_) => ArticleScreen(api, 'news')));
      await tester.pumpAndSettle();
      await api.logout();
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.byType(ArticleScreen), findsNothing);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'a saved valid session opens home without requesting another OTP',
    (tester) async {
      final store = MemoryStore()
        ..data.addAll({'access': 'saved-access', 'refresh': 'saved-refresh'});
      final requests = <String>[];
      final api = loginApi(store, requests);
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
      expect(requests.first, '/auth/me');
      expect(
        requests.any((path) => path.startsWith('/auth/customer/otp/')),
        false,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'normal builds hide demo codes even if a server sends the field',
    (tester) async {
      final api = loginApi(MemoryStore(), []);
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, '+998901234567');
      await tapVisible(tester, 'Kod yuborish');
      expect(find.textContaining('Demo SMS kodi:'), findsNothing);
      expect(find.text('Demo koddan foydalanish'), findsNothing);
      expect(find.byType(NavigationBar), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

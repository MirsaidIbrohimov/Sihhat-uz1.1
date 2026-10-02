import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/login.dart';

import 'api_test.dart' show MemoryStore;

void main() {
  testWidgets(
    'OTP screen validates phone, shows cooldown and persists mobile login',
    (tester) async {
      final store = MemoryStore();
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((request) async {
          final body = jsonDecode(request.body);
          if (request.url.path.endsWith('/request')) {
            expect(body['phone'], '+998901234567');
            return http.Response(
              '{"challenge_id":"challenge","resend_after":60}',
              201,
            );
          }
          expect(body['code'], '123456');
          return http.Response(
            '{"access_token":"access","refresh_token":"refresh","user":{"name":"Mijoz"}}',
            201,
          );
        }),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (c) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.push(
                  c,
                  MaterialPageRoute(builder: (_) => LoginScreen(api)),
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, '+998901234567');
      await tester.tap(find.text('Kod yuborish'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Qayta yuborish:'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, '123456');
      await tester.tap(find.text('Tasdiqlash'));
      await tester.pumpAndSettle();
      expect(await store.read('access'), 'access');
      expect(await store.read('refresh'), 'refresh');
      expect(find.text('Open'), findsOneWidget);
    },
  );
}

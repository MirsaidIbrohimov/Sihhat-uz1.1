import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/login.dart';
import 'package:sihhat_mobile/branding.dart';

import 'api_test.dart' show MemoryStore;

void main() {
  testWidgets(
    'email accepts valid email format and shows error for invalid format',
    (tester) async {
      var requests = 0;
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((request) async {
          requests++;
          expect(jsonDecode(request.body)['email'], 'test@example.com');
          return http.Response(
            '{"challenge_id":"challenge","resend_after":60}',
            201,
          );
        }),
      );
      await tester.pumpWidget(MaterialApp(home: LoginScreen(api)));
      await tester.pumpAndSettle();
      expect(find.byType(SihhatLogo), findsOneWidget);
      final input = find.byType(TextField);
      for (final value in ['', 'notanemail', 'test@', '@domain.com']) {
        await tester.enterText(input, value);
        await tester.tap(find.text('Tasdiqlash kodini yuborish'));
        await tester.pumpAndSettle();
        expect(
          find.text('To‘g‘ri elektron pochta manzilini kiriting (masalan, foydalanuvchi@mail.uz).'),
          findsOneWidget,
        );
        expect(requests, 0);
      }
      await tester.enterText(input, 'test@example.com');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tasdiqlash kodini yuborish'));
      await tester.pumpAndSettle();
      expect(requests, 1);
      expect(find.text('test@example.com'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'OTP screen validates email, shows cooldown and persists mobile login',
    (tester) async {
      final store = MemoryStore();
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((request) async {
          final body = jsonDecode(request.body);
          if (request.url.path.endsWith('/request')) {
            expect(body['email'], 'test@example.com');
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
      await tester.enterText(find.byType(TextField).first, 'test@example.com');
      await tester.tap(find.text('Tasdiqlash kodini yuborish'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Qayta yuborish:'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, '123456');
      await tester.tap(find.widgetWithText(FilledButton, 'Tasdiqlash'));
      await tester.pumpAndSettle();
      expect(await store.read('access'), 'access');
      expect(await store.read('refresh'), 'refresh');
      expect(find.text('Open'), findsOneWidget);
    },
  );
}

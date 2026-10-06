import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/account.dart';

import 'api_test.dart' show MemoryStore;

void main() {
  testWidgets('declining AI consent sends no message to the provider', (
    tester,
  ) async {
    var calls = 0;
    final api = Api(
      baseUrl: 'http://localhost',
      store: MemoryStore(),
      client: MockClient((_) async {
        calls++;
        return http.Response('{}', 200);
      }),
    );
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: AiScreen(api))));
    await tester.enterText(find.byType(TextField), 'Toshkentda dam olish');
    await tester.tap(find.byIcon(Icons.send_outlined));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Keyinroq'));
    await tester.pumpAndSettle();
    expect(calls, 0);
    expect(await api.store.read('ai_consent'), isNull);
    expect(find.textContaining('Gemini'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    api.client.close();
  });
  testWidgets('AI sends prior turns once and excludes response errors', (
    tester,
  ) async {
    final requests = <Json>[];
    final api = Api(
      baseUrl: 'http://localhost',
      store: MemoryStore(),
      client: MockClient((request) async {
        requests.add(asJson(jsonDecode(request.body)));
        if (requests.length == 2) {
          return http.Response.bytes(
            utf8.encode(
              jsonEncode({
                'code': 'NETWORK_ERROR',
                'message': 'Sinov: aloqa uzildi',
              }),
            ),
            503,
          );
        }
        return http.Response.bytes(
          utf8.encode(
            jsonEncode({
              'message': requests.length == 1
                  ? 'Salom! Qaysi hududga bormoqchisiz?'
                  : 'Bir kun uchun qancha byudjet ajratmoqchisiz?',
              'cards': [],
              'provider_status': 'conversation',
              'provider_message_shared': false,
            }),
          ),
          201,
        );
      }),
    );
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: AiScreen(api))));
    Future<void> send(String message) async {
      await tester.enterText(find.byType(TextField), message);
      await tester.tap(find.byIcon(Icons.send_outlined));
      await tester.pumpAndSettle();
      if (find.text('Davom etish').evaluate().isNotEmpty) {
        await tester.tap(find.text('Davom etish'));
        await tester.pumpAndSettle();
      }
    }

    await send('Salom');
    expect(requests.first['history'], isEmpty);
    await send('Toshkent');
    await send('Toshkent');
    final history = requests.last['history'] as List;
    expect(history.where((t) => t['message'] == 'Salom').length, 1);
    expect(history.where((t) => t['role'] == 'assistant').length, 1);
    expect(history.any((t) => t['message'] == 'Sinov: aloqa uzildi'), false);
    expect(
      history.every(
        (t) => (t as Map).keys.toSet().containsAll(['role', 'message']),
      ),
      true,
    );
    expect(requests.last['share_with_provider'], true);
    expect(find.textContaining('Gemini'), findsNothing);
    expect(find.byType(CheckboxListTile), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    api.client.close();
  });
}

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/account.dart';

import 'api_test.dart' show MemoryStore;

http.Response reply(Object body) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

void main() {
  testWidgets(
    'bot replies appear automatically in an open help thread and stay visible during an outage',
    (tester) async {
      final messages = <Json>[
        {'userId': 'customer', 'text': 'Mening savolim'},
      ];
      var offline = false;
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((_) async {
          if (offline) throw http.ClientException('offline');
          return reply({
            'id': 'ticket',
            'userId': 'customer',
            'title': 'Yordam',
            'status': 'OPEN',
            'messages': messages,
          });
        }),
      );
      await tester.pumpWidget(MaterialApp(home: SupportThread(api, 'ticket')));
      await tester.pumpAndSettle();
      messages.add({'userId': 'admin', 'text': 'Bot orqali javob'});
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.text('Bot orqali javob'), findsOneWidget);
      expect(find.text('Yordam xizmati'), findsOneWidget);
      offline = true;
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.text('Bot orqali javob'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
  test('simultaneous identical support mutations share one request and one idempotency key', () async {
    var count = 0;
    final response = Completer<http.Response>();
    final api = Api(
      baseUrl: 'http://localhost',
      store: MemoryStore(),
      client: MockClient((request) {
        count++;
        expect(request.headers['Idempotency-Key'], isNotEmpty);
        return response.future;
      }),
    );
    final one = api.send(
      '/support/tickets',
      method: 'POST',
      body: {'title': 'Yordam', 'text': 'Xabar'},
    );
    final two = api.send(
      '/support/tickets',
      method: 'POST',
      body: {'title': 'Yordam', 'text': 'Xabar'},
    );
    await Future<void>.delayed(Duration.zero);
    expect(count, 1);
    response.complete(reply({'id': 'ticket'}));
    expect(await one, await two);
    api.client.close();
  });

  testWidgets(
    'sending stays disabled across keyboard changes; form closes before thread opens and reply appears once',
    (tester) async {
      var created = 0, sent = 0;
      final response = Completer<http.Response>();
      final messages = <Json>[
        {'text': 'Birinchi xabar'},
      ];
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((r) async {
          if (r.method == 'POST' && r.url.path == '/support/tickets') {
            created++;
            return response.future;
          }
          if (r.method == 'POST' && r.url.path.endsWith('/messages')) {
            sent++;
            messages.add({'text': jsonDecode(r.body)['text']});
            return reply({'id': 'reply'});
          }
          if (r.url.path == '/support/tickets/ticket') {
            return reply({
              'id': 'ticket',
              'title': 'Murojaat',
              'status': 'OPEN',
              'messages': messages,
            });
          }
          return reply([]);
        }),
      );
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpWidget(MaterialApp(home: SupportScreen(api)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yangi murojaat').last);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Birinchi xabar');
      await tester.tap(find.text('Murojaat yuborish'));
      await tester.pump();
      tester.view.viewInsets = FakeViewPadding(bottom: 180);
      await tester.pump();
      expect(find.text('Yuborilmoqda…'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Yuborilmoqda…'),
            )
            .onPressed,
        isNull,
      );
      expect(created, 1);
      tester.view.resetViewInsets();
      response.complete(reply({'id': 'ticket'}));
      await tester.pumpAndSettle();
      expect(find.byType(SupportThread), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.text('Birinchi xabar'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Ikkinchi xabar');
      await tester.tap(find.byTooltip('Yuborish'));
      await tester.pumpAndSettle();
      expect(sent, 1);
      expect(find.text('Ikkinchi xabar'), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'support inbox separates Ochiq and Yopilgan folders, and Telegram thread supports editing & deleting own messages',
    (tester) async {
      final messages = <Json>[
        {
          'id': 'm-user-1',
          'userId': 'customer',
          'isMe': true,
          'text': 'Salom, savolim bor',
          'isEdited': false,
          'createdAt': DateTime.now().toUtc().toIso8601String(),
        },
        {
          'id': 'm-admin-1',
          'userId': 'admin',
          'isMe': false,
          'text': 'Albatta, eshitaman',
          'isEdited': false,
          'createdAt': DateTime.now().toUtc().toIso8601String(),
        },
      ];
      String? patchedText;
      final deletedIds = <String>[];
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((r) async {
          if (r.method == 'GET' && r.url.path == '/support/tickets') {
            return reply([
              {
                'id': 't-open',
                'title': 'Ochiq murojaat mavzusi',
                'status': 'OPEN',
                'createdAt': '2026-11-11T10:00:00.000Z',
              },
              {
                'id': 't-closed',
                'title': 'Arxivlangan murojaat',
                'status': 'CLOSED',
                'createdAt': '2026-11-10T10:00:00.000Z',
              },
            ]);
          }
          if (r.method == 'GET' && r.url.path == '/support/tickets/t-open') {
            return reply({
              'id': 't-open',
              'userId': 'customer',
              'title': 'Ochiq murojaat mavzusi',
              'status': 'OPEN',
              'messages': messages,
            });
          }
          if (r.method == 'PATCH' &&
              r.url.path == '/support/tickets/t-open/messages/m-user-1') {
            final body = jsonDecode(r.body) as Map<String, dynamic>;
            patchedText = body['text'] as String?;
            messages[0]['text'] = patchedText;
            messages[0]['isEdited'] = true;
            return reply(messages[0]);
          }
          if (r.method == 'DELETE' &&
              r.url.path == '/support/tickets/t-open/messages/m-user-1') {
            deletedIds.add('m-user-1');
            messages.removeWhere((m) => m['id'] == 'm-user-1');
            return reply({
              'success': true,
              'messageId': 'm-user-1',
              'deleted': false,
            });
          }
          return reply({});
        }),
      );

      // 1. Folder tabs: Ochiq shown first, Yopilgan shows closed tickets.
      await tester.pumpWidget(MaterialApp(home: SupportScreen(api)));
      await tester.pumpAndSettle();
      expect(find.text('Ochiq murojaat mavzusi'), findsOneWidget);
      expect(find.text('Arxivlangan murojaat'), findsNothing);

      await tester.tap(find.text('Yopilgan'));
      await tester.pumpAndSettle();
      expect(find.text('Arxivlangan murojaat'), findsOneWidget);
      expect(find.text('Ochiq murojaat mavzusi'), findsNothing);

      await tester.tap(find.text('Ochiq'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ochiq murojaat mavzusi'));
      await tester.pumpAndSettle();

      // 2. Edit own message via Telegram bubble menu -> PATCH request -> "tahrirlangan" label.
      await tester.tap(find.text('Salom, savolim bor'));
      await tester.pumpAndSettle();
      expect(find.text('Tahrirlash'), findsOneWidget);
      expect(find.text('O‘chirish'), findsOneWidget);
      await tester.tap(find.text('Tahrirlash'));
      await tester.pumpAndSettle();

      expect(find.text('Xabarni tahrirlash'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Tuzatilgan savolim');
      await tester.tap(find.byTooltip('Yuborish'));
      await tester.pumpAndSettle();

      expect(patchedText, 'Tuzatilgan savolim');
      expect(find.text('Tuzatilgan savolim'), findsOneWidget);
      expect(find.text('tahrirlangan'), findsOneWidget);

      // 3. Incoming admin message cannot be edited/deleted by customer.
      await tester.longPress(find.text('Albatta, eshitaman'));
      await tester.pumpAndSettle();
      expect(find.text('Tahrirlash'), findsNothing);
      expect(find.text('Nusxa olish'), findsOneWidget);
      Navigator.of(tester.element(find.text('Nusxa olish'))).pop();
      await tester.pumpAndSettle();

      // 4. Delete own message -> DELETE request -> removed from APK thread while admin message stays.
      await tester.tap(find.text('Tuzatilgan savolim'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('O‘chirish'));
      await tester.pumpAndSettle();
      expect(find.text('Xabarni o‘chirish'), findsOneWidget);
      await tester.tap(find.widgetWithText(TextButton, 'O‘chirish'));
      await tester.pumpAndSettle();

      expect(deletedIds, ['m-user-1']);
      expect(find.text('Tuzatilgan savolim'), findsNothing);
      expect(find.text('Albatta, eshitaman'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

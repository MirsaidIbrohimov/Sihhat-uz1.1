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
    'sending stays disabled across keyboard changes; dialog closes before thread opens and reply appears once',
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
      await tester.tap(find.text('Murojaat'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Birinchi xabar');
      await tester.tap(find.text('Yuborish'));
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
      await tester.tap(find.text('Javob yozish'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Ikkinchi xabar');
      await tester.tap(find.text('Yuborish'));
      await tester.pumpAndSettle();
      expect(sent, 1);
      expect(find.text('Ikkinchi xabar'), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

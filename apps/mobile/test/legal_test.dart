import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/account.dart';
import 'package:sihhat_mobile/screens/legal.dart';
import 'package:sihhat_mobile/screens/login.dart';

import 'api_test.dart' show MemoryStore;

void main() {
  test('legalPolicyDocs define complete structured Uzbek rules', () {
    expect(RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(userTermsVersion), isTrue);
    expect(legalPolicyDocs.length, 4);
    for (final doc in legalPolicyDocs) {
      expect(doc.title.trim(), isNotEmpty);
      expect(doc.sections.length, greaterThanOrEqualTo(5));
      for (final rule in doc.sections) {
        expect(rule.title.trim(), isNotEmpty);
        expect(rule.summary.trim(), isNotEmpty);
        expect(rule.items, isNotEmpty);
        expect(rule.summary.contains('`'), isFalse);
        for (final item in rule.items) {
          expect(item.contains('`'), isFalse);
        }
      }
    }
  });

  testWidgets('LegalTermsScreen switches between all four policy tabs', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: LegalTermsScreen()));
    await tester.pumpAndSettle();

    expect(
      find.text('Ommaviy oferta (Foydalanuvchi shartnomasi)'),
      findsOneWidget,
    );
    final verticalScrollable = find.byWidgetPredicate(
      (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
    );
    await tester.scrollUntilVisible(
      find.textContaining('5 daqiqa (HOLD)'),
      250,
      scrollable: verticalScrollable,
    );
    expect(find.textContaining('5 daqiqa (HOLD)'), findsOneWidget);

    await tester.ensureVisible(find.text('Maxfiylik siyosati'));
    await tester.tap(find.text('Maxfiylik siyosati'));
    await tester.pumpAndSettle();
    expect(
      find.text('1. Huquqiy asos va ma’lumotlarni himoyalash tamoyili'),
      findsOneWidget,
    );

    await tester.ensureVisible(find.text('Qaytarish shartlari'));
    await tester.tap(find.text('Qaytarish shartlari'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('14:00 (Toshkent vaqti, UTC+5)'),
      findsOneWidget,
    );

    await tester.ensureVisible(find.text('AI va Chat nizomi'));
    await tester.tap(find.text('AI va Chat nizomi'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.textContaining('soatiga 30 tagacha'),
      250,
      scrollable: verticalScrollable,
    );
    expect(find.textContaining('soatiga 30 tagacha'), findsOneWidget);
  });

  testWidgets(
    'ProfileScreen and LoginScreen navigate cleanly to LegalTermsScreen',
    (tester) async {
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((_) async => http.Response('{}', 200)),
      );

      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: ProfileScreen(api, () {}))),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Foydalanuvchi shartlari va nizomlar'));
      await tester.pumpAndSettle();
      expect(find.text('Shartlar va nizomlar'), findsOneWidget);

      await tester.pumpWidget(MaterialApp(home: LoginScreen(api)));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Ommaviy oferta'));
      await tester.tap(find.text('Ommaviy oferta'));
      await tester.pumpAndSettle();
      expect(
        find.text('Ommaviy oferta (Foydalanuvchi shartnomasi)'),
        findsOneWidget,
      );
    },
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/design.dart';
import 'package:sihhat_mobile/screens/booking.dart';
import 'package:sihhat_mobile/widgets.dart';

Widget host(Widget child) => MaterialApp(
  theme: sihhatTheme(brightness: Brightness.dark),
  home: Scaffold(body: child),
);

void main() {
  testWidgets('offline errors explain the cause and retry works', (
    tester,
  ) async {
    var retried = 0;
    await tester.pumpWidget(
      host(
        ErrorView(
          const ApiException('NETWORK_ERROR', 'Serverga ulanib bo‘lmadi.'),
          retry: () => retried++,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Internet aloqasi yo‘q'), findsOneWidget);
    expect(find.text('Serverga ulanib bo‘lmadi.'), findsOneWidget);
    await tester.tap(find.text('Qayta urinish'));
    expect(retried, 1);
  });

  testWidgets('inline form errors stay compact without a retry button', (
    tester,
  ) async {
    await tester.pumpWidget(host(const ErrorView('Kod xato')));
    await tester.pumpAndSettle();
    expect(find.text('Kod xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsNothing);
    expect(find.text('Nimadir xato ketdi'), findsNothing);
  });

  testWidgets('empty state action is a working button', (tester) async {
    var opened = false;
    await tester.pumpWidget(
      host(
        EmptyView(
          'Hozircha bronlaringiz yo‘q.',
          actionLabel: 'Sanatoriya tanlash',
          onAction: () => opened = true,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sanatoriya tanlash'));
    expect(opened, isTrue);
  });

  testWidgets('loading skeleton fits a small screen without overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 480);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(host(const Busy()));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Yuklanmoqda'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('confirmed booking ticket shows reference, total and QR', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: sihhatTheme(brightness: Brightness.dark),
        home: const BookingDocumentScreen(
          {
            'id': 'b1',
            'reference': 'SH-TEST123',
            'status': 'CONFIRMED',
            'checkIn': '2026-11-07T00:00:00.000Z',
            'checkOut': '2026-11-09T00:00:00.000Z',
            'amount': '1000000',
            'guest': {'name': 'Mehmon'},
            'items': [],
          },
          place: {'name': 'Zomin Sanatoriyasi', 'region': 'Jizzax'},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('SH-TEST123'), findsOneWidget);
    expect(find.text('Zomin Sanatoriyasi'), findsOneWidget);
    expect(find.byType(QrImageView), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Vaucher ma’lumotlarini nusxalash'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Vaucher ma’lumotlarini nusxalash'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

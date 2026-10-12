import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sihhat_mobile/booking_dates.dart';
import 'package:sihhat_mobile/concept_ui.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/data/catalog_cache.dart';
import 'package:sihhat_mobile/design.dart';

import 'api_test.dart' show MemoryStore;

void main() {
  test('price range and all selected amenities filter the complete offline catalogue before pagination', () async {
    final api = Api(baseUrl: 'http://localhost', store: MemoryStore());
    final cache = CatalogCache(api);
    cache.items = List.generate(
      140,
      (i) => <String, dynamic>{
        'id': '$i',
        'name': 'Sanatoriya ${i.toString().padLeft(3, '0')}',
        'region': 'Toshkent',
        'amenities': ['Wi-Fi', if (i.isEven) 'Hovuz'],
        'from_amount': '${i * 10000}',
      },
    );
    final result = cache.search(
      minPrice: '10000',
      maxPrice: '13900',
      selectedAmenities: {'Wi-Fi', 'Hovuz'},
    );
    expect(result['total'], 20);
    expect(rows(result).first['id'], '100');
    expect(rows(result).last['id'], '138');
    expect(cache.search(maxPrice: '0')['total'], 1);
    expect(cache.search(selectedAmenities: {'Mavjud emas'})['total'], 0);
    api.client.close();
  });

  testWidgets(
    'OTP supports paste, filters non-digits and sends through one editable field',
    (tester) async {
      final controller = TextEditingController();
      var submissions = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: sihhatTheme(),
          home: ConceptPage(
            title: 'SMS',
            body: Padding(
              padding: const EdgeInsets.all(20),
              child: OtpField(
                controller: controller,
                submitted: () => submissions++,
              ),
            ),
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), '12a345678');
      await tester.pump();
      expect(controller.text, '123456');
      expect(find.byType(TextField), findsOneWidget);
      await tester.testTextInput.receiveAction(TextInputAction.done);
      expect(submissions, 1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  testWidgets(
    'calendar requires a later checkout date and returns the selected range',
    (tester) async {
      final now = DateTime.now(),
          api = Api(baseUrl: 'http://localhost', store: MemoryStore());
      final start = DateTime(now.year, now.month, now.day + 1),
          end = DateTime(now.year, now.month, now.day + 3);
      DateTimeRange? result;
      await tester.pumpWidget(
        MaterialApp(
          theme: sihhatTheme(),
          home: Builder(
            builder: (c) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  result = await Navigator.push<DateTimeRange>(
                    c,
                    MaterialPageRoute(
                      builder: (_) => BookingDateScreen(api, {
                        'name': 'Sinov sanatoriyasi',
                      }, DateTimeRange(start: start, end: end)),
                    ),
                  );
                },
                child: const Text('Sana'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Sana'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(ValueKey('booking-day-${dateOnly(start)}')));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Sanani tanlash'),
            )
            .onPressed,
        isNull,
      );
      // Move the calendar if the chosen checkout lies in the following month.
      if (end.month != start.month) {
        await tester.tap(find.byTooltip('Keyingi oy'));
        await tester.pumpAndSettle();
      }
      await tester.tap(find.byKey(ValueKey('booking-day-${dateOnly(end)}')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sanani tanlash'));
      await tester.pumpAndSettle();
      expect(result, DateTimeRange(start: start, end: end));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

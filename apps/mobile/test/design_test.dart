import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/design.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/catalog.dart';

import 'api_test.dart' show MemoryStore;
import 'home_test.dart' show home, item;

http.Response reply(Object value) => http.Response.bytes(
  utf8.encode(jsonEncode(value)),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
Api publicApi() => Api(
  baseUrl: 'http://localhost',
  store: MemoryStore()
    ..data.addAll({'access': 'saved-access', 'refresh': 'saved-refresh'}),
  client: MockClient((request) async {
    if (request.url.path == '/catalog/home') return reply(home());
    return reply({
      'data': [if (request.url.path == '/catalog/sanatoriums') item],
      'pages': 1,
    });
  }),
);

void main() {
  testWidgets(
    'small screen and large type retain search and all navigation without overflow',
    (tester) async {
      tester.view.physicalSize = const Size(320, 720);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final api = publicApi();
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      expect(find.byType(NavigationDestination), findsNWidgets(5));
      expect(tester.takeException(), isNull);
      expect(find.text('Sihhat uz'), findsOneWidget);
      await tester.tap(find.text('Sanatoriyalar'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(TextField).first);
      await tester.pumpAndSettle();
      expect(FocusManager.instance.primaryFocus, isNotNull);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets('filter sheet scrolls above keyboard and reports invalid price', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetViewInsets);
    final api = publicApi();
    await tester.pumpWidget(SihhatApp(api: api));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sanatoriyalar'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Filtrlar'));
    await tester.pumpAndSettle();
    final price = find.widgetWithText(TextField, 'Eng ko‘p kunlik narx (so‘m)');
    await tester.ensureVisible(price);
    await tester.enterText(price, 'abc');
    tester.view.viewInsets = FakeViewPadding(bottom: 280);
    await tester.pumpAndSettle();
    final button = find.text('Natijalarni ko‘rish');
    await tester.ensureVisible(button);
    await tester.tap(button);
    await tester.pumpAndSettle();
    expect(find.text('Narxni raqam bilan kiriting.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    tester.view.resetViewInsets();
    await tester.pumpWidget(const SizedBox.shrink());
    api.client.close();
  });

  testWidgets(
    'sanatorium booking action stays visible before scrolling long details',
    (tester) async {
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient(
          (_) async => reply({
            ...item,
            'photo_ids': [],
            'address': 'Chimyon',
            'description': 'Dam olish haqida. ' * 90,
            'services': ['Yashash'],
            'meals': 'Uch mahal',
            'child_rules': 'Sanatoriya bilan aniqlang',
            'medical_requirements': 'Kelishdan oldin tekshiring',
            'required_documents': 'Shaxsni tasdiqlovchi hujjat',
            'check_in_time': '14:00',
            'check_out_time': '12:00',
            'latitude': 41,
            'longitude': 69,
            'contact_phone': '+998901234567',
            'online_booking_available': true,
            'rate_plans': [
              {
                'id': 'rate',
                'name': 'Standart',
                'baseAmount': '45000000',
                'mode': 'ROOM',
                'policy': {'name': 'Kelishgacha qaytarish'},
              },
            ],
            'reviews': [],
          }),
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: sihhatTheme(),
          home: SanatoriumScreen(api, 'sanatorium'),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Sana va xonalarni tanlash').hitTestable(),
        findsOneWidget,
      );
      final initial = tester.getTopLeft(find.byType(ActionDock));
      await tester.drag(find.byType(ListView), const Offset(0, -450));
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(find.byType(ActionDock)), initial);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

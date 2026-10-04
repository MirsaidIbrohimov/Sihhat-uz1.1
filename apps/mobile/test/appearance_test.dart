import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/appearance.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/screens/login.dart';
import 'package:http/testing.dart';

import 'api_test.dart' show MemoryStore;
import 'design_test.dart' show reply;
import 'home_test.dart' show home, item;

class FailingStore extends MemoryStore {
  @override
  Future<String?> read(String key) async => throw StateError('read failed');
  @override
  Future<void> write(String key, String? value) async =>
      throw StateError('write failed');
}

Api publicApi(MemoryStore store) => Api(
  baseUrl: 'http://localhost',
  store: store,
  client: MockClient(
    (request) async => request.url.path == '/catalog/home'
        ? reply(home())
        : reply({
            'data': [if (request.url.path == '/catalog/sanatoriums') item],
            'pages': 1,
          }),
  ),
);

Future<void> selectMode(WidgetTester tester, String label) async {
  await tester.tap(find.byTooltip('Ko‘rinish rejimi'));
  await tester.pumpAndSettle();
  await tester.tap(find.widgetWithText(CheckedPopupMenuItem<ThemeMode>, label));
  await tester.pumpAndSettle();
}

Brightness brightness(WidgetTester tester) =>
    Theme.of(tester.element(find.byType(NavigationBar))).brightness;

void main() {
  testWidgets(
    'night mode survives app restart and logout while profile navigation stays open',
    (tester) async {
      final store = MemoryStore();
      final appApi = publicApi(store);
      await tester.pumpWidget(SihhatApp(api: appApi));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Profil').last);
      await tester.pumpAndSettle();
      expect(find.text('Ilova ko‘rinishi'), findsOneWidget);
      await selectMode(tester, 'Tungi rejim');
      expect(brightness(tester), Brightness.dark);
      expect(store.data['appearance'], 'dark');
      expect(find.text('Ilova ko‘rinishi'), findsOneWidget);
      await appApi.clear();
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(SihhatApp(api: appApi));
      await tester.pumpAndSettle();
      expect(brightness(tester), Brightness.dark);
      await tester.pumpWidget(const SizedBox.shrink());
      appApi.client.close();
    },
  );

  testWidgets(
    'system mode follows phone brightness and explicit day mode overrides it',
    (tester) async {
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      final api = publicApi(MemoryStore());
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      expect(brightness(tester), Brightness.dark);
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      await tester.pumpAndSettle();
      expect(brightness(tester), Brightness.light);
      await selectMode(tester, 'Kunduzgi rejim');
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      await tester.pumpAndSettle();
      expect(brightness(tester), Brightness.light);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'night theme applies to pushed login route and fits a small screen with large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 720);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final store = MemoryStore()..data['appearance'] = 'dark';
      final api = publicApi(store);
      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Profil').last);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Telefon orqali kirish'));
      await tester.tap(find.text('Telefon orqali kirish'));
      await tester.pumpAndSettle();
      expect(
        Theme.of(tester.element(find.byType(LoginScreen))).brightness,
        Brightness.dark,
      );
      expect(find.bySemanticsLabel('Sihhat uz logosi'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await selectMode(tester, 'Kunduzgi rejim');
      expect(
        Theme.of(tester.element(find.byType(LoginScreen))).brightness,
        Brightness.light,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  test('invalid preference and storage errors keep startup usable; failed save preserves the previous mode', () async {
    final invalid = AppearanceController(
      MemoryStore()..data['appearance'] = 'unknown',
    );
    await invalid.load();
    expect(invalid.loaded, true);
    expect(invalid.mode, ThemeMode.system);
    invalid.dispose();
    final controller = AppearanceController(FailingStore());
    await controller.load();
    expect(controller.loaded, true);
    await expectLater(controller.select(ThemeMode.dark), throwsStateError);
    expect(controller.mode, ThemeMode.system);
    expect(controller.saving, false);
    controller.dispose();
  });
}

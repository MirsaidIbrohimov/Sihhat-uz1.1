import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/app.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/data/app_update.dart';

import 'api_test.dart' show MemoryStore;
import 'home_test.dart' show home;

http.Response jsonReply(Object body) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

void main() {
  const channel = MethodChannel('uz.sihhat/notifications');

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
    Api.appBuildHeader = null;
    Api.appVersionHeader = null;
  });

  test('AppUpdateInfo.fromResponse filters equal/older, malformed, and non-https urls', () {
    expect(AppUpdateInfo.fromResponse({'data': [], 'pages': 1}, 8), isNull);
    expect(
      AppUpdateInfo.fromResponse({
        'available': true,
        'version': '0.2.5',
        'build_number': 8,
        'download_url': 'https://www.sihhat.uz/api/download/apk',
      }, 8),
      isNull,
    );
    expect(
      AppUpdateInfo.fromResponse({
        'available': true,
        'version': '0.2.6',
        'build_number': 9,
        'download_url': 'http://insecure.example/sihhat.apk',
      }, 8),
      isNull,
    );
    final parsed = AppUpdateInfo.fromResponse({
      'available': true,
      'version': '0.2.6',
      'build_number': 9,
      'download_url': 'https://www.sihhat.uz/api/download/apk',
      'title': 'Ilova yangilandi (v0.2.6)',
      'message': 'Eng so‘nggi versiyani yuklab oling.',
    }, 8);
    expect(parsed, isNotNull);
    expect(parsed!.version, '0.2.6');
    expect(parsed.buildNumber, 9);
  });

  test(
    'AppUpdateService.checkForUpdate reads native version and sets app headers',
    () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            if (call.method == 'getAppVersion') {
              return {'versionName': '0.2.5', 'buildNumber': 8};
            }
            return true;
          });

      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((req) async {
          expect(req.url.path, '/mobile/app-version');
          expect(req.url.queryParameters['build'], '8');
          return jsonReply({
            'available': true,
            'version': '0.2.6',
            'build_number': 9,
            'download_url': 'https://www.sihhat.uz/api/download/apk',
          });
        }),
      );

      final res = await AppUpdateService.checkForUpdate(api);
      expect(res.installed?.version, '0.2.5');
      expect(res.installed?.buildNumber, 8);
      expect(res.update?.buildNumber, 9);
      expect(Api.appBuildHeader, '8');
      expect(Api.appVersionHeader, '0.2.5');
      api.client.close();
    },
  );

  testWidgets(
    'old app build shows update dialog and keeps home update banner after dismiss',
    (tester) async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            if (call.method == 'getAppVersion') {
              return {'versionName': '0.2.5', 'buildNumber': 8};
            }
            return true;
          });

      final requested = <String>[];
      final store = MemoryStore()
        ..data.addAll({'access': 'saved-access', 'refresh': 'saved-refresh'});
      final api = Api(
        baseUrl: 'http://localhost',
        store: store,
        client: MockClient((req) async {
          requested.add('${req.method} ${req.url.path}');
          if (req.url.path == '/auth/me') {
            return jsonReply({'id': 'customer', 'name': 'Mijoz'});
          }
          if (req.url.path == '/mobile/app-version') {
            return jsonReply({
              'available': true,
              'version': '0.2.6',
              'build_number': 9,
              'download_url': 'https://www.sihhat.uz/api/download/apk',
              'title': 'Ilova yangilandi (v0.2.6)',
              'message': 'Eng so‘nggi versiyani yuklab oling.',
              'release_notes': 'Tezkor xabarlar va tuzatishlar.',
            });
          }
          if (req.url.path == '/catalog/home') return jsonReply(home());
          if (req.url.path == '/catalog/ads') return jsonReply([]);
          return jsonReply({'data': [], 'pages': 1});
        }),
      );

      await tester.pumpWidget(SihhatApp(api: api));
      await tester.pumpAndSettle();

      expect(requested, contains('GET /mobile/app-version'));
      expect(find.text('Ilova yangilandi (v0.2.6)'), findsOneWidget);
      expect(find.text('Eng so‘nggi versiyani yuklash'), findsOneWidget);

      await tester.tap(find.text('Keyinroq'));
      await tester.pumpAndSettle();

      expect(store.data['update_dismissed_build'], '9');
      expect(find.text('Yangi versiya chiqdi (v0.2.6)'), findsOneWidget);
      expect(find.text('Yuklash'), findsOneWidget);

      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/data/push_notifications.dart';

import 'api_test.dart' show MemoryStore;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('uz.sihhat/notifications');

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('NotificationRouteTarget parses booking, support, update, and fallback routes', () {
    final booking = NotificationRouteTarget.fromMap({
      'topic': 'booking.confirmed',
      'booking_id': 'b-123',
    });
    expect(booking?.route, 'booking');
    expect(booking?.bookingId, 'b-123');

    final support = NotificationRouteTarget.fromMap({
      'topic': 'support.replied',
      'ticket_id': 't-456',
    });
    expect(support?.route, 'support');
    expect(support?.ticketId, 't-456');

    final update = NotificationRouteTarget.fromMap({
      'topic': 'app.update',
      'download_url': 'https://www.sihhat.uz/api/download/apk',
    });
    expect(update?.route, 'update');
    expect(update?.downloadUrl, 'https://www.sihhat.uz/api/download/apk');

    final announcement = NotificationRouteTarget.fromMap({
      'topic': 'message.created',
      'message_id': 'm-789',
    });
    expect(announcement?.route, 'notifications');
    expect(announcement?.messageId, 'm-789');
  });

  test('PushNotificationService syncs credentials, registers FCM token, handles refresh & logout detach', () async {
    final nativeCalls = <String, dynamic>{};
    final requests = <(String, String, Map<String, dynamic>)>[];
    String currentToken = 'fcm_token_initial_device_1234567890';

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          nativeCalls[call.method] = call.arguments;
          switch (call.method) {
            case 'getNotificationPermissionStatus':
              return {'granted': false, 'sdkInt': 34};
            case 'requestNotificationPermission':
              return true;
            case 'getFcmToken':
              return currentToken;
            case 'getFcmStatus':
              return {
                'firebaseConfigured': true,
                'token': currentToken,
                'deviceId': 'dev-uuid-1',
                'deviceLabel': 'Samsung SM-A165F',
                'appVersion': '0.2.9+12',
              };
            case 'getSyncedCredentials':
              return {
                'updated': true,
                'accessToken': 'rotated-access',
                'refreshToken': 'rotated-refresh',
              };
            default:
              return true;
          }
        });

    final store = MemoryStore();
    final api = Api(
      baseUrl: 'http://localhost',
      store: store,
      client: MockClient((req) async {
        final body = req.body.isEmpty
            ? <String, dynamic>{}
            : Map<String, dynamic>.from(jsonDecode(req.body) as Map);
        requests.add((req.method, req.url.path, body));
        return http.Response(
          jsonEncode({'success': true, 'registered': true}),
          200,
        );
      }),
    );

    final push = PushNotificationService(api, enabled: true);
    api.beforeLogout = push.detachDeviceOnLogout;

    await api.tokens({
      'access_token': 'acc-1',
      'refresh_token': 'ref-1',
      'user': {'id': 'user-1', 'name': 'Test'},
    });

    // Request Android 13+ permission
    final granted = await push.requestPermissionIfNeeded();
    expect(granted, isTrue);

    // Sync credentials (passes refreshToken too) + auto-registers FCM token
    await push.syncSessionCredentials();
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(nativeCalls['syncCredentials']['refreshToken'], 'ref-1');
    expect(
      requests.any(
        (r) =>
            r.$1 == 'POST' &&
            r.$2 == '/notifications/device-token' &&
            r.$3['token'] == currentToken &&
            r.$3['device_id'] == 'dev-uuid-1',
      ),
      isTrue,
    );

    // Adopt tokens rotated natively in background
    final adopted = await push.adoptNativeRotatedTokensIfAny();
    expect(adopted, isTrue);
    expect(api.accessToken, 'rotated-access');
    expect(api.refreshToken, 'rotated-refresh');
    expect(await store.read('refresh'), 'rotated-refresh');

    // Logout detaches token cleanly
    await api.logout();
    expect(
      requests.any(
        (r) =>
            r.$1 == 'POST' &&
            r.$2 == '/notifications/device-token/unregister' &&
            r.$3['token'] == currentToken,
      ),
      isTrue,
    );
    expect(
      requests.any(
        (r) =>
            r.$1 == 'POST' &&
            r.$2 == '/auth/logout' &&
            r.$3['push_token'] == currentToken &&
            r.$3['device_id'] == 'dev-uuid-1',
      ),
      isTrue,
    );

    push.dispose();
    api.client.close();
  });
}

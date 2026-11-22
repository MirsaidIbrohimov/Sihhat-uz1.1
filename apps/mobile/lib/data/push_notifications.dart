import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';

import 'api.dart';
import 'app_update.dart';

class NotificationRouteTarget {
  final String route;
  final String? topic;
  final String? bookingId;
  final String? ticketId;
  final String? messageId;
  final String? notificationId;
  final String? downloadUrl;

  const NotificationRouteTarget({
    required this.route,
    this.topic,
    this.bookingId,
    this.ticketId,
    this.messageId,
    this.notificationId,
    this.downloadUrl,
  });

  static NotificationRouteTarget? fromMap(dynamic raw) {
    if (raw is! Map) return null;
    String? readStr(String key) {
      final value = raw[key]?.toString().trim();
      return (value == null || value.isEmpty || value == 'null') ? null : value;
    }

    final topic = readStr('topic');
    final bookingId = readStr('booking_id');
    final ticketId = readStr('ticket_id');
    final messageId = readStr('message_id');
    final notificationId = readStr('notification_id');
    final downloadUrl = readStr('download_url');
    final explicitRoute = readStr('route');

    final route =
        explicitRoute ??
        (topic == 'app.update' &&
                downloadUrl != null &&
                downloadUrl.startsWith('https://')
            ? 'update'
            : ticketId != null
            ? 'support'
            : bookingId != null
            ? 'booking'
            : 'notifications');

    return NotificationRouteTarget(
      route: route,
      topic: topic,
      bookingId: bookingId,
      ticketId: ticketId,
      messageId: messageId,
      notificationId: notificationId,
      downloadUrl: downloadUrl,
    );
  }
}

class PushNotificationService {
  static const MethodChannel _channel = MethodChannel(
    'uz.sihhat/notifications',
  );

  final Api api;
  final bool enabled;
  final StreamController<NotificationRouteTarget> _taps =
      StreamController<NotificationRouteTarget>.broadcast();
  final StreamController<Json> _messages = StreamController<Json>.broadcast();

  String? _lastFcmToken;
  String? _deviceId;
  String? _deviceLabel;
  String? _appVersion;
  String? _lastRegisteredSignature;
  bool _permissionAskedThisSession = false;
  bool _disposed = false;

  PushNotificationService(this.api, {bool? enabled})
    : enabled = enabled ?? Platform.isAndroid {
    if (this.enabled) {
      _channel.setMethodCallHandler(_handleNativeCall);
    }
  }

  Stream<NotificationRouteTarget> get onNotificationTap => _taps.stream;
  Stream<Json> get onPushMessage => _messages.stream;

  Future<dynamic> _handleNativeCall(MethodCall call) async {
    if (_disposed) return null;
    switch (call.method) {
      case 'onFcmTokenRefresh':
        final token = call.arguments is String
            ? (call.arguments as String).trim()
            : null;
        if (token != null && token.length >= 16) {
          _lastFcmToken = token;
          _lastRegisteredSignature = null;
          if (api.signedIn) {
            unawaited(registerDeviceToken(explicitToken: token));
          }
        }
        return true;
      case 'onPushMessage':
        if (call.arguments is Map) {
          _messages.add(Map<String, dynamic>.from(call.arguments as Map));
        }
        return true;
      case 'onNotificationTap':
        final target = NotificationRouteTarget.fromMap(call.arguments);
        if (target != null) {
          _taps.add(target);
        }
        return true;
      default:
        return null;
    }
  }

  Future<bool> adoptNativeRotatedTokensIfAny() async {
    if (!enabled) return false;
    try {
      final raw = await _channel.invokeMethod<dynamic>('getSyncedCredentials');
      if (raw is! Map) return false;
      if (raw['updated'] != true) return false;
      final access = raw['accessToken']?.toString().trim();
      final refresh = raw['refreshToken']?.toString().trim();
      if (access != null &&
          access.isNotEmpty &&
          refresh != null &&
          refresh.isNotEmpty) {
        await api.adoptRotatedTokens(access, refresh);
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<void> syncSessionCredentials() async {
    await AppUpdateService.syncNativeConfig(api.baseUrl);
    try {
      if (api.signedIn && api.accessToken != null) {
        await _channel.invokeMethod<dynamic>('syncCredentials', {
          'baseUrl': api.baseUrl,
          'token': api.accessToken,
          if (api.refreshToken != null) 'refreshToken': api.refreshToken,
        });
        if (enabled) {
          unawaited(registerDeviceToken());
        }
      } else {
        _lastRegisteredSignature = null;
        await _channel.invokeMethod<dynamic>('clearCredentials');
      }
    } catch (_) {}
  }

  Future<bool> requestPermissionIfNeeded() async {
    if (!enabled || _permissionAskedThisSession) return false;
    _permissionAskedThisSession = true;
    try {
      final status = await _channel.invokeMethod<dynamic>(
        'getNotificationPermissionStatus',
      );
      if (status is Map && status['granted'] == true) {
        return true;
      }
      final granted = await _channel.invokeMethod<dynamic>(
        'requestNotificationPermission',
      );
      return granted == true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _refreshDeviceMetadata() async {
    if (!enabled) return;
    try {
      final raw = await _channel.invokeMethod<dynamic>('getFcmStatus');
      if (raw is Map) {
        final devId = raw['deviceId']?.toString().trim();
        final devLabel = raw['deviceLabel']?.toString().trim();
        final appVer = raw['appVersion']?.toString().trim();
        final cached = raw['token']?.toString().trim();
        if (devId != null && devId.isNotEmpty) _deviceId = devId;
        if (devLabel != null && devLabel.isNotEmpty) _deviceLabel = devLabel;
        if (appVer != null && appVer.isNotEmpty) _appVersion = appVer;
        if (cached != null && cached.length >= 16) _lastFcmToken = cached;
      }
    } catch (_) {}
  }

  Future<bool> registerDeviceToken({
    String? explicitToken,
    bool force = false,
  }) async {
    if (!enabled || !api.signedIn) return false;
    await _refreshDeviceMetadata();

    var token = explicitToken?.trim();
    if (token == null || token.length < 16) {
      try {
        final raw = await _channel.invokeMethod<dynamic>('getFcmToken');
        if (raw is String && raw.trim().length >= 16) {
          token = raw.trim();
        }
      } catch (_) {}
    }
    token ??= _lastFcmToken;
    if (token == null || token.length < 16) return false;
    _lastFcmToken = token;

    final profile = await api.cachedProfile();
    final userKey = profile?['id']?.toString() ?? api.accessToken ?? '';
    final signature = '$userKey:$token';
    if (!force && _lastRegisteredSignature == signature) {
      return true;
    }

    try {
      await api.send(
        '/notifications/device-token',
        method: 'POST',
        body: {
          'token': token,
          'platform': 'ANDROID',
          if (_deviceId != null) 'device_id': _deviceId,
          if (_deviceLabel != null) 'device_label': _deviceLabel,
          if (_appVersion != null) 'app_version': _appVersion,
        },
      );
      _lastRegisteredSignature = signature;
      try {
        await _channel.invokeMethod<dynamic>('markFcmTokenSynced', {
          'token': token,
        });
      } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Json> detachDeviceOnLogout() async {
    if (!enabled) return {};
    await _refreshDeviceMetadata();
    final token = _lastFcmToken;
    final deviceId = _deviceId;
    _lastRegisteredSignature = null;

    if (token != null || deviceId != null) {
      try {
        await api
            .send(
              '/notifications/device-token/unregister',
              method: 'POST',
              body: {'token': ?token, 'device_id': ?deviceId},
              retry: false,
            )
            .timeout(const Duration(seconds: 5));
      } catch (_) {
        // Logout must still succeed cleanly if the device is offline.
      }
    }

    return {'push_token': ?token, 'device_id': ?deviceId};
  }

  Future<NotificationRouteTarget?> consumeInitialRoute() async {
    if (!enabled) return null;
    try {
      final raw = await _channel.invokeMethod<dynamic>(
        'getInitialNotificationRoute',
      );
      return NotificationRouteTarget.fromMap(raw);
    } catch (_) {
      return null;
    }
  }

  void dispose() {
    _disposed = true;
    if (enabled) {
      _channel.setMethodCallHandler(null);
    }
    _taps.close();
    _messages.close();
  }
}

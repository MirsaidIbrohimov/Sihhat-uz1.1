import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

typedef Json = Map<String, dynamic>;

class ApiException implements Exception {
  final String code, message;
  final int status;
  final dynamic details;
  const ApiException(this.code, this.message, {this.status = 0, this.details});
  @override
  String toString() => message;
}

abstract class TokenStore {
  Future<String?> read(String key);
  Future<void> write(String key, String? value);
}

class SecureTokenStore implements TokenStore {
  final FlutterSecureStorage storage;
  const SecureTokenStore([this.storage = const FlutterSecureStorage()]);
  @override
  Future<String?> read(String key) => storage.read(key: 'sihhat_$key');
  @override
  Future<void> write(String key, String? value) => value == null
      ? storage.delete(key: 'sihhat_$key')
      : storage.write(key: 'sihhat_$key', value: value);
}

String requestKey() {
  final r = Random.secure();
  return List.generate(
    24,
    (_) => r.nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();
}

class Api {
  final String baseUrl;
  final TokenStore store;
  final http.Client client;
  final ValueNotifier<bool> session = ValueNotifier(false);
  String? accessToken, refreshToken;
  Future<void>? _refreshing;
  final Map<String, String> _pendingKeys = {};
  final Map<String, Future<dynamic>> _inFlight = {};
  Api({required this.baseUrl, TokenStore? store, http.Client? client})
    : store = store ?? const SecureTokenStore(),
      client = client ?? http.Client() {
    final u = Uri.parse(baseUrl);
    if (!['http', 'https'].contains(u.scheme) || !u.hasAuthority) {
      throw const ApiException('CONFIG_INVALID', 'Server manzili noto‘g‘ri.');
    }
    if (kReleaseMode && u.scheme != 'https') {
      throw const ApiException(
        'CONFIG_INVALID',
        'Release uchun HTTPS server manzili kerak.',
      );
    }
  }
  bool get signedIn => accessToken != null;
  Future<void> restore() async {
    final access = await store.read('access');
    final refresh = await store.read('refresh');
    accessToken = access;
    refreshToken = refresh;
    session.value = signedIn;
  }

  Future<void> tokens(Json result) async {
    final access = result['access_token'], refresh = result['refresh_token'];
    if (access is! String ||
        access.isEmpty ||
        refresh is! String ||
        refresh.isEmpty) {
      throw const ApiException(
        'INVALID_RESPONSE',
        'Kirish javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.',
      );
    }
    await store.write('access', access);
    await store.write('refresh', refresh);
    if (result['user'] != null) {
      await store.write('profile', jsonEncode(result['user']));
    }
    accessToken = access;
    refreshToken = refresh;
    session.value = signedIn;
  }

  Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
    await store.write('access', null);
    await store.write('refresh', null);
    await store.write('pending_booking', null);
    await store.write('profile', null);
    session.value = false;
  }

  Future<void> _refresh() async {
    if (refreshToken == null) {
      throw const ApiException('SESSION_EXPIRED', 'Qayta kiring.', status: 401);
    }
    final result = await send(
      '/auth/refresh',
      method: 'POST',
      body: {'refresh_token': refreshToken},
      retry: false,
    );
    await tokens(asJson(result));
  }

  Future<dynamic> send(
    String path, {
    String method = 'GET',
    Json? body,
    bool retry = true,
    String? idempotencyKey,
  }) {
    final signature =
        '$method:$path:${jsonEncode(body)}:${idempotencyKey ?? ''}';
    if (method == 'GET') {
      return _send(path, method: method, body: body, retry: retry);
    }
    final active = _inFlight[signature];
    if (active != null) return active;
    final pending =
        _send(
          path,
          method: method,
          body: body,
          retry: retry,
          idempotencyKey: idempotencyKey,
        ).whenComplete(() {
          _inFlight.remove(signature);
        });
    _inFlight[signature] = pending;
    return pending;
  }

  Future<dynamic> _send(
    String path, {
    String method = 'GET',
    Json? body,
    bool retry = true,
    String? idempotencyKey,
  }) async {
    final signature = '$method:$path:${jsonEncode(body)}';
    final mutate = method != 'GET';
    final key = mutate
        ? (idempotencyKey ?? _pendingKeys.putIfAbsent(signature, requestKey))
        : null;
    http.Response response;
    try {
      final request = http.Request(method, Uri.parse('$baseUrl$path'));
      request.headers.addAll({
        'Content-Type': 'application/json',
        if (accessToken != null) 'Authorization': 'Bearer $accessToken',
        'Idempotency-Key': ?key,
      });
      if (body != null) request.body = jsonEncode(body);
      response = await client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(const Duration(seconds: 25));
    } on TimeoutException {
      throw const ApiException(
        'NETWORK_TIMEOUT',
        'So‘rov vaqti tugadi. Holatni yangilang yoki qayta urinib ko‘ring.',
      );
    } on http.ClientException {
      throw const ApiException(
        'NETWORK_ERROR',
        'Internet aloqasini tekshiring.',
      );
    }
    if (response.statusCode == 401 &&
        retry &&
        path != '/auth/refresh' &&
        !path.startsWith('/auth/customer/otp/')) {
      try {
        _refreshing ??= _refresh();
        await _refreshing;
      } on ApiException catch (e) {
        if (e.status == 401) await clear();
        rethrow;
      } finally {
        _refreshing = null;
      }
      return _send(
        path,
        method: method,
        body: body,
        retry: false,
        idempotencyKey: key,
      );
    }
    dynamic value;
    try {
      value = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      throw const ApiException(
        'INVALID_RESPONSE',
        'Server javobini o‘qib bo‘lmadi.',
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode < 500) _pendingKeys.remove(signature);
      final b = asJson(value);
      throw ApiException(
        b['code'] ?? 'REQUEST_FAILED',
        b['message'] ?? 'So‘rov bajarilmadi.',
        status: response.statusCode,
        details: b['details'],
      );
    }
    _pendingKeys.remove(signature);
    return value;
  }

  Future<void> logout() async {
    try {
      await send('/auth/logout', method: 'POST', body: {});
    } finally {
      await clear();
    }
  }

  String image(String id) => '$baseUrl/media/$id';
  Future<void> pendingBooking(String? id) => store.write('pending_booking', id);
  Future<String?> getPendingBooking() => store.read('pending_booking');
}

Json asJson(dynamic value) => Map<String, dynamic>.from(value as Map);
List<Json> rows(dynamic value) =>
    ((value is List) ? value : (value?['data'] ?? []) as List)
        .map(asJson)
        .toList();
String q(Json values) =>
    '?${Uri(queryParameters: values.map((k, v) => MapEntry(k, v.toString()))).query}';
String money(dynamic value) {
  final n = BigInt.parse((value ?? '0').toString()),
      a = n.abs(),
      w = (a ~/ BigInt.from(100)).toString().replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'),
        (_) => ' ',
      ),
      f = a % BigInt.from(100);
  return '${n.isNegative ? '−' : ''}$w${f == BigInt.zero ? '' : ',${f.toString().padLeft(2, '0')}'} so‘m';
}

String dateOnly(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
const states = {
  'HOLD': 'To‘lov kutilmoqda',
  'PAYMENT_PENDING': 'Provayderda kutilmoqda',
  'CONFIRMED': 'Bron tasdiqlangan',
  'CHECKED_IN': 'Joylashgan',
  'CHECKED_OUT': 'Yakunlangan',
  'CANCELLED': 'Bekor qilingan',
  'NO_SHOW': 'Kelmagan',
  'EXPIRED': 'Muddati tugagan',
  'PAYMENT_EXCEPTION': 'To‘lovni tekshirish kerak',
  'REQUESTED': 'So‘ralgan',
  'APPROVED': 'Ma’qullangan',
  'PROCESSING': 'Bajarilmoqda',
  'SUCCEEDED': 'Tasdiqlangan',
  'REJECTED': 'Rad etilgan',
  'OPEN': 'Ochiq',
  'CLOSED': 'Yopilgan',
};

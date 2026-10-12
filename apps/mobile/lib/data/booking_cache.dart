import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'api.dart';

bool bookingVisible(Json booking, {DateTime? now}) {
  if (![
    'HOLD',
    'PAYMENT_PENDING',
    'EXPIRED',
    'CANCELLED',
  ].contains(booking['status'])) {
    return true;
  }
  if (booking['history_preserved'] == true ||
      [
        'SUCCEEDED',
        'REFUNDED',
      ].contains(booking['payment_status'] ?? booking['payment']?['status'])) {
    return true;
  }
  if (['EXPIRED', 'CANCELLED'].contains(booking['status'])) return false;
  final created = DateTime.tryParse(booking['createdAt']?.toString() ?? '');
  if (created == null) return true;
  final limit = created.add(const Duration(minutes: 5));
  final hold = DateTime.tryParse(booking['holdExpiresAt']?.toString() ?? '');
  final deadline = hold != null && hold.isBefore(limit) ? hold : limit;
  return (now ?? DateTime.now()).isBefore(deadline);
}

/// Private, account-scoped downloads. A cached booking never confirms a payment.
class BookingCache extends ChangeNotifier {
  static final _instances = Expando<BookingCache>();
  factory BookingCache(Api api) => _instances[api] ??= BookingCache._(api);
  BookingCache._(this.api) {
    api.privateRevision.addListener(_reset);
  }

  final Api api;
  final Map<String, Json> _bookings = {};
  Future<void>? _loading, _syncing;
  Future<void> _writing = Future.value();
  final Map<String, Future<Json>> _requests = {};
  bool hasSnapshot = false;
  DateTime? savedAt;
  int _generation = 0;
  String? _owner;
  Object? error;

  void _reset() {
    _generation++;
    _loading = null;
    _syncing = null;
    _requests.clear();
    _bookings.clear();
    _owner = null;
    hasSnapshot = false;
    savedAt = null;
    error = null;
    notifyListeners();
  }

  Future<void> load() => _loading ??= _load(_generation);
  Future<void> _load(int generation) async {
    try {
      final profile = await api.cachedProfile();
      final raw = await api.store.read('booking_cache');
      if (generation != _generation) return;
      _owner = profile?['id']?.toString();
      if (!api.signedIn || raw == null || _owner == null) return;
      final data = asJson(jsonDecode(raw));
      if (data['server'] != api.baseUrl || data['owner'] != _owner) return;
      for (final booking in rows(data['bookings'])) {
        if (bookingVisible(booking)) _bookings[booking['id']] = booking;
      }
      savedAt = DateTime.tryParse(data['saved_at'] ?? '');
      hasSnapshot = true;
      if (_bookings.length != rows(data['bookings']).length) {
        final pending = await api.getPendingBooking();
        if (pending != null && !_bookings.containsKey(pending)) {
          await api.pendingBooking(null);
        }
        await _save();
      }
    } catch (_) {
      // A corrupt download is replaced by the next successful server response.
    } finally {
      if (generation == _generation) notifyListeners();
    }
  }

  Future<void> _save() {
    final generation = _generation;
    final encoded = jsonEncode({
      'server': api.baseUrl,
      'owner': _owner,
      'saved_at': savedAt?.toUtc().toIso8601String(),
      'bookings': _bookings.values.toList(),
    });
    return _writing = _writing.then((_) async {
      if (generation != _generation || !api.signedIn) return;
      try {
        await api.saveBookingCache(encoded);
      } catch (_) {
        /* Keep the in-memory view. */
      }
    });
  }

  Future<void> prune() async {
    await load();
    final before = _bookings.length;
    _bookings.removeWhere((_, b) => !bookingVisible(b));
    if (before != _bookings.length) {
      final pending = await api.getPendingBooking();
      if (pending != null && !_bookings.containsKey(pending)) {
        await api.pendingBooking(null);
      }
      await _save();
      notifyListeners();
    }
  }

  Future<void> remember(Json booking) async {
    await load();
    if (!api.signedIn ||
        booking['id'] is! String ||
        booking['reference'] is! String ||
        booking['status'] is! String) {
      return;
    }
    if (_owner != null &&
        booking['userId'] != null &&
        booking['userId'] != _owner) {
      return;
    }
    final id = booking['id'] as String;
    final combined = {...?_bookings[id], ...booking};
    if (bookingVisible(combined)) {
      _bookings[id] = combined;
    } else {
      _bookings.remove(id);
    }
    hasSnapshot = true;
    savedAt = DateTime.now();
    await _save();
    notifyListeners();
  }

  Future<Json?> cached(String id) async {
    await load();
    final value = _bookings[id];
    return value != null && bookingVisible(value) ? value : null;
  }

  Future<Json?> page(int page, {int limit = 15}) async {
    await load();
    if (!hasSnapshot) return null;
    final values = _bookings.values.where((b) => bookingVisible(b)).toList()
      ..sort(
        (a, b) => (b['createdAt'] ?? '').toString().compareTo(
          (a['createdAt'] ?? '').toString(),
        ),
      );
    return {
      'data': values.skip((page - 1) * limit).take(limit).toList(),
      'total': values.length,
      'pages': (values.length / limit).ceil(),
    };
  }

  Future<Json> refresh(String id) => _requests.putIfAbsent(
    id,
    () =>
        (() async {
          final generation = _generation;
          final value = asJson(await api.send('/customer/bookings/$id'));
          if (generation == _generation) await remember(value);
          return value;
        })().whenComplete(() {
          _requests.remove(id);
        }),
  );

  Future<void> sync() =>
      _syncing ??= _sync().whenComplete(() => _syncing = null);
  Future<void> _sync() async {
    await prune();
    if (!api.signedIn) return;
    final generation = _generation;
    try {
      final downloaded = <String, Json>{};
      var page = 1, pages = 1;
      do {
        final value = asJson(
          await api.send(
            '/customer/bookings${q({'page': page, 'limit': 100})}',
          ),
        );
        if (value['data'] is! List) {
          throw const ApiException(
            'INVALID_RESPONSE',
            'Bronlarni yangilab bo‘lmadi.',
          );
        }
        for (final booking in rows(value)) {
          final id = booking['id'] as String;
          final combined = {...?_bookings[id], ...booking};
          if (bookingVisible(combined)) downloaded[id] = combined;
        }
        pages = (value['pages'] as num?)?.toInt() ?? 1;
        page++;
      } while (page <= pages);
      if (generation != _generation || !api.signedIn) return;
      _bookings
        ..clear()
        ..addAll(downloaded);
      hasSnapshot = true;
      savedAt = DateTime.now();
      error = null;
      await _save();
      notifyListeners();
      // Download details and room/guest information for unopened bookings too.
      final ids = downloaded.keys.toList();
      var next = 0;
      Future<void> worker() async {
        while (next < ids.length && generation == _generation) {
          try {
            await refresh(ids[next++]);
          } on ApiException catch (e) {
            if (['NETWORK_ERROR', 'NETWORK_TIMEOUT'].contains(e.code)) return;
          } catch (_) {
            /* Keep the latest list and previous detail during an outage. */
          }
        }
      }

      await Future.wait(List.generate(ids.length.clamp(0, 3), (_) => worker()));
    } catch (e) {
      if (generation == _generation) {
        error = e;
        notifyListeners();
      }
    }
  }

  Future<void> cancel(String id, String reason) async {
    await api.send(
      '/customer/bookings/$id/cancel',
      method: 'POST',
      body: {'reason': reason},
    );
    await load();
    _bookings.remove(id);
    if (await api.getPendingBooking() == id) await api.pendingBooking(null);
    await _save();
    notifyListeners();
  }
}

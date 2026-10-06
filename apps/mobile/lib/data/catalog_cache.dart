import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import 'api.dart';

/// A downloaded public catalogue, shared by every screen for this API.
/// Prices here are for browsing; quotes, holds and payments always use the API.
class CatalogCache extends ChangeNotifier {
  static final _instances = Expando<CatalogCache>();
  factory CatalogCache(Api api, {CatalogPhotos? photos}) =>
      _instances[api] ??= CatalogCache._(api, photos ?? CatalogPhotos(api));
  CatalogCache._(this.api, this.photos);

  final Api api;
  final CatalogPhotos photos;
  List<Json> items = [];
  final Map<String, Json> _details = {};
  final Map<String, Future<Json>> _detailRequests = {};
  Future<void>? _loading, _syncing;
  Future<void> _writing = Future.value();
  bool loaded = false, hasSnapshot = false;
  Object? error;
  DateTime? savedAt;
  String get cacheKey => 'catalog_v1_${Uri.encodeComponent(api.baseUrl)}';

  Future<void> load() => _loading ??= _load();
  Future<void> _load() async {
    try {
      final raw = await api.store.read(cacheKey);
      if (raw != null) {
        final value = asJson(jsonDecode(raw));
        if (value['items'] is List && value['details'] is Map) {
          items = rows(value['items']);
          _details.addAll(
            asJson(value['details'])
                .map((id, value) => MapEntry(id, asJson(value))),
          );
          savedAt = DateTime.tryParse(value['saved_at'] ?? '');
          hasSnapshot = true;
        }
      }
    } catch (_) {
      // A damaged download can be replaced on the next successful sync.
    }
    loaded = true;
    notifyListeners();
  }

  Future<void> _save() {
    final value = jsonEncode({
      'items': items,
      'details': _details,
      'saved_at': savedAt?.toUtc().toIso8601String(),
    });
    return _writing = _writing.then((_) async {
      try {
        await api.store.write(cacheKey, value);
      } catch (_) {
        // Keep the current in-memory view if device storage is unavailable.
      }
    });
  }

  Future<void> sync() =>
      _syncing ??= _sync().whenComplete(() => _syncing = null);
  Future<void> _sync() async {
    await load();
    try {
      final downloaded = <String, Json>{};
      var page = 1, pages = 1;
      do {
        final value = asJson(
          await api.send(
            '/catalog/sanatoriums${q({'page': page, 'limit': 100, 'sort': 'NAME'})}',
          ),
        );
        if (value['data'] is! List) {
          throw const ApiException(
            'INVALID_RESPONSE',
            'Katalogni yangilab bo‘lmadi.',
          );
        }
        for (final item in rows(value)) {
          downloaded[item['id'] as String] = item;
        }
        pages = (value['pages'] as num?)?.toInt() ?? 1;
        page++;
      } while (page <= pages);
      // Replace only after all pages arrive: a failed page must not erase data.
      items = downloaded.values.toList();
      _details.removeWhere((id, _) => !downloaded.containsKey(id));
      hasSnapshot = true;
      savedAt = DateTime.now();
      error = null;
      await _save();
      notifyListeners();

      // Also fetch unopened profiles and tariffs, rather than just list cards.
      final queue = items.map((item) => item['id'] as String).toList();
      var next = 0;
      Future<void> worker() async {
        while (next < queue.length) {
          final id = queue[next++];
          try {
            final detail = await refreshDetail(id);
            for (final photo in (detail['photo_ids'] as List? ?? [])) {
              await photos.file(photo.toString());
            }
          } on ApiException catch (e) {
            if (['NETWORK_ERROR', 'NETWORK_TIMEOUT'].contains(e.code)) return;
          } catch (_) {
            // Keep previously downloaded details during a partial outage.
          }
        }
      }

      await Future.wait(
        List.generate(queue.length.clamp(0, 3), (_) => worker()),
      );
    } catch (e) {
      error = e;
      notifyListeners();
    }
  }

  Future<Json?> cachedDetail(String id) async {
    await load();
    if (_details.containsKey(id)) return _details[id];
    for (final item in items) {
      if (item['id'] == id) {
        return {
          ...item,
          'room_types': <Json>[],
          'rate_plans': <Json>[],
          'reviews': <Json>[],
        };
      }
    }
    return null;
  }

  Future<Json> refreshDetail(String id) => _detailRequests.putIfAbsent(
    id,
    () => _refreshDetail(id).whenComplete(() {
      _detailRequests.remove(id);
    }),
  );
  Future<Json> _refreshDetail(String id) async {
    await load();
    try {
      final detail = asJson(await api.send('/catalog/sanatoriums/$id'));
      if (detail['id'] != id ||
          detail['rate_plans'] is! List ||
          detail['room_types'] is! List) {
        throw const ApiException(
          'INVALID_RESPONSE',
          'Sanatoriya ma’lumotlari to‘liq emas.',
        );
      }
      _details[id] = detail;
      await _save();
      notifyListeners();
      return detail;
    } on ApiException catch (e) {
      if (e.status == 404 || e.status == 403) {
        _details.remove(id);
        items.removeWhere((item) => item['id'] == id);
        await _save();
        notifyListeners();
      }
      rethrow;
    }
  }

  Json search({
    int page = 1,
    String query = '',
    String region = '',
    String amenity = '',
    String maxPrice = '',
  }) {
    final term = query.trim().toLowerCase();
    final ceiling = maxPrice.isEmpty
        ? null
        : BigInt.parse(maxPrice) * BigInt.from(100);
    final matches =
        items.where((s) {
          final text = '${s['name']} ${s['description']} ${s['region']}'
              .toLowerCase();
          if (term.isNotEmpty && !text.contains(term)) return false;
          if (region.isNotEmpty && s['region'] != region) return false;
          if (amenity.isNotEmpty &&
              !(s['amenities'] as List? ?? []).contains(amenity)) {
            return false;
          }
          if (ceiling != null &&
              (s['from_amount'] == null ||
                  BigInt.parse(s['from_amount'].toString()) > ceiling)) {
            return false;
          }
          return true;
        }).toList()..sort(
          (a, b) => a['name'].toString().compareTo(b['name'].toString()),
        );
    return {
      'data': matches.skip((page - 1) * 100).take(100).toList(),
      'total': matches.length,
      'pages': (matches.length / 100).ceil(),
    };
  }
}

/// Public photos live in persistent app files, not the OS's temporary cache.
class CatalogPhotos {
  final Api api;
  final Future<Directory> Function() directory;
  Future<Directory>? _folder;
  final Map<String, Future<File?>> _requests = {};
  CatalogPhotos(this.api, {Future<Directory> Function()? directory})
    : directory = directory ?? getApplicationSupportDirectory;

  Future<Directory> _directory() => _folder ??= (() async {
    final root = await directory();
    final server = base64Url
        .encode(utf8.encode(api.baseUrl))
        .replaceAll('=', '');
    return Directory('${root.path}/catalog-photos/$server')
        .create(recursive: true);
  })();

  Future<File?> file(String id) => _requests.putIfAbsent(
    id,
    () => _file(id).whenComplete(() {
      _requests.remove(id);
    }),
  );
  Future<File?> _file(String id) async {
    if (!RegExp(r'^[a-zA-Z0-9_-]+$').hasMatch(id)) return null;
    try {
      final folder = await _directory();
      final saved = File('${folder.path}/$id');
      if (await saved.exists() && await saved.length() > 0) return saved;
      final response = await api.client
          .get(Uri.parse(api.image(id)))
          .timeout(const Duration(seconds: 12));
      if (response.statusCode != 200 ||
          !(response.headers['content-type'] ?? '').startsWith('image/') ||
          response.bodyBytes.isEmpty ||
          response.bodyBytes.length > 8 * 1024 * 1024) {
        return null;
      }
      final temporary = File('${saved.path}.part');
      await temporary.writeAsBytes(response.bodyBytes, flush: true);
      return await temporary.rename(saved.path);
    } catch (_) {
      return null;
    }
  }
}

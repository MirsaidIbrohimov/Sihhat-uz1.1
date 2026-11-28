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

      // Stage 1 (High Priority): Download ONLY the first cover photo (thumbnail)
      // of each sanatorium first so home & catalog cards render immediately.
      final coverIds = <String>[];
      for (final item in items) {
        final list = ((item['photos'] as List?)?.isNotEmpty == true
            ? (item['photos'] as List)
            : (item['photo_ids'] as List? ?? []));
        if (list.isNotEmpty) {
          final firstId = list.first.toString();
          if (!coverIds.contains(firstId)) coverIds.add(firstId);
        }
      }
      var coverNext = 0;
      Future<void> coverWorker() async {
        while (coverNext < coverIds.length) {
          final photoId = coverIds[coverNext++];
          final got = await photos.file(photoId, width: 640);
          if (got != null) notifyListeners();
        }
      }

      if (coverIds.isNotEmpty) {
        await Future.wait(
          List.generate(coverIds.length.clamp(0, 4), (_) => coverWorker()),
        );
      }

      // Stage 2: Fetch unopened profiles, tariffs and remaining gallery photos for offline mode.
      final queue = items.map((item) => item['id'] as String).toList();
      var next = 0;
      Future<void> worker() async {
        while (next < queue.length) {
          final id = queue[next++];
          try {
            final detail = await refreshDetail(id);
            final photoList = ((detail['photos'] as List?)?.isNotEmpty == true
                ? (detail['photos'] as List)
                : (detail['photo_ids'] as List? ?? []));
            for (var i = 0; i < photoList.length; i++) {
              await photos.file(
                photoList[i].toString(),
                width: i == 0 ? 640 : 1280,
              );
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
    Set<String> selectedAmenities = const {},
    String minPrice = '',
    String maxPrice = '',
  }) {
    final term = query.trim().toLowerCase();
    final floor = minPrice.isEmpty
        ? null
        : BigInt.parse(minPrice) * BigInt.from(100);
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
          if (!selectedAmenities.every(
            (a) => (s['amenities'] as List? ?? []).contains(a),
          )) {
            return false;
          }
          if (floor != null &&
              (s['from_amount'] == null ||
                  BigInt.parse(s['from_amount'].toString()) < floor)) {
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
  final Map<String, File> _resolvedFiles = {};
  CatalogPhotos(this.api, {Future<Directory> Function()? directory})
    : directory = directory ?? getApplicationSupportDirectory;

  File? cachedFile(String id) => _resolvedFiles[id];

  Future<Directory> _directory() => _folder ??= (() async {
    final root = await directory();
    final server = base64Url
        .encode(utf8.encode(api.baseUrl))
        .replaceAll('=', '');
    return Directory('${root.path}/catalog-photos/$server')
        .create(recursive: true);
  })();

  Future<File?> file(String id, {int width = 960}) {
    final mem = _resolvedFiles[id];
    if (mem != null) return Future.value(mem);
    return _requests.putIfAbsent(
      id,
      () => _file(id, width: width).whenComplete(() {
        _requests.remove(id);
      }),
    );
  }

  Future<File?> _file(String id, {int width = 960}) async {
    final isUrl = id.startsWith('http://') || id.startsWith('https://');
    if (!isUrl && !RegExp(r'^[a-zA-Z0-9_-]+$').hasMatch(id)) return null;
    try {
      final folder = await _directory();
      final filename = isUrl
          ? base64Url.encode(utf8.encode(id)).replaceAll('=', '')
          : id;
      final saved = File('${folder.path}/$filename');
      if (await saved.exists() && await saved.length() > 0) {
        _resolvedFiles[id] = saved;
        return saved;
      }
      final targetUrl = isUrl ? id : api.image(id, width: width);
      final response = await api.client
          .get(Uri.parse(targetUrl))
          .timeout(const Duration(seconds: 12));
      final cType = response.headers['content-type'] ?? '';
      final isImage =
          cType.startsWith('image/') ||
          (isUrl &&
              RegExp(
                r'\.(jpg|jpeg|png|webp|gif)(\?.*)?$',
                caseSensitive: false,
              ).hasMatch(id));
      if (response.statusCode != 200 ||
          !isImage ||
          response.bodyBytes.isEmpty ||
          response.bodyBytes.length > 20 * 1024 * 1024) {
        return null;
      }
      final temporary = File('${saved.path}.part');
      await temporary.writeAsBytes(response.bodyBytes, flush: true);
      final done = await temporary.rename(saved.path);
      _resolvedFiles[id] = done;
      return done;
    } catch (_) {
      return null;
    }
  }
}

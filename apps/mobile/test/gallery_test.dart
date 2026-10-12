import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihhat_mobile/data/api.dart';
import 'package:sihhat_mobile/data/catalog_cache.dart';
import 'package:sihhat_mobile/sanatorium_gallery.dart';
import 'package:sihhat_mobile/widgets.dart';

import 'api_test.dart' show MemoryStore;
import 'design_test.dart' show reply;

void main() {
  testWidgets(
    'visible photos update after catalog sync without an async setState callback',
    (tester) async {
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((_) async => reply({'data': <Json>[], 'pages': 1})),
      );
      final cache = CatalogCache(
        api,
        photos: CatalogPhotos(
          api,
          directory: () async =>
              throw const FileSystemException('Offline photo test'),
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SanatoriumPhoto(
              api: api,
              id: 'photo',
              fallback: const Text('Saqlangan surat'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await cache.sync();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Saqlangan surat'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );

  testWidgets(
    'four-photo gallery supports arrows, swiping and wraparound in one frame',
    (tester) async {
      final api = Api(
        baseUrl: 'http://localhost',
        store: MemoryStore(),
        client: MockClient((_) async => http.Response('', 404)),
      );
      CatalogCache(
        api,
        photos: CatalogPhotos(
          api,
          directory: () async =>
              throw const FileSystemException('Offline gallery test'),
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SanatoriumGallery(api, const [
              'photo-1',
              'photo-2',
              'photo-3',
              'photo-4',
            ]),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('1 / 4'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('gallery-next')));
      await tester.pumpAndSettle();
      expect(find.text('2 / 4'), findsOneWidget);
      await tester.fling(
        find.byKey(const ValueKey('sanatorium-gallery')),
        const Offset(-400, 0),
        1000,
      );
      await tester.pumpAndSettle();
      expect(find.text('3 / 4'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('gallery-next')));
      await tester.pumpAndSettle();
      expect(find.text('4 / 4'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('gallery-next')));
      await tester.pumpAndSettle();
      expect(find.text('1 / 4'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('gallery-previous')));
      await tester.pumpAndSettle();
      expect(find.text('4 / 4'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.client.close();
    },
  );
}

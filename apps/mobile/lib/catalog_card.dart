import 'package:flutter/material.dart';

import 'concept_ui.dart';
import 'data/api.dart';
import 'data/catalog_cache.dart';
import 'design.dart';
import 'neon.dart';
import 'widgets.dart';

String amenityIcon(String value) {
  final s = value.toLowerCase();
  if (s.contains('wi') || s.contains('internet')) return 'wifi';
  if (s.contains('hovuz') || s.contains('basseyn')) return 'waves';
  if (s.contains('ovqat')) return 'utensils';
  if (s.contains('avto') || s.contains('parking')) return 'car';
  return 'heart-pulse';
}

Json? catalogueItem(Api api, String? id) {
  for (final s in CatalogCache(api).items) {
    if (s['id'] == id) return s;
  }
  return null;
}

class PlacePhoto extends StatelessWidget {
  final Api api;
  final Json? place;
  final double height;
  const PlacePhoto(this.api, this.place, {this.height = 160, super.key});
  @override
  Widget build(BuildContext context) {
    final ids = ((place?['photos'] as List?)?.isNotEmpty == true
        ? (place!['photos'] as List)
        : (place?['photo_ids'] as List? ?? []));
    final fallback = ColoredBox(
      color: context.colors.soft,
      child: Center(
        child: SihhatIcon(
          'building-2',
          size: 40,
          color: context.colors.primary,
        ),
      ),
    );
    return SizedBox(
      height: height,
      child: ids.isEmpty
          ? fallback
          : SanatoriumPhoto(
              api: api,
              id: ids.first.toString(),
              fallback: fallback,
            ),
    );
  }
}

class CatalogueCard extends StatelessWidget {
  final Api api;
  final Json item;
  final VoidCallback open;
  final bool compact;
  const CatalogueCard({
    required this.api,
    required this.item,
    required this.open,
    this.compact = false,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final amenities = (item['amenities'] as List? ?? [])
        .map((a) => a.toString())
        .take(3)
        .toList();
    final rawRating = item['rating'] is Map
        ? item['rating']['average']
        : item['rating'] ?? item['average_rating'];
    final rating = rawRating is num
        ? rawRating.toDouble()
        : double.tryParse(rawRating?.toString() ?? '');
    return ConceptCard(
      padding: EdgeInsets.zero,
      onTap: open,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Stack(
            fit: StackFit.passthrough,
            children: [
              PlacePhoto(api, item, height: compact ? 135 : 175),
              const Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Color(0x99021a17)],
                        stops: [.55, 1],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                right: 12,
                top: 12,
                child: FavoriteButton(api, item['id']?.toString()),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        item['name'] ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: conceptHeading(context, size: 18),
                      ),
                    ),
                    if (rating != null && rating > 0) ...[
                      const SizedBox(width: 8),
                      const Icon(
                        Icons.star_rounded,
                        size: 20,
                        color: Color(0xffffc83d),
                      ),
                      const SizedBox(width: 2),
                      Text(
                        rating.toStringAsFixed(1),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ],
                  ],
                ),
                ConceptRow(
                  'map-pin',
                  [item['region'], item['district']]
                      .where((v) => v != null && v.toString().isNotEmpty)
                      .join(' · '),
                ),
                if (amenities.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6, bottom: 4),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        for (final a in amenities)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: context.colors.soft.withValues(alpha: .6),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SihhatIcon(
                                  amenityIcon(a),
                                  size: 14,
                                  color: context.colors.primary,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  a,
                                  style: TextStyle(
                                    color: context.colors.ink,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                const Divider(height: 22),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item['from_amount'] == null
                            ? 'Tarifni ko‘ring'
                            : '${money(item['from_amount'])} / tun',
                        style: conceptHeading(context, size: 18),
                      ),
                    ),
                    const NeonArrow(size: 36),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class PlaceSummary extends StatelessWidget {
  final Api api;
  final Json place;
  final String? subtitle, details;
  const PlaceSummary(
    this.api,
    this.place, {
    this.subtitle,
    this.details,
    super.key,
  });
  @override
  Widget build(BuildContext context) => ConceptCard(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(width: 88, child: PlacePhoto(api, place, height: 88)),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                place['name'] ?? 'Sanatoriya',
                style: conceptHeading(context, size: 17),
              ),
              if (place['region'] != null)
                ConceptRow('map-pin', place['region']),
              if (subtitle != null) ConceptRow('calendar-days', subtitle!),
              if (details != null) ConceptRow('bed-double', details!),
            ],
          ),
        ),
      ],
    ),
  );
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import '../data/catalog_cache.dart';
import '../widgets.dart';
import '../sanatorium_gallery.dart';
import '../design.dart';
import '../concept_ui.dart';
import '../catalog_card.dart';
import 'booking.dart';

class CatalogScreen extends StatefulWidget {
  final Api api;
  final String initialQuery;
  final bool showFilters;
  const CatalogScreen(
    this.api, {
    this.initialQuery = '',
    this.showFilters = false,
    super.key,
  });
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final search = TextEditingController();
  Timer? debounce;
  late CatalogCache catalog;
  int page = 1;
  String region = '', minPrice = '', maxPrice = '';
  Set<String> amenities = {};
  @override
  void initState() {
    super.initState();
    search.text = widget.initialQuery;
    catalog = CatalogCache(widget.api)..addListener(updated);
    catalog.load().then((_) {
      if (mounted) catalog.sync();
    });
    if (widget.showFilters) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) filters();
      });
    }
  }

  Json load() => catalog.search(
    page: page,
    query: search.text,
    region: region,
    selectedAmenities: amenities,
    minPrice: minPrice,
    maxPrice: maxPrice,
  );
  void updated() {
    if (!mounted) return;
    setState(() {
      if (page > (load()['pages'] as int).clamp(1, 1000000)) page = 1;
    });
  }

  void reload() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    debounce?.cancel();
    catalog.removeListener(updated);
    search.dispose();
    super.dispose();
  }

  void open(String id) => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => SanatoriumScreen(widget.api, id)),
  );
  List<String> get regions =>
      catalog.items
          .map((s) => s['region']?.toString() ?? '')
          .where((r) => r.isNotEmpty)
          .toSet()
          .toList()
        ..sort();
  Future<void> filters() async {
    final minimum = TextEditingController(text: minPrice),
        maximum = TextEditingController(text: maxPrice);
    var pickedRegion = region;
    final selected = {...amenities};
    final choices =
        catalog.items
            .expand(
              (s) => (s['amenities'] as List? ?? []).map((v) => v.toString()),
            )
            .toSet()
            .toList()
          ..sort();
    String? error;
    final amounts = catalog.items
        .map((s) => double.tryParse(s['from_amount']?.toString() ?? ''))
        .whereType<double>()
        .toList();
    final priceLimit = amounts.isEmpty
        ? null
        : amounts.reduce((a, b) => a > b ? a : b) / 100;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (c) => ConceptScope(
        child: StatefulBuilder(
          builder: (c, set) => SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              20,
              0,
              20,
              MediaQuery.viewInsetsOf(c).bottom + 20,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Filtrlar',
                        style: conceptHeading(c, size: 24),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Yopish',
                      onPressed: () => Navigator.pop(c),
                      icon: const SihhatIcon('x'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text('Hudud', style: conceptHeading(c, size: 16)),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: pickedRegion,
                  isExpanded: true,
                  icon: const SihhatIcon('chevron-down', size: 20),
                  items: [
                    const DropdownMenuItem(value: '', child: Text('Barchasi')),
                    for (final r in {
                      ...regions,
                      if (pickedRegion.isNotEmpty) pickedRegion,
                    })
                      DropdownMenuItem(value: r, child: Text(r)),
                  ],
                  onChanged: (v) => set(() => pickedRegion = v ?? ''),
                ),
                const SizedBox(height: 22),
                Text('Bir tun uchun narx', style: conceptHeading(c, size: 16)),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: minimum,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Min. narx (so‘m)',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: maximum,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Eng ko‘p kunlik narx (so‘m)',
                        ),
                      ),
                    ),
                  ],
                ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      error!,
                      style: TextStyle(color: Theme.of(c).colorScheme.error),
                    ),
                  ),
                if (priceLimit != null && priceLimit > 0)
                  AnimatedBuilder(
                    animation: Listenable.merge([minimum, maximum]),
                    builder: (c, _) {
                      final low = (double.tryParse(minimum.text) ?? 0).clamp(
                        0.0,
                        priceLimit,
                      );
                      final high = (double.tryParse(maximum.text) ?? priceLimit)
                          .clamp(low, priceLimit);
                      return RangeSlider(
                        min: 0,
                        max: priceLimit,
                        values: RangeValues(low, high),
                        onChanged: (v) {
                          minimum.text = v.start.round().toString();
                          maximum.text = v.end.round().toString();
                        },
                      );
                    },
                  ),
                const SizedBox(height: 22),
                Text('Sharoitlar', style: conceptHeading(c, size: 16)),
                const SizedBox(height: 10),
                if (choices.isEmpty)
                  Text(
                    'Katalog yuklangandan so‘ng sharoitlar ko‘rinadi.',
                    style: TextStyle(color: c.colors.muted),
                  ),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    for (final a in choices)
                      FilterChip(
                        avatar: SihhatIcon(amenityIcon(a), size: 19),
                        label: Text(a),
                        selected: selected.contains(a),
                        onSelected: (v) => set(() {
                          if (v) {
                            selected.add(a);
                          } else {
                            selected.remove(a);
                          }
                        }),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {
                    final low = minimum.text.trim(), high = maximum.text.trim();
                    if ([low, high].any(
                      (v) => v.isNotEmpty && !RegExp(r'^\d{1,15}$').hasMatch(v),
                    )) {
                      set(() => error = 'Narxni raqam bilan kiriting.');
                      return;
                    }
                    if (low.isNotEmpty &&
                        high.isNotEmpty &&
                        BigInt.parse(low) > BigInt.parse(high)) {
                      set(
                        () => error =
                            'Eng ko‘p narx eng kam narxdan kichik bo‘lmasin.',
                      );
                      return;
                    }
                    setState(() {
                      region = pickedRegion;
                      amenities = {...selected};
                      minPrice = low;
                      maxPrice = high;
                      page = 1;
                    });
                    Navigator.pop(c);
                  },
                  child: const Text('Natijalarni ko‘rish'),
                ),
                TextButton(
                  onPressed: () => set(() {
                    pickedRegion = '';
                    selected.clear();
                    minimum.clear();
                    maximum.clear();
                    error = null;
                  }),
                  child: const Text('Filtrlarni tozalash'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    // Route animations may still reference the fields after the sheet is closed.
    await Future<void>.delayed(const Duration(milliseconds: 300));
    minimum.dispose();
    maximum.dispose();
  }

  @override
  Widget build(BuildContext context) => ConceptScope(
    child: Builder(
      builder: (c) => RefreshIndicator(
        onRefresh: catalog.sync,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            ColoredBox(
              color: masthead,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: search,
                        decoration: const InputDecoration(
                          hintText: 'Sanatoriya yoki hudud',
                          prefixIcon: Padding(
                            padding: EdgeInsets.all(14),
                            child: SihhatIcon('search'),
                          ),
                        ),
                        onChanged: (_) {
                          debounce?.cancel();
                          debounce = Timer(
                            const Duration(milliseconds: 350),
                            () {
                              page = 1;
                              reload();
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Badge(
                      isLabelVisible:
                          amenities.isNotEmpty ||
                          minPrice.isNotEmpty ||
                          maxPrice.isNotEmpty,
                      label: Text(
                        (amenities.length +
                                (minPrice.isNotEmpty || maxPrice.isNotEmpty
                                    ? 1
                                    : 0))
                            .toString(),
                      ),
                      child: IconButton.filledTonal(
                        style: IconButton.styleFrom(
                          minimumSize: const Size(52, 52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          backgroundColor: c.colors.surface,
                        ),
                        onPressed: filters,
                        tooltip: 'Filtrlar',
                        icon: const SihhatIcon('sliders-horizontal'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final r in ['', ...regions])
                          Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: ChoiceChip(
                              label: Text(r.isEmpty ? 'Barchasi' : r),
                              selected: r == region,
                              onSelected: (_) => setState(() {
                                region = r;
                                page = 1;
                              }),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (!catalog.loaded ||
                      !catalog.hasSnapshot && catalog.error == null)
                    const Busy()
                  else if (!catalog.hasSnapshot)
                    ErrorView(
                      'Sanatoriyalarni birinchi marta yuklash uchun internetga ulaning.',
                      retry: catalog.sync,
                    )
                  else ...[
                    if (catalog.error != null)
                      const ConceptInfo(
                        icon: 'wifi-off',
                        title: 'Saqlangan katalog',
                        text: 'Internet tiklanganda narx va ma’lumotlar yangilanadi.',
                      ),
                    Text(
                      '${load()['total']} ta sanatoriya',
                      style: TextStyle(color: c.colors.muted),
                    ),
                    const SizedBox(height: 14),
                    if (rows(load()).isEmpty)
                      const EmptyView('Mos sanatoriya topilmadi.'),
                    for (final s in rows(load()))
                      CatalogueCard(
                        item: s,
                        api: widget.api,
                        open: () => open(s['id']),
                      ),
                    if ((load()['pages'] ?? 1) > 1)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          TextButton(
                            onPressed: page > 1
                                ? () {
                                    page--;
                                    reload();
                                  }
                                : null,
                            child: const Text('Oldingi'),
                          ),
                          Text('$page / ${load()['pages']}'),
                          TextButton(
                            onPressed: page < load()['pages']
                                ? () {
                                    page++;
                                    reload();
                                  }
                                : null,
                            child: const Text('Keyingi'),
                          ),
                        ],
                      ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class SanatoriumScreen extends StatelessWidget {
  final Api api;
  final String id;
  const SanatoriumScreen(this.api, this.id, {super.key});
  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Sanatoriya',
    body: CachedContent(
      cached: () => CatalogCache(api).cachedDetail(id),
      refresh: () => CatalogCache(api).refreshDetail(id),
      changes: CatalogCache(api),
      clearWhenMissing: true,
      builder: (v) {
        final s = asJson(v),
            photos = (s['photo_ids'] as List? ?? [])
                .map((p) => p.toString())
                .toList(),
            rates = rows(s['rate_plans']);
        final available =
            rates.isNotEmpty && s['online_booking_available'] != false;
        final sorted = [...rates]
          ..sort(
            (a, b) =>
                BigInt.parse(a['baseAmount'].toString())
                    .compareTo(BigInt.parse(b['baseAmount'].toString())),
          );
        void tariffs([String? roomId]) => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TariffScreen(api, s, roomId: roomId),
          ),
        );
        return Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                children: [
                  if (photos.isNotEmpty)
                    SanatoriumGallery(api, photos)
                  else
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: PlacePhoto(api, s, height: 210),
                    ),
                  const SizedBox(height: 18),
                  Text(
                    s['name'] ?? '',
                    style: conceptHeading(context, size: 27),
                  ),
                  ConceptRow(
                    'map-pin',
                    [s['region'], s['address']]
                        .where((x) => x != null && x.toString().isNotEmpty)
                        .join(' · '),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final a in s['amenities'] as List? ?? [])
                        Chip(
                          avatar: SihhatIcon(
                            amenityIcon(a.toString()),
                            size: 18,
                          ),
                          label: Text(a.toString()),
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text('Xonalar va tariflar', style: conceptHeading(context)),
                  const SizedBox(height: 14),
                  for (final type in rows(
                    s['room_types'],
                  ).where((t) => rates.any((r) => r['roomTypeId'] == t['id'])))
                    ConceptCard(
                      onTap: available ? () => tariffs(type['id']) : null,
                      child: Row(
                        children: [
                          const IconTile('bed-double', size: 64),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  type['name'] ?? '',
                                  style: conceptHeading(context, size: 17),
                                ),
                                ConceptRow(
                                  'users',
                                  '${type['maxGuests']} mehmon',
                                ),
                                Text(
                                  '${money(rates.firstWhere((r) => r['roomTypeId'] == type['id'])['baseAmount'])} / tun',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SihhatIcon('chevron-right', size: 20),
                        ],
                      ),
                    ),
                  if (!available)
                    const ConceptInfo(
                      title: 'Onlayn bron vaqtincha mavjud emas',
                      text: 'Profil va suratlarni ko‘rishingiz mumkin.',
                    ),
                  Text('Sanatoriya haqida', style: conceptHeading(context)),
                  const SizedBox(height: 10),
                  Text(
                    s['description'] ?? '',
                    style: TextStyle(color: context.colors.muted, height: 1.7),
                  ),
                  const SizedBox(height: 20),
                  if ((s['services'] as List? ?? []).isNotEmpty)
                    ConceptInfo(
                      icon: 'heart-pulse',
                      title: 'Xizmatlar',
                      text: (s['services'] as List).join(', '),
                    ),
                  if ((s['meals'] ?? '').toString().isNotEmpty)
                    ConceptInfo(
                      icon: 'utensils',
                      title: 'Ovqatlanish',
                      text: s['meals'].toString(),
                    ),
                  ConceptCard(
                    padding: EdgeInsets.zero,
                    child: ConceptMenuRow(
                      'file-text',
                      'Kelish uchun ma’lumotlar',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => ConditionsScreen(s)),
                      ),
                    ),
                  ),
                  if (s['map_url'] != null ||
                      s['latitude'] != null && s['longitude'] != null)
                    OutlinedButton.icon(
                      icon: const SihhatIcon('map-pin', size: 20),
                      label: const Text('Xaritada ochish'),
                      onPressed: () {
                        final uri = Uri.tryParse(
                          s['map_url'] ??
                              'https://www.google.com/maps/search/?api=1&query=${s['latitude']},${s['longitude']}',
                        );
                        if (uri != null &&
                            ['http', 'https'].contains(uri.scheme)) {
                          launchUrl(uri);
                        }
                      },
                    ),
                  const SizedBox(height: 24),
                  Text(
                    'Tekshirilgan yashash sharhlari',
                    style: conceptHeading(context),
                  ),
                  const SizedBox(height: 14),
                  if (rows(s['reviews']).isEmpty)
                    Text(
                      'Sharhlar hozircha yo‘q.',
                      style: TextStyle(color: context.colors.muted),
                    ),
                  for (final r in rows(s['reviews']))
                    ConceptCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const SihhatIcon(
                                'star',
                                color: Color(0xffffbb28),
                                size: 18,
                                filled: true,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${r['rating']} / 5 · tasdiqlangan yashash',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(r['text'] ?? ''),
                          if (r['reply'] != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Text(
                                'Sanatoriya: ${r['reply']}',
                                style: TextStyle(color: context.colors.muted),
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            ConceptDock(
              label: 'Tarifni tanlash',
              amount: sorted.isEmpty ? null : money(sorted.first['baseAmount']),
              caption: 'Bir tun uchun',
              onPressed: available ? () => tariffs() : null,
            ),
          ],
        );
      },
    ),
  );
}

class TariffScreen extends StatefulWidget {
  final Api api;
  final Json sanatorium;
  final String? roomId;
  const TariffScreen(this.api, this.sanatorium, {this.roomId, super.key});
  @override
  State<TariffScreen> createState() => _TariffScreenState();
}

class _TariffScreenState extends State<TariffScreen> {
  String? selected;
  List<Json> get rates => rows(widget.sanatorium['rate_plans'])
      .where((r) => widget.roomId == null || r['roomTypeId'] == widget.roomId)
      .toList();
  @override
  void initState() {
    super.initState();
    if (rates.isNotEmpty) selected = rates.first['id'];
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Xonalar va tariflar',
    bottom: ConceptScope(
      child: ConceptDock(
        label: 'Shu tarifni tanlash',
        onPressed:
            selected == null ||
                widget.sanatorium['online_booking_available'] == false
            ? null
            : () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BookingComposer(
                    widget.api,
                    widget.sanatorium,
                    initialRateId: selected,
                  ),
                ),
              ),
      ),
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Sizga mos tarifni tanlang',
          style: conceptHeading(context, size: 24),
        ),
        const SizedBox(height: 8),
        Text(
          'Narx va bekor qilish shartlari tarifga bog‘liq.',
          style: TextStyle(color: context.colors.muted),
        ),
        const SizedBox(height: 20),
        for (final r in rates)
          ConceptCard(
            key: ValueKey('select-rate-${r['id']}'),
            onTap: () => setState(() => selected = r['id']),
            color: selected == r['id'] ? context.colors.soft : null,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const IconTile('bed-double'),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            r['name'] ?? '',
                            style: conceptHeading(context, size: 18),
                          ),
                          Text(
                            rows(widget.sanatorium['room_types']).firstWhere(
                                  (t) => t['id'] == r['roomTypeId'],
                                  orElse: () => {},
                                )['name'] ??
                                '',
                            style: TextStyle(color: context.colors.muted),
                          ),
                        ],
                      ),
                    ),
                    SihhatIcon(
                      selected == r['id'] ? 'circle-check' : 'plus',
                      color: context.colors.primary,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  '${money(r['baseAmount'])} / tun',
                  style: conceptHeading(context, size: 22),
                ),
                Text(
                  r['mode'] == 'PERSON'
                      ? 'Har bir kishi uchun'
                      : 'Butun xona uchun',
                  style: TextStyle(color: context.colors.muted, fontSize: 13),
                ),
                const Divider(height: 28),
                for (final item
                    in r['packageDetails']?['included'] as List? ?? [])
                  ConceptRow('check', item.toString()),
                if (r['policy']?['name'] != null)
                  ConceptRow('shield-check', r['policy']['name']),
                if (r['policy']?['text'] != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      r['policy']['text'],
                      style: TextStyle(
                        color: context.colors.muted,
                        fontSize: 13,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        if (rates.isEmpty) const EmptyView('Tariflar hozircha mavjud emas.'),
      ],
    ),
  );
}

class ConditionsScreen extends StatelessWidget {
  final Json sanatorium;
  const ConditionsScreen(this.sanatorium, {super.key});
  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Shartlar va ma’lumotlar',
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        for (final item in <(String, String, String)>[
          (
            'clock',
            'Joylashish va ketish',
            [
              sanatorium['check_in_time'],
              sanatorium['check_out_time'],
            ].where((v) => v != null).join(' · '),
          ),
          (
            'users',
            'Bolalar uchun',
            (sanatorium['child_rules'] ?? '').toString(),
          ),
          (
            'heart-pulse',
            'Tibbiy talablar',
            (sanatorium['medical_requirements'] ?? '').toString(),
          ),
          (
            'file-text',
            'Kerakli hujjatlar',
            (sanatorium['required_documents'] ?? '').toString(),
          ),
        ])
          if (item.$3.isNotEmpty)
            ConceptCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconTile(item.$1),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          item.$2,
                          style: conceptHeading(context, size: 18),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    item.$3,
                    style: TextStyle(color: context.colors.muted, height: 1.7),
                  ),
                ],
              ),
            ),
        const ConceptInfo(
          icon: 'shield-check',
          title: 'Bron qilishdan oldin',
          text: 'Tanlangan tarifning yakuniy narxi va bekor qilish shartlari tasdiqlash bosqichida ko‘rsatiladi.',
        ),
      ],
    ),
  );
}

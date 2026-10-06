import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import '../data/catalog_cache.dart';
import '../widgets.dart';
import '../design.dart';
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
  String region = '', amenity = '', maxPrice = '';
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
    amenity: amenity,
    maxPrice: maxPrice,
  );
  void updated() {
    if (!mounted) return;
    setState(() {
      if (page > (load()['pages'] as int).clamp(1, 1000000)) page = 1;
    });
  }

  void reload() {
    if (!mounted) return;
    setState(() {});
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
  Future<void> filters() async {
    final reg = TextEditingController(text: region),
        am = TextEditingController(text: amenity),
        price = TextEditingController(text: maxPrice);
    String? error;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (c) => StatefulBuilder(
        builder: (c, set) => SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.viewInsetsOf(c).bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionTitle('Sanatoriya qidirish'),
              TextField(
                controller: reg,
                decoration: const InputDecoration(labelText: 'Hudud'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: am,
                decoration: const InputDecoration(
                  labelText: 'Sharoit, masalan Wi-Fi',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Eng ko‘p kunlik narx (so‘m)',
                  errorText: error,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (price.text.trim().isNotEmpty &&
                      !RegExp(r'^\d{1,15}$').hasMatch(price.text.trim())) {
                    set(() => error = 'Narxni raqam bilan kiriting.');
                    return;
                  }
                  setState(() {
                    region = reg.text.trim();
                    amenity = am.text.trim();
                    maxPrice = price.text.trim();
                    page = 1;
                  });
                  Navigator.pop(c);
                },
                child: const Text('Natijalarni ko‘rish'),
              ),
              TextButton(
                onPressed: () {
                  reg.clear();
                  am.clear();
                  price.clear();
                },
                child: const Text('Filtrlarni tozalash'),
              ),
            ],
          ),
        ),
      ),
    );
    reg.dispose();
    am.dispose();
    price.dispose();
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: catalog.sync,
    child: ListView(
      padding: const EdgeInsets.all(20),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: search,
                decoration: const InputDecoration(
                  hintText: 'Nomi yoki hududi',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (_) {
                  debounce?.cancel();
                  debounce = Timer(const Duration(milliseconds: 350), () {
                    page = 1;
                    reload();
                  });
                },
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: filters,
              tooltip: 'Filtrlar',
              icon: const Icon(Icons.tune),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Builder(
          builder: (c) {
            if (!catalog.loaded ||
                !catalog.hasSnapshot && catalog.error == null) {
              return const Busy();
            }
            if (!catalog.hasSnapshot && catalog.error != null) {
              return ErrorView(
                'Sanatoriyalarni birinchi marta yuklash uchun internetga ulaning.',
                retry: catalog.sync,
              );
            }
            final data = load(), items = rows(data);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${data['total']} ta sanatoriya',
                  style: TextStyle(color: context.colors.muted),
                ),
                const SizedBox(height: 12),
                if (items.isEmpty) const EmptyView('Mos sanatoriya topilmadi.'),
                ...items.map(
                  (s) => SanatoriumCard(
                    item: s,
                    api: widget.api,
                    open: () => open(s['id']),
                  ),
                ),
                if ((data['pages'] ?? 1) > 1)
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
                      Text('$page / ${data['pages']}'),
                      TextButton(
                        onPressed: page < data['pages']
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
            );
          },
        ),
      ],
    ),
  );
}

class SanatoriumScreen extends StatelessWidget {
  final Api api;
  final String id;
  const SanatoriumScreen(this.api, this.id, {super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Sanatoriya')),
    body: CachedContent(
      cached: () => CatalogCache(api).cachedDetail(id),
      refresh: () => CatalogCache(api).refreshDetail(id),
      changes: CatalogCache(api),
      clearWhenMissing: true,
      builder: (v) {
        final s = asJson(v),
            photos = s['photo_ids'] as List? ?? [],
            rates = rows(s['rate_plans']);
        return Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  if (photos.isNotEmpty)
                    SizedBox(
                      height: 230,
                      child: PageView(
                        children: photos
                            .map(
                              (p) => ClipRRect(
                                borderRadius: BorderRadius.circular(20),
                                child: SanatoriumPhoto(
                                  api: api,
                                  id: p.toString(),
                                  fit: BoxFit.cover,
                                  fallback: Icon(
                                    Icons.landscape,
                                    size: 70,
                                    color: context.colors.primary,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  if (photos.isEmpty)
                    SizedBox(
                      height: 200,
                      child: ClipRRect(
                        borderRadius: BorderRadius.all(Radius.circular(24)),
                        child: ColoredBox(
                          color: context.colors.soft,
                          child: CustomPaint(
                            painter: RetreatLandscape(
                              dark:
                                  Theme.of(context).brightness ==
                                  Brightness.dark,
                            ),
                            size: Size.infinite,
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 20),
                  Text(
                    s['name'],
                    style: TextStyle(
                      fontSize: 27,
                      fontWeight: FontWeight.w700,
                      color: context.colors.ink,
                    ),
                  ),
                  Text(
                    '${s['region']} · ${s['address']}',
                    style: TextStyle(color: context.colors.muted),
                  ),
                  const SizedBox(height: 20),
                  const SectionTitle('Xonalar va tariflar'),
                  ...rows(s['room_types'])
                      .where(
                        (type) => rates.any(
                          (rate) => rate['roomTypeId'] == type['id'],
                        ),
                      )
                      .map(
                        (type) => _tariffs(
                          context,
                          s,
                          type,
                          rates
                              .where((rate) => rate['roomTypeId'] == type['id'])
                              .toList(),
                        ),
                      ),
                  if (rates.isEmpty)
                    const Text('Tariflar hozircha mavjud emas.'),
                  const SizedBox(height: 15),
                  Text(
                    s['description'] ?? '',
                    style: const TextStyle(height: 1.8),
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 5,
                    children: (s['amenities'] as List? ?? [])
                        .map((a) => Chip(label: Text(a)))
                        .toList(),
                  ),
                  _info(
                    context,
                    'Xizmatlar',
                    (s['services'] as List? ?? []).join(', '),
                  ),
                  _info(context, 'Ovqatlanish', s['meals']),
                  const SizedBox(height: 16),
                  Card(
                    child: ExpansionTile(
                      leading: Icon(
                        Icons.info_outline_rounded,
                        color: context.colors.primary,
                      ),
                      title: const Text(
                        'Kelish uchun ma’lumotlar',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                      children: [
                        _info(context, 'Bolalar', s['child_rules']),
                        _info(
                          context,
                          'Tibbiy talablar',
                          s['medical_requirements'],
                        ),
                        _info(
                          context,
                          'Kerakli hujjatlar',
                          s['required_documents'],
                        ),
                        _info(
                          context,
                          'Vaqtlar',
                          'Joylashish ${s['check_in_time']} · ketish ${s['check_out_time']}',
                        ),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => launchUrl(
                      Uri.parse(
                        s['map_url'] ??
                            'https://www.google.com/maps/search/?api=1&query=${s['latitude']},${s['longitude']}',
                      ),
                    ),
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Xaritada ochish'),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'Tekshirilgan yashash sharhlari',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
                  ),
                  ...rows(s['reviews']).map(
                    (r) => Card(
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${r['rating']} / 5 · tasdiqlangan yashash',
                              style: TextStyle(
                                color: context.colors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 7),
                            Text(r['text']),
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
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    ),
  );
  Widget _tariffs(
    BuildContext context,
    Json s,
    Json type,
    List<Json> rates,
  ) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            type['name'] ?? '',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
          ),
          Text(
            '${type['maxGuests']} kishigacha',
            style: TextStyle(color: context.colors.muted, fontSize: 12),
          ),
          for (final rate in rates) ...[
            const Divider(height: 24),
            Text(
              rate['name'] ?? '',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            Text(
              '${money(rate['baseAmount'])} / tun${rate['mode'] == 'PERSON' ? ' · kishi uchun' : ' · butun xona'}',
              style: TextStyle(
                color: context.colors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (rate['policy']?['name'] != null)
              Text(
                rate['policy']['name'],
                style: TextStyle(color: context.colors.muted, fontSize: 12),
              ),
            if ((rate['packageDetails']?['included'] as List?)?.isNotEmpty ==
                true)
              Text((rate['packageDetails']['included'] as List).join(', ')),
            const SizedBox(height: 8),
            FilledButton.tonal(
              key: ValueKey('select-rate-${rate['id']}'),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) =>
                      BookingComposer(api, s, initialRateId: rate['id']),
                ),
              ),
              child: const Text('Shu tarifni tanlash'),
            ),
          ],
        ],
      ),
    ),
  );
  Widget _info(BuildContext context, String title, dynamic text) => Padding(
    padding: const EdgeInsets.only(top: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: context.colors.ink,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          (text ?? '').toString(),
          style: TextStyle(color: context.colors.muted, height: 1.6),
        ),
      ],
    ),
  );
}

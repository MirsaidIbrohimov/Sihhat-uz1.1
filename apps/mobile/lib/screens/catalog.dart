import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import 'login.dart';
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
  late Future<dynamic> future;
  int page = 1;
  String region = '', amenity = '', maxPrice = '';
  @override
  void initState() {
    super.initState();
    search.text = widget.initialQuery;
    future = load();
    if (widget.showFilters) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) filters();
      });
    }
  }

  Future<dynamic> load() => widget.api.send(
    '/catalog/sanatoriums${q({'page': page, 'limit': 100, 'sort': 'NAME', if (search.text.trim().isNotEmpty) 'q': search.text.trim(), if (region.isNotEmpty) 'region': region, if (amenity.isNotEmpty) 'amenity': amenity, if (maxPrice.isNotEmpty) 'max_price': (BigInt.parse(maxPrice) * BigInt.from(100)).toString()})}',
  );
  void reload() {
    if (!mounted) return;
    setState(() {
      future = load();
    });
  }

  @override
  void dispose() {
    debounce?.cancel();
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
                    future = load();
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
    onRefresh: () async {
      reload();
      await future;
    },
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
        FutureBuilder(
          future: future,
          builder: (c, snap) {
            if (snap.connectionState != ConnectionState.done && !snap.hasData) {
              return const Busy();
            }
            if (snap.hasError) return ErrorView(snap.error!, retry: reload);
            final data = asJson(snap.data), items = rows(data);
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
    body: AsyncContent(
      load: () => api.send('/catalog/sanatoriums/$id'),
      builder: (v) {
        final s = asJson(v),
            photos = s['photo_ids'] as List,
            rates = rows(s['rate_plans']);
        final amounts =
            rates.map((r) => BigInt.parse(r['baseAmount'].toString())).toList()
              ..sort();
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
                                child: Image.network(
                                  api.image(p),
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => Icon(
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
                  const SizedBox(height: 15),
                  Text(s['description'], style: const TextStyle(height: 1.8)),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 5,
                    children: (s['amenities'] as List)
                        .map((a) => Chip(label: Text(a)))
                        .toList(),
                  ),
                  _info(
                    context,
                    'Xizmatlar',
                    (s['services'] as List).join(', '),
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
                  const Divider(height: 35),
                  const Text(
                    'Xonalar va tariflar',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                  ),
                  ...rates.map(
                    (r) => Card(
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              r['name'],
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              '${money(r['baseAmount'])} · bir tun · ${r['mode'] == 'ROOM' ? 'butun xona' : 'kishi'} uchun',
                            ),
                            Text(
                              r['policy']['name'],
                              style: TextStyle(
                                fontSize: 12,
                                color: context.colors.muted,
                              ),
                            ),
                            if ((r['packageDetails']?['included'] as List?)
                                    ?.isNotEmpty ==
                                true)
                              Text(
                                (r['packageDetails']['included'] as List).join(
                                  ', ',
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
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
            ActionDock(
              amount: amounts.isEmpty ? null : money(amounts.first),
              caption: 'Boshlang‘ich tarif',
              label: s['online_booking_available'] == true
                  ? 'Sana va xonalarni tanlash'
                  : 'Onlayn bron hozir yopiq',
              onPressed:
                  s['online_booking_available'] == true && rates.isNotEmpty
                  ? () async {
                      if (await ensureLogin(context, api) && context.mounted) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => BookingComposer(api, s),
                          ),
                        );
                      }
                    }
                  : null,
            ),
          ],
        );
      },
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

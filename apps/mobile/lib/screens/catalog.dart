import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import '../data/home_feed.dart';
import '../widgets.dart';
import '../design.dart';
import 'login.dart';
import 'booking.dart';
import 'home_info.dart';

class CatalogScreen extends StatefulWidget {
  final Api api;
  const CatalogScreen(this.api, {super.key});
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final search = TextEditingController();
  final searchFocus = FocusNode();
  final searchTarget = GlobalKey();
  late Future<dynamic> future;
  late Future<dynamic> adFuture;
  Timer? debounce;
  String region = '', amenity = '', sort = 'NAME', maxPrice = '';
  int page = 1;
  final selected = <String>{};
  final saved = <String>{};
  late final HomeFeed feed;
  Json? homeData;
  bool homeLoading = true, homeCached = false;
  bool favoritesLoaded = false;
  @override
  void initState() {
    super.initState();
    future = load();
    adFuture = widget.api.send('/catalog/ads');
    feed = HomeFeed(widget.api);
    refreshHome();
    loadFavorites();
  }

  @override
  void didUpdateWidget(covariant CatalogScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    loadFavorites();
  }

  void loadFavorites() {
    if (widget.api.signedIn && !favoritesLoaded) {
      favoritesLoaded = true;
      widget.api
          .send('/customer/favorites')
          .then((r) {
            if (mounted) {
              setState(
                () => saved.addAll(rows(r).map((s) => s['id'] as String)),
              );
            }
          })
          .catchError((_) {
            favoritesLoaded = false;
          });
    }
  }

  Future<void> refreshHome() async {
    if (homeData == null) {
      final cached = await feed.cached();
      if (cached != null && mounted) {
        setState(() {
          homeData = cached;
          homeCached = true;
        });
      }
    }
    try {
      final data = await feed.refresh();
      if (mounted) {
        setState(() {
          homeData = data;
          homeCached = false;
        });
      }
    } catch (_) {
      if (mounted && homeData != null) setState(() => homeCached = true);
    } finally {
      if (mounted) setState(() => homeLoading = false);
    }
  }

  Future<dynamic> load() => widget.api.send(
    '/catalog/sanatoriums${q({'page': page, 'limit': 12, 'sort': sort, if (search.text.trim().isNotEmpty) 'q': search.text.trim(), if (region.isNotEmpty) 'region': region, if (amenity.isNotEmpty) 'amenity': amenity, if (maxPrice.isNotEmpty) 'max_price': (BigInt.parse(maxPrice) * BigInt.from(100)).toString()})}',
  );
  void reload() => setState(() {
    future = load();
  });
  @override
  void dispose() {
    search.dispose();
    searchFocus.dispose();
    debounce?.cancel();
    super.dispose();
  }

  void open(String id) => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => SanatoriumScreen(widget.api, id)),
  );
  Future<void> save(Json item) async {
    if (!await ensureLogin(context, widget.api)) return;
    try {
      final id = item['id'] as String;
      await widget.api.send(
        '/customer/favorites/$id',
        method: 'POST',
        body: {'saved': !saved.contains(id)},
      );
      setState(() => saved.contains(id) ? saved.remove(id) : saved.add(id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> filters() async {
    final reg = TextEditingController(text: region),
        am = TextEditingController(text: amenity),
        price = TextEditingController(text: maxPrice);
    String picked = sort;
    String? priceError;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (c) => ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(c).height * .9,
        ),
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            22,
            22,
            22,
            MediaQuery.viewInsetsOf(c).bottom + 22,
          ),
          child: StatefulBuilder(
            builder: (c, set) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Qidiruv filtrlari',
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 20),
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
                    labelText: 'Eng ko‘p boshlang‘ich narx (so‘m)',
                    errorText: priceError,
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: picked,
                  decoration: const InputDecoration(labelText: 'Saralash'),
                  items: const [
                    DropdownMenuItem(
                      value: 'NAME',
                      child: Text('Nomi bo‘yicha'),
                    ),
                    DropdownMenuItem(
                      value: 'PRICE',
                      child: Text('Narxi bo‘yicha'),
                    ),
                  ],
                  onChanged: (v) => set(() => picked = v!),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () {
                    if (price.text.isNotEmpty &&
                        !RegExp(r'^\d{1,15}$').hasMatch(price.text.trim())) {
                      set(
                        () => priceError = 'Narxni faqat raqam bilan kiriting.',
                      );
                      return;
                    }
                    setState(() {
                      region = reg.text.trim();
                      amenity = am.text.trim();
                      maxPrice = price.text.trim();
                      sort = picked;
                      page = 1;
                      future = load();
                    });
                    Navigator.pop(c);
                  },
                  child: const Text('Natijalarni ko‘rish'),
                ),
                TextButton(
                  onPressed: () => set(() {
                    reg.clear();
                    am.clear();
                    price.clear();
                    picked = 'NAME';
                    priceError = null;
                  }),
                  child: const Text('Filtrlarni tozalash'),
                ),
              ],
            ),
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
      adFuture = widget.api.send('/catalog/ads');
      await Future.wait([future, refreshHome()]);
    },
    child: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        WellnessHero(
          search: () {
            final target = searchTarget.currentContext;
            if (target != null) {
              Scrollable.ensureVisible(
                target,
                duration: const Duration(milliseconds: 280),
                alignment: .1,
              );
            }
            searchFocus.requestFocus();
          },
        ),
        const SizedBox(height: 20),
        TextField(
          key: searchTarget,
          controller: search,
          focusNode: searchFocus,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: 'Sanatoriya yoki hudud',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(
              tooltip: 'Qidiruv filtrlari',
              style: IconButton.styleFrom(backgroundColor: context.colors.soft),
              onPressed: filters,
              icon: const Icon(Icons.tune),
            ),
          ),
          onChanged: (_) {
            debounce?.cancel();
            debounce = Timer(const Duration(milliseconds: 400), () {
              page = 1;
              reload();
            });
          },
        ),
        if (region.isNotEmpty || amenity.isNotEmpty || maxPrice.isNotEmpty)
          Wrap(
            spacing: 6,
            children: [
              if (region.isNotEmpty)
                Chip(
                  label: Text(region),
                  onDeleted: () {
                    region = '';
                    reload();
                  },
                ),
              if (amenity.isNotEmpty)
                Chip(
                  label: Text(amenity),
                  onDeleted: () {
                    amenity = '';
                    reload();
                  },
                ),
              if (maxPrice.isNotEmpty)
                Chip(
                  label: Text('$maxPrice so‘mgacha'),
                  onDeleted: () {
                    maxPrice = '';
                    reload();
                  },
                ),
            ],
          ),
        const SizedBox(height: 15),
        HomeHighlights(
          data: homeData,
          loading: homeLoading,
          cached: homeCached,
          region: region,
          selectRegion: (value) {
            region = value;
            page = 1;
            reload();
          },
        ),
        FutureBuilder(
          key: const ValueKey('home-ads'),
          future: adFuture,
          builder: (c, s) {
            if (s.connectionState != ConnectionState.done || !s.hasData) {
              return const SizedBox();
            }
            return Column(
              children: rows(s.data)
                  .map(
                    (ad) => Card(
                      color: context.colors.soft,
                      child: ListTile(
                        leading: Icon(
                          Icons.campaign_outlined,
                          color: context.colors.primary,
                        ),
                        title: Text(ad['title']),
                        subtitle: Text('Reklama · ${ad['text'] ?? ''}'),
                        onTap: () {
                          widget.api
                              .send(
                                '/catalog/ads/${ad['id']}/events',
                                method: 'POST',
                                body: {'kind': 'CLICK'},
                              )
                              .catchError((_) {
                                return null;
                              });
                          open(ad['sanatorium_id']);
                        },
                      ),
                    ),
                  )
                  .toList(),
            );
          },
        ),
        if (selected.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: FilledButton.tonal(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => CompareScreen(widget.api, selected.toList()),
                ),
              ),
              child: Text('Solishtirish (${selected.length}/3)'),
            ),
          ),
        FutureBuilder(
          key: const ValueKey('home-catalog'),
          future: future,
          builder: (c, s) {
            final waiting = s.connectionState != ConnectionState.done;
            final preview =
                (waiting || s.hasError) &&
                homeData != null &&
                page == 1 &&
                search.text.trim().isEmpty &&
                region.isEmpty &&
                amenity.isEmpty &&
                maxPrice.isEmpty;
            if (waiting && !preview) return const Busy();
            if (s.hasError && !preview) {
              return ErrorView(s.error!, retry: reload);
            }
            final data = preview
                    ? <String, dynamic>{
                        'data': homeData!['featured'],
                        'pages': 1,
                      }
                    : asJson(s.data),
                items = rows(data);
            if (items.isEmpty) {
              return const EmptyView(
                'Tanlangan filtrlar bo‘yicha sanatoriya topilmadi.',
              );
            }
            return Column(
              children: [
                if (preview && waiting)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: LinearProgressIndicator(minHeight: 2),
                  ),
                if (preview && s.hasError)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Katalog yangilanmadi. Quyida oxirgi yuklangan variantlar.',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                        TextButton(
                          onPressed: reload,
                          child: const Text('Yangilash'),
                        ),
                      ],
                    ),
                  ),
                ...items.map(
                  (item) => SanatoriumCard(
                    item: item,
                    api: widget.api,
                    open: () => open(item['id']),
                    trailing: CircleAvatar(
                      backgroundColor: context.colors.surface,
                      child: IconButton(
                        tooltip: saved.contains(item['id'])
                            ? 'Saqlanganlardan olib tashlash'
                            : 'Saqlash',
                        onPressed: () => save(item),
                        icon: Icon(
                          saved.contains(item['id'])
                              ? Icons.favorite
                              : Icons.favorite_border,
                          color: context.colors.primary,
                        ),
                      ),
                    ),
                    footer: CheckboxListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                      ),
                      visualDensity: VisualDensity.compact,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: const Text(
                        'Solishtirishga qo‘shish',
                        style: TextStyle(fontSize: 12),
                      ),
                      value: selected.contains(item['id']),
                      onChanged: (v) => setState(() {
                        if (v == false) {
                          selected.remove(item['id']);
                        } else if (selected.length < 3) {
                          selected.add(item['id']);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Bir vaqtda 3 ta sanatoriyani solishtirish mumkin.',
                              ),
                            ),
                          );
                        }
                      }),
                    ),
                  ),
                ),
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
                      child: const Text('← Oldingi'),
                    ),
                    Text('$page / ${data['pages']}'),
                    TextButton(
                      onPressed: page < data['pages']
                          ? () {
                              page++;
                              reload();
                            }
                          : null,
                      child: const Text('Keyingi →'),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
        HomeUpdates(api: widget.api, data: homeData),
      ],
    ),
  );
}

class FavoritesScreen extends StatelessWidget {
  final Api api;
  const FavoritesScreen(this.api, {super.key});
  @override
  Widget build(BuildContext context) => AsyncContent(
    load: () => api.send('/customer/favorites'),
    builder: (v) => rows(v).isEmpty
        ? ListView(children: const [EmptyView('Saqlangan sanatoriyalar yo‘q.')])
        : ListView(
            padding: const EdgeInsets.all(20),
            children: rows(v)
                .map(
                  (s) => SanatoriumCard(
                    item: s,
                    api: api,
                    open: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SanatoriumScreen(api, s['id']),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
  );
}

class CompareScreen extends StatelessWidget {
  final Api api;
  final List<String> ids;
  const CompareScreen(this.api, this.ids, {super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Sanatoriyalarni solishtirish')),
    body: AsyncContent(
      load: () => api.send('/catalog/compare${q({'ids': ids.join(',')})}'),
      builder: (v) => ListView(
        padding: const EdgeInsets.all(20),
        children: rows(v)
            .map(
              (s) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        s['name'],
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text('${s['region']} · ${s['address']}'),
                      const SizedBox(height: 10),
                      Text(
                        'Sharoitlar: ${(s['amenities'] as List).join(', ')}',
                      ),
                      Text('Ovqat: ${s['meals']}'),
                      Text(
                        'Joylashish: ${s['check_in_time']} · ketish: ${s['check_out_time']}',
                      ),
                      ...rows(s['rate_plans']).map(
                        (r) => Text(
                          '${r['name']}: ${money(r['baseAmount'])} · ${r['mode'] == 'ROOM' ? 'butun xona' : 'kishi'} uchun',
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => SanatoriumScreen(api, s['id']),
                          ),
                        ),
                        child: const Text('Batafsil ko‘rish'),
                      ),
                    ],
                  ),
                ),
              ),
            )
            .toList(),
      ),
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
                        'https://www.google.com/maps/search/?api=1&query=${s['latitude']},${s['longitude']}',
                      ),
                    ),
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Xaritada ochish'),
                  ),
                  TextButton.icon(
                    onPressed: () =>
                        launchUrl(Uri(scheme: 'tel', path: s['contact_phone'])),
                    icon: const Icon(Icons.phone_outlined),
                    label: Text(s['contact_phone']),
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

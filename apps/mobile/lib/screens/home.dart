import 'dart:async';

import 'package:flutter/material.dart';

import '../data/api.dart';
import '../data/home_feed.dart';
import '../design.dart';
import '../widgets.dart';
import 'account.dart';
import 'advertisements.dart';
import 'booking.dart';
import 'catalog.dart';
import 'home_info.dart';

class HomeScreen extends StatefulWidget {
  final Api api;
  final ValueChanged<int>? onNavigate;
  final VoidCallback? onCatalog;
  const HomeScreen(this.api, {this.onNavigate, this.onCatalog, super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  late HomeFeed feed;
  Json? data;
  List<Json> ads = [];
  bool cached = false, loading = true;
  String? error;
  Timer? timer;
  int adRequest = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    feed = HomeFeed(widget.api);
    refresh();
    timer = Timer.periodic(const Duration(seconds: 30), (_) {
      refreshAds();
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) refresh();
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      adRequest++;
      if (mounted) setState(() => ads = []);
    }
  }

  Future<void> refreshAds() async {
    final request = ++adRequest;
    try {
      final value = rows(await widget.api.send('/catalog/ads'))
          .where((ad) => ad['placement'] == 'HOME')
          .toList();
      if (mounted && request == adRequest) setState(() => ads = value);
    } catch (_) {
      if (mounted && request == adRequest) setState(() => ads = []);
    }
  }

  Future<void> refreshInfo() async {
    try {
      final value = await feed.refresh();
      if (mounted) {
        setState(() {
          data = value;
          cached = false;
          error = null;
          loading = false;
        });
      }
    } catch (e) {
      final value = await feed.cached();
      if (mounted) {
        setState(() {
          data = value;
          cached = value != null;
          error = value == null ? e.toString() : null;
          loading = false;
        });
      }
    }
  }

  Future<void> refresh() async {
    await Future.wait([refreshInfo(), refreshAds()]);
  }

  void navigate(int tab) {
    if (widget.onNavigate != null) {
      widget.onNavigate!(tab);
      return;
    }
    final screen = switch (tab) {
      2 => BookingsScreen(widget.api),
      3 => AiScreen(widget.api),
      _ => CatalogScreen(widget.api),
    };
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(
            title: Text(
              tab == 2
                  ? 'Bronlarim'
                  : tab == 3
                  ? 'AI yordam'
                  : 'Sanatoriyalar',
            ),
          ),
          body: screen,
        ),
      ),
    );
  }

  void filters() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Sanatoriya qidirish')),
          body: CatalogScreen(widget.api, showFilters: true),
        ),
      ),
    );
  }

  void support() => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => SupportScreen(widget.api)),
  );

  @override
  Widget build(BuildContext context) {
    final featured = rows(data?['featured']);
    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          WellnessHero(search: widget.onCatalog ?? () => navigate(1)),
          const SizedBox(height: 18),
          HomeShortcuts(
            actions: [
              HomeShortcut(
                'Sanatoriya\nqidirish',
                Icons.search_rounded,
                widget.onCatalog ?? () => navigate(1),
              ),
              HomeShortcut(
                'Hudud va\nsharoitlar',
                Icons.forest_outlined,
                filters,
              ),
              HomeShortcut(
                'AI bilan\ntanlash',
                Icons.auto_awesome_outlined,
                () => navigate(3),
              ),
              HomeShortcut(
                'Bronlarim',
                Icons.event_available_outlined,
                () => navigate(2),
              ),
            ],
          ),
          const SizedBox(height: 14),
          HomeSectionHeading(
            'Mashhur sanatoriyalar',
            icon: Icons.spa_outlined,
            onAll: widget.onCatalog ?? () => navigate(1),
          ),
          if (loading && data == null) const Busy(),
          if (error != null) ErrorView(error!, retry: refresh),
          if (cached)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                'Saqlangan ma’lumot. Narx va mavjudlik bron hisobida yangilanadi.',
                style: TextStyle(color: context.colors.muted, fontSize: 12),
              ),
            ),
          if (!loading && error == null && featured.isEmpty)
            const EmptyView(
              'Sanatoriyalar e’lon qilingach shu yerda ko‘rinadi.',
            ),
          if (featured.isNotEmpty)
            SingleChildScrollView(
              key: const ValueKey('featured-sanatoriums'),
              scrollDirection: Axis.horizontal,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final item in featured)
                    Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: SizedBox(
                        width: MediaQuery.sizeOf(context).width < 400
                            ? 224
                            : 244,
                        child: FeaturedSanatoriumCard(
                          api: widget.api,
                          item: item,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          // Without an ad, its heading, loading state, and spacing are absent.
          if (ads.isNotEmpty)
            Padding(
              key: const ValueKey('home-advertisements'),
              padding: const EdgeInsets.only(top: 16),
              child: Column(
                children: [
                  for (final ad in ads)
                    AdvertisementCard(
                      key: ValueKey(ad['id']),
                      api: widget.api,
                      ad: ad,
                      onOpen: () => openAdvertisement(context, widget.api, ad),
                    ),
                ],
              ),
            ),
          const HomeSectionHeading(
            'Tezkor xizmatlar',
            icon: Icons.stars_outlined,
          ),
          HomeShortcuts(
            compact: true,
            actions: [
              HomeShortcut('Narx va\nsharoit', Icons.tune_rounded, filters),
              HomeShortcut(
                'Bron\nholati',
                Icons.fact_check_outlined,
                () => navigate(2),
              ),
              HomeShortcut(
                'Yordam\nxizmati',
                Icons.support_agent_rounded,
                support,
              ),
              HomeShortcut(
                'AI\nyordam',
                Icons.chat_bubble_outline_rounded,
                () => navigate(3),
              ),
            ],
          ),
          HomeUpdates(api: widget.api, data: data),
        ],
      ),
    );
  }
}

class HomeShortcut {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const HomeShortcut(this.label, this.icon, this.onTap);
}

class HomeShortcuts extends StatelessWidget {
  final List<HomeShortcut> actions;
  final bool compact;
  const HomeShortcuts({required this.actions, this.compact = false, super.key});
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final columns =
          constraints.maxWidth < 340 ||
              MediaQuery.textScalerOf(context).scale(12) > 15
          ? 2
          : 4;
      final width = (constraints.maxWidth - (columns - 1) * 8) / columns;
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final action in actions)
            SizedBox(
              width: width,
              child: Material(
                color: compact
                    ? context.colors.soft.withValues(alpha: .55)
                    : context.colors.surface,
                borderRadius: BorderRadius.circular(18),
                child: InkWell(
                  onTap: action.onTap,
                  borderRadius: BorderRadius.circular(18),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 14,
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(9),
                          decoration: BoxDecoration(
                            color: context.colors.soft,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            action.icon,
                            size: 26,
                            color: context.colors.primary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          action.label,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.35,
                            fontWeight: FontWeight.w700,
                            color: context.colors.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}

class HomeSectionHeading extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback? onAll;
  const HomeSectionHeading(
    this.title, {
    required this.icon,
    this.onAll,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 14),
    child: Row(
      children: [
        Icon(icon, color: context.colors.primary, size: 23),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: context.colors.ink,
            ),
          ),
        ),
        if (onAll != null)
          IconButton(
            tooltip: 'Barcha sanatoriyalarni ko‘rish',
            onPressed: onAll,
            icon: Icon(
              Icons.arrow_forward_ios_rounded,
              size: 17,
              color: context.colors.primary,
            ),
          ),
      ],
    ),
  );
}

class FeaturedSanatoriumCard extends StatelessWidget {
  final Api api;
  final Json item;
  const FeaturedSanatoriumCard({
    required this.api,
    required this.item,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final photos = item['photo_ids'] as List? ?? [];
    final rating = item['rating'] is Map ? asJson(item['rating']) : null;
    return Material(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => SanatoriumScreen(api, item['id'])),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 120,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ColoredBox(
                    color: context.colors.soft,
                    child: Icon(
                      Icons.landscape_outlined,
                      color: context.colors.primary,
                      size: 46,
                    ),
                  ),
                  if (photos.isNotEmpty)
                    Image.network(
                      api.image(photos.first),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  Positioned(
                    left: 10,
                    top: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: context.colors.surface,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Text(
                        'Sanatoriya',
                        style: TextStyle(
                          color: context.colors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (rating?['average'] != null &&
                      (rating?['count'] ?? 0) > 0) ...[
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          color: Color(0xffe7b325),
                          size: 18,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          (rating!['average'] as num).toStringAsFixed(1),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                  ],
                  Text(
                    item['name'] ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: context.colors.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        color: context.colors.primary,
                        size: 15,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          item['region'] ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: context.colors.muted,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item['from_amount'] == null
                              ? 'Tarifni ko‘ring'
                              : '${money(item['from_amount'])}dan',
                          style: TextStyle(
                            color: context.colors.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: context.colors.primary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Boshlang‘ich tarif',
                    style: TextStyle(color: context.colors.muted, fontSize: 10),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

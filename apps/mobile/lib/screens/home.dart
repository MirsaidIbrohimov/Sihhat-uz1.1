import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../data/api.dart';
import '../data/home_feed.dart';
import '../data/catalog_cache.dart';
import '../design.dart';
import '../concept_ui.dart';
import '../motion.dart';
import '../neon.dart';
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

  /// Greeting and search; it scrolls with the page as in the design.
  final Widget? header;
  const HomeScreen(
    this.api, {
    this.onNavigate,
    this.onCatalog,
    this.header,
    super.key,
  });
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
    CatalogCache(widget.api).addListener(catalogChanged);
    refresh();
    timer = Timer.periodic(const Duration(seconds: 30), (_) {
      refreshAds();
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    CatalogCache(widget.api).removeListener(catalogChanged);
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
    final saved = await feed.cached();
    if (mounted && data == null && saved != null) {
      setState(() {
        data = saved;
        cached = true;
        loading = false;
      });
    }
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
          data ??= value;
          cached = data != null;
          error = data == null && CatalogCache(widget.api).items.isEmpty
              ? e.toString()
              : null;
          loading = false;
        });
      }
    }
  }

  Future<void> refresh() async {
    await Future.wait([refreshInfo(), refreshAds()]);
  }

  void catalogChanged() {
    if (mounted) setState(() {});
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
    final catalog = CatalogCache(widget.api);
    var featured = rows(data?['featured']);
    if (catalog.hasSnapshot) {
      final ids = catalog.items.map((item) => item['id']).toSet();
      featured = featured.where((item) => ids.contains(item['id'])).toList();
      if (data == null) {
        featured = catalog.items
            .where((item) => item['featured_on_home'] == true)
            .toList();
      }
    }
    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ?widget.header,
          Reveal(
            index: 2,
            child: NeonHero(onMore: widget.onCatalog ?? () => navigate(1)),
          ),
          const SizedBox(height: 18),
          HomeShortcuts(
            revealFrom: 3,
            actions: [
              HomeShortcut(
                'Sanatoriya\nqidirish',
                Icons.travel_explore_rounded,
                widget.onCatalog ?? () => navigate(1),
              ),
              HomeShortcut(
                'Hudud va\nshaharlar',
                Icons.location_city_rounded,
                filters,
              ),
              HomeShortcut(
                'AI bilan\nmaslahat',
                Icons.auto_awesome_rounded,
                () => navigate(3),
              ),
              HomeShortcut(
                'Bronlarim',
                Icons.event_available_rounded,
                () => navigate(2),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (ads.isNotEmpty)
            Column(
              key: const ValueKey('home-advertisements'),
              children: [
                for (final ad in ads)
                  AdvertisementCard(
                    key: ValueKey(ad['id']),
                    api: widget.api,
                    ad: ad,
                    onOpen: () => openAdvertisement(context, widget.api, ad),
                  ),
              ],
            )
          else ...[
            HomeSectionHeading(
              'Mashhur sanatoriyalar',
              onAll: widget.onCatalog ?? () => navigate(1),
            ),
            if (loading && data == null && featured.isEmpty) const Busy(),
            if (error != null && featured.isEmpty)
              ErrorView(error!, retry: refresh),
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
                'Hozircha mashhur sanatoriyalar yo‘q.',
                icon: 'building-2',
              ),
            if (featured.isNotEmpty)
              SingleChildScrollView(
                key: const ValueKey('featured-sanatoriums'),
                scrollDirection: Axis.horizontal,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final (i, item) in featured.indexed)
                      Reveal(
                        index: 4 + i,
                        offset: const Offset(.2, 0),
                        child: Padding(
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
                      ),
                  ],
                ),
              ),
          ],
          const HomeSectionHeading(
            'Tezkor xizmatlar',
            glyph: Icons.bolt_rounded,
          ),
          HomeShortcuts(
            compact: true,
            revealFrom: 6,
            actions: [
              HomeShortcut('Narx va\nshahar', Icons.grid_view_rounded, filters),
              HomeShortcut(
                'Bron\nqilish',
                Icons.receipt_long_rounded,
                () => navigate(2),
              ),
              HomeShortcut(
                'Yordam\nxizmati',
                Icons.headset_mic_rounded,
                support,
              ),
              HomeShortcut(
                'AI\nyordam',
                Icons.chat_bubble_rounded,
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
  final int revealFrom;
  const HomeShortcuts({
    required this.actions,
    this.compact = false,
    this.revealFrom = 0,
    super.key,
  });
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final dark = Theme.of(context).brightness == Brightness.dark;
      final columns =
          constraints.maxWidth < 340 ||
              MediaQuery.textScalerOf(context).scale(12) > 15
          ? 2
          : 4;
      final width = (constraints.maxWidth - (columns - 1) * 10) / columns;
      return Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (final (i, action) in actions.indexed)
            SizedBox(
              width: width,
              child: Reveal(
                index: revealFrom + i,
                child: Pressable(
                  scale: .93,
                  child: Material(
                    color: context.colors.surface.withValues(
                      alpha: dark ? (compact ? .55 : .78) : 1,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: dark
                          ? BorderSide(color: neon.withValues(alpha: .3))
                          : BorderSide.none,
                    ),
                    child: InkWell(
                      onTap: action.onTap,
                      borderRadius: BorderRadius.circular(20),
                      splashColor: neon.withValues(alpha: .15),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 14,
                        ),
                        child: Column(
                          children: [
                            GlyphTile(action.icon, size: compact ? 46 : 50),
                            const SizedBox(height: 9),
                            ConstrainedBox(
                              // Two label lines for every tile keeps the row even.
                              constraints: BoxConstraints(
                                minHeight:
                                    MediaQuery.textScalerOf(context).scale(12) *
                                    1.3 *
                                    2,
                              ),
                              child: Center(
                                child: Text(
                                  action.label,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 12,
                                    height: 1.3,
                                    fontWeight: FontWeight.w700,
                                    color: context.colors.ink,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
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
  final IconData? glyph;
  final VoidCallback? onAll;
  const HomeSectionHeading(this.title, {this.glyph, this.onAll, super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 20, bottom: 10),
    child: Row(
      children: [
        if (glyph != null) ...[
          NeonGlyph(glyph!, size: 28),
          const SizedBox(width: 8),
        ],
        Expanded(child: Text(title, style: conceptHeading(context, size: 18))),
        if (onAll != null)
          Tooltip(
            message: 'Barcha sanatoriyalarni ko‘rish',
            child: TextButton(
              onPressed: onAll,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Barchasi',
                    style: TextStyle(
                      color: context.colors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 4),
                  SihhatIcon(
                    'arrow-right',
                    size: 16,
                    color: context.colors.primary,
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

/// The animated "Yangilik" banner: slow Ken Burns zoom and a light sweep.
class NeonHero extends StatefulWidget {
  final VoidCallback? onMore;
  const NeonHero({this.onMore, super.key});
  @override
  State<NeonHero> createState() => _NeonHeroState();
}

class _NeonHeroState extends State<NeonHero>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 9),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (ambientMotion(context)) {
      if (!controller.isAnimating) controller.repeat();
    } else {
      controller
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PulseGlow(
    borderRadius: BorderRadius.circular(24),
    strength: .55,
    period: const Duration(milliseconds: 3200),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Stack(
        children: [
          Positioned.fill(
            child: AnimatedBuilder(
              animation: controller,
              builder: (context, child) => Transform.scale(
                scale: 1.04 + .06 * math.sin(controller.value * 2 * math.pi),
                alignment: Alignment.centerRight,
                child: child,
              ),
              child: Image.asset(
                'assets/illustrations/wellness-retreat.png',
                fit: BoxFit.cover,
                alignment: Alignment.centerRight,
                excludeFromSemantics: true,
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    abyss.withValues(alpha: .96),
                    abyss.withValues(alpha: .66),
                    Colors.transparent,
                  ],
                  stops: const [0, .55, 1],
                ),
              ),
            ),
          ),
          // Diagonal light sweep crossing the banner every cycle.
          Positioned.fill(
            child: IgnorePointer(
              child: AnimatedBuilder(
                animation: controller,
                builder: (context, _) {
                  final x = -1.6 + (controller.value * 2 % 1) * 3.4;
                  return DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment(x - .5, -1),
                        end: Alignment(x + .5, 1),
                        colors: [
                          Colors.white.withValues(alpha: 0),
                          Colors.white.withValues(
                            alpha: controller.isAnimating ? .10 : 0,
                          ),
                          Colors.white.withValues(alpha: 0),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: neon.withValues(alpha: .45)),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: FractionallySizedBox(
              widthFactor: .8,
              alignment: Alignment.centerLeft,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: neon,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SihhatIcon('sparkles', color: abyss, size: 14),
                        SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            'Yangilik',
                            style: TextStyle(
                              color: abyss,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text.rich(
                    const TextSpan(
                      children: [
                        TextSpan(text: 'Sog‘lom hayot\nsari '),
                        TextSpan(
                          text: 'bir qadam!',
                          style: TextStyle(color: neon),
                        ),
                      ],
                    ),
                    style: conceptHeading(
                      context,
                      size: 24,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'O‘zingiz va yaqinlaringiz sog‘lig‘i uchun g‘amxo‘rlik qiling.',
                    style: TextStyle(
                      color: Color(0xffd5efe7),
                      fontSize: 12,
                      height: 1.45,
                    ),
                  ),
                  if (widget.onMore != null) ...[
                    const SizedBox(height: 14),
                    Pressable(
                      child: FilledButton(
                        onPressed: widget.onMore,
                        style: FilledButton.styleFrom(
                          backgroundColor: neon,
                          foregroundColor: abyss,
                          minimumSize: const Size(48, 42),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 9,
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(child: Text('Batafsil')),
                            SizedBox(width: 8),
                            SihhatIcon('arrow-right', size: 18),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
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
    final photos = ((item['photos'] as List?)?.isNotEmpty == true
        ? (item['photos'] as List)
        : (item['photo_ids'] as List? ?? []));
    final rating = item['rating'] is Map ? asJson(item['rating']) : null;
    return ConceptCard(
      padding: EdgeInsets.zero,
      margin: const EdgeInsets.only(bottom: 6),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => SanatoriumScreen(api, item['id'])),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 128,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(
                  color: context.colors.soft,
                  child: Center(
                    child: SihhatIcon(
                      'building-2',
                      color: context.colors.primary,
                      size: 46,
                    ),
                  ),
                ),
                if (photos.isNotEmpty)
                  SanatoriumPhoto(
                    api: api,
                    id: photos.first.toString(),
                    fit: BoxFit.cover,
                  ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Color(0xaa021a17)],
                      stops: [.5, 1],
                    ),
                  ),
                ),
                Positioned(
                  left: 10,
                  top: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: neon,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SihhatIcon('flame', size: 13, color: abyss),
                        SizedBox(width: 4),
                        Text(
                          'Top tanlov',
                          style: TextStyle(
                            color: abyss,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  right: 8,
                  top: 8,
                  child: FavoriteButton(api, item['id']?.toString(), size: 32),
                ),
                if (rating?['average'] != null && (rating?['count'] ?? 0) > 0)
                  Positioned(
                    right: 10,
                    bottom: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: abyss.withValues(alpha: .75),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SihhatIcon(
                            'star',
                            filled: true,
                            color: Color(0xffffc83d),
                            size: 13,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            (rating!['average'] as num).toStringAsFixed(1),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['name'] ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: conceptHeading(context, size: 16),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    SihhatIcon(
                      'map-pin',
                      color: context.colors.primary,
                      size: 14,
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
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['from_amount'] == null
                                ? 'Tarifni ko‘ring'
                                : '${money(item['from_amount'])}dan',
                            style: TextStyle(
                              color: context.colors.primary,
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Boshlang‘ich tarif',
                            style: TextStyle(
                              color: context.colors.muted,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const NeonArrow(),
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

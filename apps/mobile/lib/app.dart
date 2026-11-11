import 'dart:async';
import 'dart:io';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'data/api.dart';
import 'data/booking_cache.dart';
import 'data/catalog_cache.dart';
import 'appearance.dart';
import 'design.dart';
import 'concept_ui.dart';
import 'motion.dart';
import 'neon.dart';
import 'screens/account.dart';
import 'screens/booking.dart';
import 'screens/catalog.dart';
import 'screens/home.dart';
import 'screens/advertisements.dart';
import 'screens/login.dart';

class SihhatApp extends StatefulWidget {
  final Api api;
  final bool showDemoOtp;
  const SihhatApp({required this.api, this.showDemoOtp = false, super.key});
  @override
  State<SihhatApp> createState() => _SihhatAppState();
}

class _SihhatAppState extends State<SihhatApp> {
  late AppearanceController appearance;
  @override
  void initState() {
    super.initState();
    appearance = AppearanceController(widget.api.store)..load();
  }

  @override
  void didUpdateWidget(covariant SihhatApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.api != widget.api) {
      appearance.dispose();
      appearance = AppearanceController(widget.api.store)..load();
    }
  }

  @override
  void dispose() {
    appearance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: appearance,
    builder: (context, _) => AppearanceScope(
      controller: appearance,
      child: MaterialApp(
        title: 'Sihhat.uz',
        debugShowCheckedModeBanner: false,
        locale: const Locale('uz'),
        supportedLocales: const [Locale('uz'), Locale('en')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: sihhatTheme(),
        darkTheme: sihhatTheme(brightness: Brightness.dark),
        themeMode: appearance.mode,
        onGenerateRoute: (_) => MaterialPageRoute(
          builder: (_) => _Entry(widget.api, showDemoOtp: widget.showDemoOtp),
        ),
      ),
    ),
  );
}

class _Entry extends StatefulWidget {
  final Api api;
  final bool showDemoOtp;
  const _Entry(this.api, {required this.showDemoOtp});
  @override
  State<_Entry> createState() => _EntryState();
}

class _EntryState extends State<_Entry> with WidgetsBindingObserver {
  bool checking = true;
  String? error;
  Timer? _heartbeatTimer;
  bool _appResumed = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.api.session.addListener(sessionChanged);
    _startHeartbeat();
    restore();
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 45), (_) {
      if (_appResumed && widget.api.signedIn) {
        unawaited(_sendHeartbeat());
      }
    });
  }

  Future<void> _sendHeartbeat() async {
    try {
      await widget.api.send('/auth/heartbeat', method: 'POST', body: {});
    } catch (_) {
      // Heartbeat failure is non-fatal when offline.
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appResumed = state == AppLifecycleState.resumed;
    if (_appResumed && widget.api.signedIn) {
      unawaited(_sendHeartbeat());
    }
  }

  @override
  void didUpdateWidget(covariant _Entry oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.api != widget.api) {
      oldWidget.api.session.removeListener(sessionChanged);
      widget.api.session.addListener(sessionChanged);
      checking = true;
      restore();
    }
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    widget.api.session.removeListener(sessionChanged);
    super.dispose();
  }

  void sessionChanged() {
    if (!mounted || checking) return;
    if (!widget.api.signedIn) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
    setState(() {});
  }

  Future<void> restore() async {
    setState(() {
      checking = true;
      error = null;
    });
    try {
      await widget.api.restore();
      if (widget.api.signedIn) {
        if (await widget.api.cachedProfile() != null) {
          // Saved profiles/catalogue must open without waiting for a network.
          unawaited(validateSession());
          return;
        }
        try {
          // A revoked/expired session must be checked before opening the home.
          await widget.api.send('/auth/me');
        } on ApiException catch (e) {
          if (e.status == 401) {
            await widget.api.clear();
          } else {
            rethrow;
          }
        }
      }
    } catch (e) {
      if (mounted) error = e.toString();
    } finally {
      if (mounted) setState(() => checking = false);
    }
  }

  Future<void> validateSession() async {
    try {
      await widget.api.send('/auth/me');
    } on ApiException catch (e) {
      if (e.status == 401) await widget.api.clear();
    } catch (_) {
      // The last signed-in profile remains readable during a network outage.
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!AppearanceScope.maybeOf(context)!.loaded || checking) {
      return const GlassBackdrop(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                PulseGlow(child: NeonHeartLogo(size: 96)),
                SizedBox(height: 18),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: 'Sihhat'),
                      TextSpan(
                        text: '.uz',
                        style: TextStyle(color: neon),
                      ),
                    ],
                  ),
                  style: TextStyle(
                    fontFamily: 'Manrope',
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 24),
                CircularProgressIndicator(),
              ],
            ),
          ),
        ),
      );
    }
    if (!widget.api.signedIn) {
      return LoginScreen(
        widget.api,
        showDemoOtp: widget.showDemoOtp,
        onAuthenticated: () {
          setState(() {});
        },
      );
    }
    return Home(widget.api, sessionError: error, retrySession: restore);
  }
}

const _mainNavigationDestinations = [
  NavigationDestination(icon: SihhatIcon('home'), label: 'Bosh sahifa'),
  NavigationDestination(icon: SihhatIcon('building-2'), label: 'Sanatoriyalar'),
  NavigationDestination(icon: SihhatIcon('calendar-days'), label: 'Bronlar'),
  NavigationDestination(icon: SihhatIcon('message-square'), label: 'AI yordam'),
  NavigationDestination(icon: SihhatIcon('user-round'), label: 'Profil'),
];

class Home extends StatefulWidget {
  final Api api;
  final String? sessionError;
  final VoidCallback? retrySession;
  const Home(this.api, {this.sessionError, this.retrySession, super.key});
  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> with WidgetsBindingObserver {
  bool ready = false;
  String? error;
  int tab = 0, epoch = 0;
  final homeSearch = TextEditingController();
  String catalogQuery = '';
  Timer? catalogTimer;
  StreamSubscription<dynamic>? connection;
  bool active = true, unread = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    refreshDownloads();
    catalogTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (active) refreshDownloads();
    });
    if (Platform.isAndroid) {
      connection = const EventChannel('uz.sihhat/connectivity')
          .receiveBroadcastStream()
          .listen(
            (online) {
              if (online == true && active) refreshDownloads();
            },
            onError: (_) {
              /* Refresh on resume if the native connection listener is unavailable. */
            },
          );
    }
    error = widget.sessionError;
    restore().then((_) {
      if (!mounted || widget.sessionError != null) return;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) showEntranceAdvertisement(context, widget.api);
      });
      WidgetsBinding.instance.ensureVisualUpdate();
    });
  }

  Future<void> restore() async {
    try {
      if (mounted) setState(() => ready = true);
      final pending = await widget.api.getPendingBooking();
      if (pending != null && widget.api.signedIn && mounted) {
        try {
          final booking = await BookingCache(widget.api).refresh(pending);
          if (!bookingVisible(booking)) {
            await widget.api.pendingBooking(null);
            return;
          }
        } catch (_) {
          final saved = await BookingCache(widget.api).cached(pending);
          if (saved == null) return;
        }
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BookingScreen(widget.api, pending),
              ),
            );
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = e.toString();
          ready = true;
        });
      }
    }
  }

  void changed() {
    if (mounted) setState(() => epoch++);
  }

  @override
  void dispose() {
    catalogTimer?.cancel();
    connection?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    homeSearch.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    active = state == AppLifecycleState.resumed;
    if (active) refreshDownloads();
  }

  void refreshDownloads() {
    CatalogCache(widget.api).sync();
    if (widget.api.signedIn) {
      BookingCache(widget.api).sync();
      widget.api.refreshProfile().catchError((_) => <String, dynamic>{});
      refreshUnread();
    }
  }

  /// Red dot on the bell, as in the design, only for unread notifications.
  Future<void> refreshUnread() async {
    try {
      final items = rows(await widget.api.send('/notifications'));
      final value = items.any((n) => n['readAt'] == null);
      if (mounted && value != unread) setState(() => unread = value);
    } catch (_) {
      // The dot is a hint only; offline keeps the last known state.
    }
  }

  void openCatalog([String query = '']) {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      catalogQuery = query.trim();
      tab = 1;
      epoch++;
    });
  }

  Future<void> navigate(int n) async {
    if (!ready) return;
    if ((n == 2 || n == 3) && !await ensureLogin(context, widget.api)) return;
    if (mounted) setState(() => tab = n);
  }

  static const _titles = [
    ('', ''),
    ('Sanatoriyalar katalogi', 'Eng yaxshi sanatoriyalar'),
    ('Mening bronlarim', 'Barcha bronlaringiz ro‘yxati'),
    ('AI Salomatlik Maslahatchi', 'AI yordamchi va tavsiyalar'),
    ('Foydalanuvchi profili', 'Shaxsiy ma’lumot va sozlamalar'),
  ];

  Future<void> openNotifications(BuildContext context) async {
    if (await ensureLogin(context, widget.api) && context.mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => NotificationsScreen(widget.api)),
      );
      refreshUnread();
    }
  }

  Widget header(BuildContext c) {
    final bell = _HeaderButton(
      tooltip: 'Bildirishnomalar',
      icon: 'bell',
      dot: unread,
      onPressed: !ready ? null : () => openNotifications(c),
    );
    if (tab != 0) {
      return Padding(
        key: ValueKey('header-$tab'),
        padding: const EdgeInsets.fromLTRB(20, 10, 12, 10),
        child: Row(
          children: [
            Expanded(
              child: ConceptTitle(_titles[tab].$1, subtitle: _titles[tab].$2),
            ),
            bell,
          ],
        ),
      );
    }
    final pill = OutlineInputBorder(
      borderRadius: BorderRadius.circular(28),
      borderSide: BorderSide(color: neon.withValues(alpha: .35)),
    );
    return Padding(
      key: const ValueKey('header-0'),
      padding: const EdgeInsets.fromLTRB(4, 4, 0, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Reveal(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          SihhatIcon(
                            'map-pin',
                            size: 14,
                            color: c.colors.primary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              'Assalomu alaykum!',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: c.colors.muted,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const NeonHeartLogo(size: 40),
                          const SizedBox(width: 10),
                          Flexible(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text.rich(
                                TextSpan(
                                  children: [
                                    const TextSpan(text: 'Sihhat'),
                                    TextSpan(
                                      text: '.uz',
                                      style: TextStyle(color: c.colors.primary),
                                    ),
                                  ],
                                ),
                                style: conceptHeading(c, size: 28),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Sizning sog‘lig‘ingiz biz uchun muhim',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: c.colors.muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
              bell,
            ],
          ),
          const SizedBox(height: 14),
          Reveal(
            index: 1,
            child: Padding(
              padding: EdgeInsets.zero,
              child: TextField(
                controller: homeSearch,
                textInputAction: TextInputAction.search,
                maxLength: 100,
                style: TextStyle(color: c.colors.ink, fontSize: 14),
                onSubmitted: openCatalog,
                decoration: InputDecoration(
                  counterText: '',
                  hintText: 'Sanatoriya yoki hudud qidiring…',
                  prefixIcon: Padding(
                    padding: const EdgeInsets.all(12),
                    child: SihhatIcon('search', color: c.colors.muted),
                  ),
                  suffixIcon: Padding(
                    padding: const EdgeInsets.all(5),
                    child: IconButton.filled(
                      tooltip: 'Qidirish',
                      onPressed: () => openCatalog(homeSearch.text),
                      icon: SihhatIcon(
                        'arrow-right',
                        size: 20,
                        color: Theme.of(c).colorScheme.onPrimary,
                      ),
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  border: pill,
                  enabledBorder: pill,
                  focusedBorder: pill.copyWith(
                    borderSide: BorderSide(color: c.colors.primary, width: 1.5),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bodies = [
      HomeScreen(
        widget.api,
        header: Builder(builder: header),
        key: ValueKey('home-$epoch'),
        onNavigate: navigate,
        onCatalog: () => openCatalog(),
      ),
      CatalogScreen(
        widget.api,
        initialQuery: catalogQuery,
        key: ValueKey('catalog-$epoch'),
      ),
      BookingsScreen(
        widget.api,
        onCatalog: () => openCatalog(),
        key: ValueKey('bookings-$epoch'),
      ),
      AiScreen(widget.api, key: ValueKey('ai-$epoch')),
      ProfileScreen(widget.api, changed, key: ValueKey('profile-$epoch')),
    ];
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ConceptScope(
      child: Builder(
        builder: (c) => AnnotatedRegion<SystemUiOverlayStyle>(
          value: (dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark)
              .copyWith(
                statusBarColor: Colors.transparent,
                systemNavigationBarColor: dark ? abyss : c.colors.canvas,
              ),
          child: GlassBackdrop(
            child: Scaffold(
              backgroundColor: Colors.transparent,
              body: SafeArea(
                bottom: false,
                child: Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 720),
                    child: Column(
                      children: [
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 280),
                          child: tab == 0
                              ? const SizedBox(key: ValueKey('no-header'))
                              : header(c),
                        ),
                        if (error != null)
                          MaterialBanner(
                            backgroundColor: c.colors.warning,
                            leading: SihhatIcon(
                              'wifi-off',
                              color: c.colors.primary,
                            ),
                            dividerColor: Colors.transparent,
                            content: Text(error!),
                            actions: [
                              TextButton(
                                onPressed:
                                    widget.retrySession ??
                                    () {
                                      setState(() {
                                        error = null;
                                        ready = false;
                                      });
                                      restore();
                                    },
                                child: const Text('Qayta urinish'),
                              ),
                            ],
                          ),
                        Expanded(
                          // Content fades out under the fixed tab header.
                          child: ShaderMask(
                            blendMode: BlendMode.dstIn,
                            shaderCallback: (rect) => LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: const [Color(0x00000000), Colors.black],
                              stops: [
                                0,
                                tab == 0 || rect.height == 0
                                    ? 0
                                    : (18 / rect.height).clamp(0.0, 1.0),
                              ],
                            ).createShader(rect),
                            child: AnimatedSwitcher(
                              duration: reducedMotion(c)
                                  ? Duration.zero
                                  : const Duration(milliseconds: 320),
                              switchInCurve: Curves.easeOutCubic,
                              switchOutCurve: Curves.easeInCubic,
                              // Fade-through: the old tab is gone before the new one appears.
                              transitionBuilder: (child, animation) {
                                final t = CurvedAnimation(
                                  parent: animation,
                                  curve: const Interval(.4, 1),
                                );
                                return FadeTransition(
                                  opacity: t,
                                  child: SlideTransition(
                                    position: Tween(
                                      begin: const Offset(0, .03),
                                      end: Offset.zero,
                                    ).animate(t),
                                    child: child,
                                  ),
                                );
                              },
                              layoutBuilder: (current, previous) => Stack(
                                alignment: Alignment.topCenter,
                                children: [...previous, ?current],
                              ),
                              child: KeyedSubtree(
                                key: ValueKey('tab-$tab'),
                                child: bodies[tab],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              bottomNavigationBar: _FloatingNavigation(
                selected: tab,
                onSelected: navigate,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderButton extends StatelessWidget {
  final String tooltip, icon;
  final VoidCallback? onPressed;
  final bool dot;
  const _HeaderButton({
    required this.tooltip,
    required this.icon,
    this.onPressed,
    this.dot = false,
  });
  @override
  Widget build(BuildContext context) => Pressable(
    scale: .9,
    child: IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      style: IconButton.styleFrom(
        backgroundColor: context.colors.surface.withValues(alpha: .8),
        side: BorderSide(color: neon.withValues(alpha: .3)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          dot
              ? Swing(child: SihhatIcon(icon, color: context.colors.primary))
              : SihhatIcon(icon, color: context.colors.primary),
          if (dot)
            Positioned(
              right: -1,
              top: -1,
              child: Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  color: const Color(0xffff4d5e),
                  shape: BoxShape.circle,
                  border: Border.all(color: abyss, width: 1.5),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

/// Floating glass navigation bar with a sliding neon indicator.
class _FloatingNavigation extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onSelected;
  const _FloatingNavigation({required this.selected, required this.onSelected});
  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    const radius = BorderRadius.vertical(top: Radius.circular(26));
    // Docked glass bar with a lit neon top edge, as in the design.
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          BoxShadow(
            color: dark ? neon.withValues(alpha: .14) : const Color(0x22043b33),
            blurRadius: 24,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
          child: CustomPaint(
            foregroundPainter: dark
                ? const GlowBorderPainter(radius: 26, strength: .9)
                : null,
            child: ColoredBox(
              color: dark ? const Color(0xe6061f1b) : masthead,
              child: NavigationBar(
                selectedIndex: selected,
                onDestinationSelected: onSelected,
                animationDuration: const Duration(milliseconds: 420),
                destinations: _mainNavigationDestinations,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

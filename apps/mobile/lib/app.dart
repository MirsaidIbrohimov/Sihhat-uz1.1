import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'data/api.dart';
import 'appearance.dart';
import 'branding.dart';
import 'design.dart';
import 'screens/account.dart';
import 'screens/booking.dart';
import 'screens/catalog.dart';
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

class _EntryState extends State<_Entry> {
  bool checking = true;
  String? error;
  @override
  void initState() {
    super.initState();
    widget.api.session.addListener(sessionChanged);
    restore();
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

  @override
  Widget build(BuildContext context) {
    if (!AppearanceScope.maybeOf(context)!.loaded || checking) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SihhatLogo(size: 112),
              SizedBox(height: 24),
              CircularProgressIndicator(),
            ],
          ),
        ),
      );
    }
    if (!widget.api.signedIn) {
      return LoginScreen(
        widget.api,
        showDemoOtp: widget.showDemoOtp,
        onAuthenticated: () => setState(() => error = null),
      );
    }
    return Home(widget.api, sessionError: error, retrySession: restore);
  }
}

class Home extends StatefulWidget {
  final Api api;
  final String? sessionError;
  final VoidCallback? retrySession;
  const Home(this.api, {this.sessionError, this.retrySession, super.key});
  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  bool ready = false;
  String? error;
  int tab = 0, epoch = 0;
  @override
  void initState() {
    super.initState();
    error = widget.sessionError;
    restore();
  }

  Future<void> restore() async {
    try {
      if (mounted) setState(() => ready = true);
      final pending = await widget.api.getPendingBooking();
      if (pending != null && widget.api.signedIn && mounted) {
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

  Future<void> navigate(int n) async {
    if (!ready) return;
    if (n > 0 && n < 4 && !await ensureLogin(context, widget.api)) return;
    if (mounted) setState(() => tab = n);
  }

  @override
  Widget build(BuildContext context) {
    final bodies = [
      CatalogScreen(widget.api, key: ValueKey('catalog-$epoch')),
      FavoritesScreen(widget.api, key: ValueKey('favorites-$epoch')),
      BookingsScreen(widget.api, key: ValueKey('bookings-$epoch')),
      AiScreen(widget.api, key: ValueKey('ai-$epoch')),
      ProfileScreen(widget.api, changed, key: ValueKey('profile-$epoch')),
    ];
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 76,
        title: tab == 0
            ? Row(
                children: [
                  const SihhatLogo(),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'sihhat.uz',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 23,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -.7,
                          ),
                        ),
                        Text(
                          'Dam olishni birga rejalashtiramiz',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10,
                            color: context.colors.muted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              )
            : Text(
                [
                  'sihhat.uz',
                  'Saqlanganlar',
                  'Mening bronlarim',
                  'Sihhat yordamchisi',
                  'Profil',
                ][tab],
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
        actions: [
          const AppearanceToggle(),
          IconButton(
            tooltip: 'Bildirishnomalar',
            onPressed: !ready
                ? null
                : () async {
                    if (await ensureLogin(context, widget.api) &&
                        context.mounted) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => NotificationsScreen(widget.api),
                        ),
                      );
                    }
                  },
            style: IconButton.styleFrom(
              backgroundColor: context.colors.surface,
            ),
            icon: const Icon(Icons.notifications_none_rounded),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (error != null)
              MaterialBanner(
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
              child: Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 720),
                  child: bodies[tab],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: context.colors.border)),
        ),
        child: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: navigate,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Bosh sahifa',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_border),
              selectedIcon: Icon(Icons.favorite),
              label: 'Saqlangan',
            ),
            NavigationDestination(
              icon: Icon(Icons.bookmark_border),
              selectedIcon: Icon(Icons.bookmark),
              label: 'Bronlar',
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              selectedIcon: Icon(Icons.chat_bubble),
              label: 'AI yordam',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profil',
            ),
          ],
        ),
      ),
    );
  }
}

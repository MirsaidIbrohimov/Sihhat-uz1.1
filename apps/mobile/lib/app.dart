import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'data/api.dart';
import 'design.dart';
import 'screens/account.dart';
import 'screens/booking.dart';
import 'screens/catalog.dart';
import 'screens/login.dart';

class SihhatApp extends StatelessWidget {
  final Api api;
  const SihhatApp({required this.api, super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Sihhat.uz',
    debugShowCheckedModeBanner: false,
    locale: const Locale('uz'),
    supportedLocales: const [Locale('uz'), Locale('en')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: sihhatTheme(),
    onGenerateRoute: (_) => MaterialPageRoute(builder: (_) => Home(api)),
  );
}

class Home extends StatefulWidget {
  final Api api;
  const Home(this.api, {super.key});
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
    restore();
  }

  Future<void> restore() async {
    try {
      await widget.api.restore();
      if (widget.api.signedIn) {
        try {
          await widget.api.send('/auth/me', retry: false);
        } on ApiException catch (e) {
          if (e.status == 401) {
            try {
              await widget.api.tokens(
                asJson(
                  await widget.api.send(
                    '/auth/refresh',
                    method: 'POST',
                    body: {'refresh_token': widget.api.refreshToken},
                    retry: false,
                  ),
                ),
              );
            } on ApiException catch (r) {
              if (r.status == 401) {
                await widget.api.clear();
              } else {
                rethrow;
              }
            }
          }
        }
      }
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

  void changed() => setState(() {
    epoch++;
    if (!widget.api.signedIn) tab = 0;
  });
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
            ? const Row(
                children: [
                  CircleAvatar(
                    backgroundColor: mint,
                    foregroundColor: forest,
                    child: Icon(Icons.spa_rounded),
                  ),
                  SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'sihhat.uz',
                          style: TextStyle(
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
                            color: muted,
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
            style: IconButton.styleFrom(backgroundColor: Colors.white),
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
                    onPressed: () {
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
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xffe3ebe6))),
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

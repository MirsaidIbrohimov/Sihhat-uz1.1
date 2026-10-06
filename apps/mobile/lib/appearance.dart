import 'package:flutter/material.dart';

import 'data/api.dart';

String appearanceLabel(ThemeMode mode) =>
    mode == ThemeMode.dark ? 'Tungi rejim' : 'Kunduzgi rejim';

String appearanceAction(ThemeMode next) =>
    next == ThemeMode.dark ? 'Tungi rejimga o‘tish' : 'Kunduzgi rejimga o‘tish';

IconData appearanceIcon(ThemeMode mode) => mode == ThemeMode.dark
    ? Icons.dark_mode_outlined
    : Icons.light_mode_outlined;

class AppearanceController extends ChangeNotifier {
  final TokenStore store;
  ThemeMode mode = ThemeMode.light;
  bool loaded = false, saving = false, _disposed = false;
  AppearanceController(this.store);

  ThemeMode get nextMode =>
      mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;

  Future<void> load() async {
    try {
      final saved = await store.read('appearance');
      // Old system preferences and missing/invalid values become day mode.
      mode = saved == ThemeMode.dark.name ? ThemeMode.dark : ThemeMode.light;
    } catch (_) {
      // A storage failure must not prevent browsing or booking.
      mode = ThemeMode.light;
    }
    loaded = true;
    if (!_disposed) notifyListeners();
  }

  Future<void> toggle() async {
    if (!loaded || saving) return;
    final next = nextMode;
    saving = true;
    notifyListeners();
    try {
      await store.write('appearance', next.name);
      mode = next;
    } finally {
      saving = false;
      if (!_disposed) notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

class AppearanceScope extends InheritedNotifier<AppearanceController> {
  const AppearanceScope({
    required AppearanceController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static AppearanceController? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppearanceScope>()?.notifier;
}

Future<void> toggleAppearance(BuildContext context) async {
  final controller = AppearanceScope.maybeOf(context);
  if (controller == null) return;
  try {
    await controller.toggle();
  } catch (_) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ko‘rinishni saqlab bo‘lmadi. Qayta urinib ko‘ring.'),
        ),
      );
    }
  }
}

class AppearanceToggle extends StatelessWidget {
  final bool onMasthead;
  const AppearanceToggle({this.onMasthead = false, super.key});
  @override
  Widget build(BuildContext context) {
    final controller = AppearanceScope.maybeOf(context);
    if (controller == null) return const SizedBox.shrink();
    return IconButton(
      tooltip: appearanceAction(controller.nextMode),
      style: onMasthead
          ? IconButton.styleFrom(
              backgroundColor: const Color(0xff124b42),
              foregroundColor: Colors.white,
            )
          : null,
      icon: Icon(appearanceIcon(controller.nextMode)),
      onPressed: controller.loaded && !controller.saving
          ? () => toggleAppearance(context)
          : null,
    );
  }
}

class AppearanceSettings extends StatelessWidget {
  const AppearanceSettings({super.key});
  @override
  Widget build(BuildContext context) {
    final controller = AppearanceScope.maybeOf(context);
    if (controller == null) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Ilova ko‘rinishi',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(appearanceLabel(controller.mode)),
            const SizedBox(height: 12),
            FilledButton.icon(
              icon: Icon(appearanceIcon(controller.nextMode)),
              label: Text(appearanceAction(controller.nextMode)),
              onPressed: controller.loaded && !controller.saving
                  ? () => toggleAppearance(context)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

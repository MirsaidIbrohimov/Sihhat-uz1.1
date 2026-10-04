import 'package:flutter/material.dart';

import 'data/api.dart';

String appearanceLabel(ThemeMode mode) => switch (mode) {
  ThemeMode.system => 'Telefon sozlamasiga mos',
  ThemeMode.light => 'Kunduzgi rejim',
  ThemeMode.dark => 'Tungi rejim',
};

IconData appearanceIcon(ThemeMode mode) => switch (mode) {
  ThemeMode.system => Icons.brightness_auto_outlined,
  ThemeMode.light => Icons.light_mode_outlined,
  ThemeMode.dark => Icons.dark_mode_outlined,
};

class AppearanceController extends ChangeNotifier {
  final TokenStore store;
  ThemeMode mode = ThemeMode.system;
  bool loaded = false, saving = false, _disposed = false;
  AppearanceController(this.store);

  Future<void> load() async {
    try {
      final saved = await store.read('appearance');
      mode = ThemeMode.values.firstWhere(
        (value) => value.name == saved,
        orElse: () => ThemeMode.system,
      );
    } catch (_) {
      // A storage failure must not prevent browsing or booking.
      mode = ThemeMode.system;
    }
    loaded = true;
    if (!_disposed) notifyListeners();
  }

  Future<void> select(ThemeMode next) async {
    if (!loaded || saving || mode == next) return;
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

Future<void> chooseAppearance(BuildContext context, ThemeMode mode) async {
  final controller = AppearanceScope.maybeOf(context);
  if (controller == null) return;
  try {
    await controller.select(mode);
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

class AppearanceMenu extends StatelessWidget {
  const AppearanceMenu({super.key});
  @override
  Widget build(BuildContext context) {
    final controller = AppearanceScope.maybeOf(context);
    if (controller == null) return const SizedBox.shrink();
    return PopupMenuButton<ThemeMode>(
      tooltip: 'Ko‘rinish rejimi',
      enabled: controller.loaded && !controller.saving,
      initialValue: controller.mode,
      icon: Icon(appearanceIcon(controller.mode)),
      onSelected: (mode) => chooseAppearance(context, mode),
      itemBuilder: (_) => [
        for (final mode in ThemeMode.values)
          CheckedPopupMenuItem(
            value: mode,
            checked: mode == controller.mode,
            child: Text(appearanceLabel(mode)),
          ),
      ],
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
            const SizedBox(height: 12),
            DropdownButtonFormField<ThemeMode>(
              key: ValueKey(controller.mode),
              initialValue: controller.mode,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Ko‘rinish rejimi'),
              items: [
                for (final mode in ThemeMode.values)
                  DropdownMenuItem(
                    value: mode,
                    child: Text(appearanceLabel(mode)),
                  ),
              ],
              onChanged: controller.saving
                  ? null
                  : (mode) {
                      if (mode != null) chooseAppearance(context, mode);
                    },
            ),
          ],
        ),
      ),
    );
  }
}

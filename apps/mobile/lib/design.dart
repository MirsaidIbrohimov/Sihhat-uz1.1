import 'package:flutter/material.dart';

const forest = Color(0xff16634d);
const midnight = Color(0xff183c32);
const mint = Color(0xffe7f2ec);
const canvasColor = Color(0xfff5f8f6);
const muted = Color(0xff657b72);

ThemeData sihhatTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: forest,
    primary: forest,
    onPrimary: Colors.white,
    secondary: const Color(0xffd9b577),
    surface: Colors.white,
    onSurface: midnight,
    outline: const Color(0xffdce6df),
  );
  final rounded = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(18),
  );
  final border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(18),
    borderSide: const BorderSide(color: Color(0xffdce6df)),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: canvasColor,
    textTheme: ThemeData.light().textTheme.apply(
      bodyColor: midnight,
      displayColor: midnight,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: canvasColor,
      foregroundColor: midnight,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: midnight,
        fontSize: 20,
        fontWeight: FontWeight.w800,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xffe3ebe6)),
      ),
      clipBehavior: Clip.antiAlias,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(
        borderSide: const BorderSide(color: forest, width: 1.8),
      ),
      hintStyle: const TextStyle(color: muted, fontSize: 14),
      labelStyle: const TextStyle(color: muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 54),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
        shape: rounded,
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 50),
        shape: rounded,
        side: const BorderSide(color: Color(0xffd5e2da)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 74,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      indicatorColor: mint,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 11,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w800
              : FontWeight.w500,
          color: states.contains(WidgetState.selected) ? forest : muted,
        ),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: Colors.white,
      selectedColor: mint,
      side: const BorderSide(color: Color(0xffdce6df)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      labelStyle: const TextStyle(fontSize: 12, color: midnight),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: canvasColor,
      showDragHandle: true,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: rounded,
      backgroundColor: midnight,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xffe3ebe6),
      thickness: 1,
    ),
  );
}

class WellnessHero extends StatelessWidget {
  final VoidCallback? search;
  const WellnessHero({this.search, super.key});
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(28),
    child: Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xff124e3e), Color(0xff2d8063)],
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(
            child: ExcludeSemantics(
              child: CustomPaint(painter: RetreatLandscape(dark: true)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.spa_outlined,
                      color: Color(0xffd6e9b6),
                      size: 18,
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'O‘ZINGIZ UCHUN VAQT',
                        style: TextStyle(
                          color: Color(0xffd6e9b6),
                          fontSize: 10,
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Text(
                  'Sog‘lom dam olish shu yerdan boshlanadi.',
                  style: TextStyle(
                    fontSize: 27,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    height: 1.17,
                    letterSpacing: -.7,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'O‘zbekiston sanatoriyalarini kashf eting.',
                  style: TextStyle(
                    color: Color(0xffe1eee5),
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                if (search != null) ...[
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: search,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xffe6f0c6),
                      foregroundColor: midnight,
                      minimumSize: const Size(48, 48),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    icon: const Icon(Icons.search_rounded, size: 20),
                    label: const Text('Sanatoriya topish'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

// Decorative illustration; it does not represent any actual sanatorium.
class RetreatLandscape extends CustomPainter {
  final bool dark;
  const RetreatLandscape({this.dark = false});
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final paint = Paint();
    paint.color = dark
        ? const Color(0xffa7cfae).withValues(alpha: .12)
        : const Color(0xffdae9d8);
    canvas.drawCircle(Offset(w * .86, h * .22), h * .23, paint);
    final back = Path()
      ..moveTo(0, h * .85)
      ..lineTo(w * .26, h * .52)
      ..lineTo(w * .46, h * .75)
      ..lineTo(w * .76, h * .4)
      ..lineTo(w, h * .75)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    paint.color = dark
        ? const Color(0xffc4dcc3).withValues(alpha: .10)
        : const Color(0xffa7cbb5);
    canvas.drawPath(back, paint);
    final front = Path()
      ..moveTo(0, h)
      ..quadraticBezierTo(w * .5, h * .67, w, h * .81)
      ..lineTo(w, h)
      ..close();
    paint.color = dark
        ? const Color(0xffb8d58b).withValues(alpha: .18)
        : const Color(0xff7dad95);
    canvas.drawPath(front, paint);
    for (final x in [.78, .87, .95]) {
      final tree = Path()
        ..moveTo(w * x, h * .58)
        ..lineTo(w * x - 12, h * .85)
        ..lineTo(w * x + 12, h * .85)
        ..close();
      paint.color = dark
          ? const Color(0xffd1e6ba).withValues(alpha: .13)
          : const Color(0xff4e9275);
      canvas.drawPath(tree, paint);
    }
  }

  @override
  bool shouldRepaint(RetreatLandscape oldDelegate) => oldDelegate.dark != dark;
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  const SectionTitle(this.title, {this.subtitle, super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: midnight,
            letterSpacing: -.4,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 5),
          Text(subtitle!, style: const TextStyle(color: muted, fontSize: 13)),
        ],
      ],
    ),
  );
}

class ActionDock extends StatelessWidget {
  final String label;
  final String? amount, caption;
  final VoidCallback? onPressed;
  const ActionDock({
    required this.label,
    this.amount,
    this.caption,
    this.onPressed,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Container(
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: Color(0xffe3ebe6))),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (amount != null) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      caption ?? 'Jami',
                      style: const TextStyle(color: muted, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      amount!,
                      style: const TextStyle(
                        color: forest,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
            ],
            FilledButton(
              onPressed: onPressed,
              child: Text(label, textAlign: TextAlign.center),
            ),
          ],
        ),
      ),
    ),
  );
}

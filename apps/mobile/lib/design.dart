import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const forest = Color(0xff00866c);
const midnight = Color(0xff083f38);
const mint = Color(0xffe6f5f0);
const canvasColor = Color(0xfff6faf9);
const masthead = Color(0xff043b33);
const muted = Color(0xff657b72);

@immutable
class SihhatColors extends ThemeExtension<SihhatColors> {
  final Color primary, ink, muted, soft, canvas, surface, border, warning;
  const SihhatColors({
    required this.primary,
    required this.ink,
    required this.muted,
    required this.soft,
    required this.canvas,
    required this.surface,
    required this.border,
    required this.warning,
  });

  factory SihhatColors.forBrightness(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    return SihhatColors(
      primary: dark ? const Color(0xff97d4b9) : forest,
      ink: dark ? const Color(0xffe3efe7) : midnight,
      muted: dark ? const Color(0xffabc2b3) : const Color(0xff657b72),
      soft: dark ? const Color(0xff203e31) : mint,
      canvas: dark ? const Color(0xff101d18) : canvasColor,
      surface: dark ? const Color(0xff1b2c24) : Colors.white,
      border: dark ? const Color(0xff3c5548) : const Color(0xffdcece6),
      warning: dark ? const Color(0xff45371e) : const Color(0xfffff2dc),
    );
  }

  @override
  SihhatColors copyWith({
    Color? primary,
    Color? ink,
    Color? muted,
    Color? soft,
    Color? canvas,
    Color? surface,
    Color? border,
    Color? warning,
  }) => SihhatColors(
    primary: primary ?? this.primary,
    ink: ink ?? this.ink,
    muted: muted ?? this.muted,
    soft: soft ?? this.soft,
    canvas: canvas ?? this.canvas,
    surface: surface ?? this.surface,
    border: border ?? this.border,
    warning: warning ?? this.warning,
  );

  @override
  SihhatColors lerp(covariant SihhatColors? other, double t) {
    if (other == null) return this;
    return SihhatColors(
      primary: Color.lerp(primary, other.primary, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      soft: Color.lerp(soft, other.soft, t)!,
      canvas: Color.lerp(canvas, other.canvas, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      border: Color.lerp(border, other.border, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
    );
  }
}

extension SihhatDesign on BuildContext {
  SihhatColors get colors =>
      Theme.of(this).extension<SihhatColors>() ??
      SihhatColors.forBrightness(Theme.of(this).brightness);
}

ThemeData sihhatTheme({Brightness brightness = Brightness.light}) {
  final colors = SihhatColors.forBrightness(brightness);
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: forest,
    brightness: brightness,
    primary: colors.primary,
    onPrimary: dark ? const Color(0xff103d2d) : Colors.white,
    secondary: const Color(0xffd9b577),
    surface: colors.surface,
    onSurface: colors.ink,
    onSurfaceVariant: colors.muted,
    outline: colors.border,
  );
  final rounded = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(18),
  );
  final border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(18),
    borderSide: BorderSide(color: colors.border),
  );
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    extensions: [colors],
    scaffoldBackgroundColor: colors.canvas,
    textTheme: (dark ? ThemeData.dark() : ThemeData.light()).textTheme.apply(
      bodyColor: colors.ink,
      displayColor: colors.ink,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: colors.canvas,
      foregroundColor: colors.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      systemOverlayStyle:
          (dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark)
              .copyWith(
                statusBarColor: Colors.transparent,
                systemNavigationBarColor: colors.canvas,
                systemNavigationBarIconBrightness: dark
                    ? Brightness.light
                    : Brightness.dark,
              ),
      titleTextStyle: TextStyle(
        color: colors.ink,
        fontSize: 20,
        fontWeight: FontWeight.w800,
      ),
    ),
    cardTheme: CardThemeData(
      color: colors.surface.withValues(alpha: .78),
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colors.surface.withValues(alpha: .85),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(
        borderSide: BorderSide(color: colors.primary, width: 1.8),
      ),
      hintStyle: TextStyle(color: colors.muted, fontSize: 14),
      labelStyle: TextStyle(color: colors.muted),
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
        side: BorderSide(color: colors.border),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 76,
      backgroundColor: masthead,
      surfaceTintColor: Colors.transparent,
      indicatorColor: const Color(0xff087d63),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected)
              ? const Color(0xff66e1b9)
              : const Color(0xffbbd6d0),
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 11,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w800
              : FontWeight.w500,
          color: states.contains(WidgetState.selected)
              ? const Color(0xff66e1b9)
              : const Color(0xffbbd6d0),
        ),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: colors.surface,
      selectedColor: colors.soft,
      side: BorderSide(color: colors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      labelStyle: TextStyle(fontSize: 12, color: colors.ink),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: colors.canvas,
      showDragHandle: true,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: rounded,
      backgroundColor: scheme.inverseSurface,
      contentTextStyle: TextStyle(color: scheme.onInverseSurface),
    ),
    dialogTheme: DialogThemeData(backgroundColor: colors.surface),
    popupMenuTheme: PopupMenuThemeData(color: colors.surface),
    dividerTheme: DividerThemeData(color: colors.border, thickness: 1),
  );
}

class GlassBackdrop extends StatelessWidget {
  final Widget child;
  const GlassBackdrop({required this.child, super.key});
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          context.colors.soft,
          context.colors.canvas,
          context.colors.soft.withValues(alpha: .45),
        ],
        stops: const [0, .6, 1],
      ),
    ),
    child: child,
  );
}

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding, margin;
  const GlassCard({
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.margin = const EdgeInsets.only(bottom: 16),
    super.key,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: margin,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(26),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: context.colors.surface.withValues(alpha: .68),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(
              color: context.colors.surface.withValues(alpha: .85),
            ),
          ),
          child: Material(type: MaterialType.transparency, child: child),
        ),
      ),
    ),
  );
}

class WellnessHero extends StatelessWidget {
  final VoidCallback? search;
  const WellnessHero({this.search, super.key});
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(22),
    child: Stack(
      children: [
        Positioned.fill(
          child: Image.asset(
            'assets/illustrations/wellness-retreat.png',
            fit: BoxFit.cover,
            alignment: Alignment.centerRight,
            excludeFromSemantics: true,
          ),
        ),
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xff043c33).withValues(alpha: .94),
                  const Color(0xff043c33).withValues(alpha: .60),
                  Colors.transparent,
                ],
                stops: const [0, .57, 1],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(18),
          child: FractionallySizedBox(
            widthFactor: .78,
            alignment: Alignment.centerLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xff158364).withValues(alpha: .8),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.spa_rounded, color: Colors.white, size: 15),
                      SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Yangi imkoniyat',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                const Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: 'Sog‘lom hayot\nsari '),
                      TextSpan(
                        text: 'bir qadam!',
                        style: TextStyle(color: Color(0xff4dd5aa)),
                      ),
                    ],
                  ),
                  style: TextStyle(
                    fontSize: 23,
                    height: 1.12,
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'O‘zingizga mos sanatoriya va sog‘lomlashtirish maskanini toping, bron qiling.',
                  style: TextStyle(
                    color: Color(0xffe2f5ed),
                    fontSize: 12,
                    height: 1.45,
                  ),
                ),
                if (search != null) ...[
                  const SizedBox(height: 14),
                  FilledButton(
                    onPressed: search,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xff4dd5aa),
                      foregroundColor: midnight,
                      minimumSize: const Size(48, 44),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(child: Text('Qidirishni boshlash')),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 18),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
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
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: context.colors.ink,
            letterSpacing: -.4,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 5),
          Text(
            subtitle!,
            style: TextStyle(color: context.colors.muted, fontSize: 13),
          ),
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
    decoration: BoxDecoration(
      color: context.colors.surface,
      border: Border(top: BorderSide(color: context.colors.border)),
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
                      style: TextStyle(
                        color: context.colors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      amount!,
                      style: TextStyle(
                        color: context.colors.primary,
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

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'design.dart';
import 'icon_nodes.dart';
import 'motion.dart';
import 'neon.dart' show GlowBorderPainter, GlyphTile;

/// The approved UI is scoped to inner pages; the existing home theme stays intact.
ThemeData conceptTheme(ThemeData base) {
  final c = SihhatColors.forBrightness(base.brightness);
  final text = base.textTheme.apply(fontFamily: 'DMSans');
  final outline = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: BorderSide(color: c.border),
  );
  final dark = base.brightness == Brightness.dark;
  return base.copyWith(
    scaffoldBackgroundColor: c.canvas,
    textTheme: text.copyWith(
      titleLarge: text.titleLarge?.copyWith(
        fontFamily: 'Manrope',
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: c.ink,
      ),
      titleMedium: text.titleMedium?.copyWith(
        fontFamily: 'Manrope',
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: c.ink,
      ),
      bodyLarge: text.bodyLarge?.copyWith(
        fontSize: 16,
        height: 1.5,
        color: c.ink,
      ),
      bodyMedium: text.bodyMedium?.copyWith(
        fontSize: 14,
        height: 1.5,
        color: c.ink,
      ),
    ),
    appBarTheme: base.appBarTheme.copyWith(
      backgroundColor: c.canvas,
      foregroundColor: c.ink,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: c.ink,
      ),
    ),
    cardTheme: CardThemeData(
      color: c.surface,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: c.border),
      ),
      clipBehavior: Clip.antiAlias,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? c.surface.withValues(alpha: .7) : c.surface,
      border: outline,
      enabledBorder: outline,
      focusedBorder: outline.copyWith(
        borderSide: BorderSide(color: c.primary, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: TextStyle(color: c.muted, fontSize: 14),
      hintStyle: TextStyle(color: c.muted, fontSize: 14),
    ),
    chipTheme: base.chipTheme,
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        elevation: dark ? 8 : 0,
        shadowColor: dark ? neon.withValues(alpha: .55) : null,
        minimumSize: const Size(48, 52),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(
          fontFamily: 'DMSans',
          fontSize: 15,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 52),
        side: BorderSide(color: c.primary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(
          fontFamily: 'DMSans',
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: dark ? const Color(0xf20a2e29) : c.surface,
      surfaceTintColor: Colors.transparent,
      elevation: dark ? 18 : 6,
      shadowColor: dark ? neon.withValues(alpha: .35) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: BorderSide(color: dark ? neon.withValues(alpha: .4) : c.border),
      ),
      titleTextStyle: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: c.ink,
      ),
      contentTextStyle: TextStyle(
        fontFamily: 'DMSans',
        fontSize: 15,
        height: 1.5,
        color: c.muted,
      ),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: dark ? const Color(0xfa082925) : c.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: dark ? neon.withValues(alpha: .6) : c.border,
      dragHandleSize: const Size(44, 5),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        side: BorderSide(color: dark ? neon.withValues(alpha: .35) : c.border),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? const Color(0xff0e3d36) : midnight,
      contentTextStyle: TextStyle(
        fontFamily: 'DMSans',
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: dark ? c.ink : Colors.white,
      ),
      actionTextColor: neon,
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: neon.withValues(alpha: dark ? .45 : 0)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 70,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      indicatorShape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      indicatorColor: neon,
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected)
              ? masthead
              : Colors.white,
          size: 24,
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontFamily: 'DMSans',
          fontSize: 10,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w700
              : FontWeight.w500,
          color: states.contains(WidgetState.selected)
              ? Colors.white
              : const Color(0xff9fbfb6),
        ),
      ),
    ),
    dividerTheme: DividerThemeData(color: c.border, thickness: 1),
    expansionTileTheme: ExpansionTileThemeData(
      shape: const Border(),
      collapsedShape: const Border(),
      iconColor: c.ink,
      collapsedIconColor: c.ink,
    ),
  );
}

class ConceptScope extends StatelessWidget {
  final Widget child;
  const ConceptScope({required this.child, super.key});
  @override
  Widget build(BuildContext context) =>
      Theme(data: conceptTheme(Theme.of(context)), child: child);
}

bool _dark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

/// Title with an optional muted subtitle, as in the 2026-11 design headers.
class ConceptTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Color? color;
  const ConceptTitle(this.title, {this.subtitle, this.color, super.key});
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: conceptHeading(context, size: 22, color: color),
        ),
      ),
      if (subtitle != null)
        Text(
          subtitle!,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontFamily: 'DMSans',
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: context.colors.muted,
          ),
        ),
    ],
  );
}

class ConceptPage extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget body;
  final Widget? bottom;
  final List<Widget>? actions;
  const ConceptPage({
    required this.title,
    required this.body,
    this.subtitle,
    this.bottom,
    this.actions,
    super.key,
  });
  @override
  Widget build(BuildContext context) => ConceptScope(
    child: Builder(
      builder: (c) => GlassBackdrop(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            centerTitle: subtitle == null,
            title: subtitle == null
                ? Text(title)
                : ConceptTitle(title, subtitle: subtitle),
            actions: actions,
            leading: Navigator.canPop(c)
                ? IconButton(
                    tooltip: 'Orqaga',
                    onPressed: () => Navigator.maybePop(c),
                    icon: const SihhatIcon('chevron-left'),
                  )
                : null,
          ),
          body: SafeArea(
            top: false,
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 720),
                child: body,
              ),
            ),
          ),
          bottomNavigationBar: bottom,
        ),
      ),
    ),
  );
}

/// Glass card with a neon edge; tappable cards get springy press feedback.
class ConceptCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding, margin;
  final Color? color;
  final VoidCallback? onTap;
  final bool selected;
  const ConceptCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.margin = const EdgeInsets.only(bottom: 14),
    this.color,
    this.onTap,
    this.selected = false,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final dark = _dark(context);
    final radius = BorderRadius.circular(22);
    final card = AnimatedContainer(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          dark
              ? BoxShadow(
                  color: neon.withValues(alpha: selected ? .32 : .12),
                  blurRadius: selected ? 26 : 22,
                  spreadRadius: selected ? 0 : -6,
                )
              : const BoxShadow(
                  color: Color(0x0c043b33),
                  blurRadius: 18,
                  offset: Offset(0, 6),
                ),
        ],
      ),
      child: Material(
        color:
            color ?? context.colors.surface.withValues(alpha: dark ? .78 : 1),
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: selected
              ? BorderSide(width: 1.6, color: context.colors.primary)
              : dark
              ? BorderSide.none
              : BorderSide(color: context.colors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: CustomPaint(
          foregroundPainter: dark && !selected
              ? const GlowBorderPainter(radius: 22)
              : null,
          child: DecoratedBox(
            // A faint diagonal sheen sells the glass look.
            decoration: BoxDecoration(
              gradient: dark
                  ? LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white.withValues(alpha: .06),
                        Colors.white.withValues(alpha: 0),
                      ],
                    )
                  : null,
            ),
            child: InkWell(
              onTap: onTap,
              splashColor: neon.withValues(alpha: .12),
              child: Padding(padding: padding, child: child),
            ),
          ),
        ),
      ),
    );
    return Padding(
      padding: margin,
      child: onTap == null ? card : Pressable(scale: .98, child: card),
    );
  }
}

TextStyle conceptHeading(
  BuildContext context, {
  double size = 20,
  Color? color,
}) => TextStyle(
  fontFamily: 'Manrope',
  fontSize: size,
  height: 1.3,
  fontWeight: FontWeight.w800,
  letterSpacing: -.4,
  color: color ?? context.colors.ink,
);

/// Rounded neon icon tile used across menus, shortcuts and info rows.
class IconTile extends StatelessWidget {
  final String icon;
  final double size;
  final bool glow;
  const IconTile(this.icon, {this.size = 44, this.glow = false, super.key});
  @override
  Widget build(BuildContext context) {
    final dark = _dark(context);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: dark ? null : context.colors.soft,
        gradient: dark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xff17604f), Color(0xff0a3731)],
              )
            : null,
        borderRadius: BorderRadius.circular(size * .3),
        border: dark ? Border.all(color: neon.withValues(alpha: .4)) : null,
        boxShadow: [
          if (dark && glow)
            BoxShadow(color: neon.withValues(alpha: .35), blurRadius: 16),
        ],
      ),
      alignment: Alignment.center,
      child: SihhatIcon(icon, size: size * .5, color: context.colors.primary),
    );
  }
}

class ConceptInfo extends StatelessWidget {
  final String icon, title;
  final String? text;
  final bool warning;
  const ConceptInfo({
    this.icon = 'info',
    required this.title,
    this.text,
    this.warning = false,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final dark = _dark(context);
    final amber = dark ? const Color(0xffffc46b) : const Color(0xffa34a09);
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: warning
            ? context.colors.warning
            : context.colors.soft.withValues(alpha: dark ? .6 : 1),
        borderRadius: BorderRadius.circular(18),
        border: dark
            ? Border.all(color: (warning ? amber : neon).withValues(alpha: .3))
            : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SihhatIcon(icon, color: warning ? amber : context.colors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                if (text != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    text!,
                    style: TextStyle(
                      color: context.colors.muted,
                      fontSize: 13,
                      height: 1.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ConceptRow extends StatelessWidget {
  final String icon, text;
  final Color? color;
  const ConceptRow(this.icon, this.text, {this.color, super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: [
        SihhatIcon(icon, size: 19, color: color ?? context.colors.muted),
        const SizedBox(width: 9),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: color ?? context.colors.muted,
              fontSize: 14,
            ),
          ),
        ),
      ],
    ),
  );
}

class ConceptMenuRow extends StatelessWidget {
  final String icon, title;
  final VoidCallback? onTap;
  final Widget? trailing;

  /// Optional filled neon glyph used instead of the outline icon.
  final IconData? glyph;
  const ConceptMenuRow(
    this.icon,
    this.title, {
    this.onTap,
    this.trailing,
    this.glyph,
    super.key,
  });
  @override
  Widget build(BuildContext context) => ListTile(
    minVerticalPadding: 12,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
    leading: glyph == null
        ? IconTile(icon, size: 40)
        : GlyphTile(glyph!, size: 40),
    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
    trailing:
        trailing ??
        SihhatIcon('chevron-right', size: 20, color: context.colors.primary),
    onTap: onTap,
  );
}

class ConceptBadge extends StatelessWidget {
  final String label;
  final bool warning, subdued;
  const ConceptBadge(
    this.label, {
    this.warning = false,
    this.subdued = false,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final dark = _dark(context);
    final accent = warning
        ? (dark ? const Color(0xffffc46b) : const Color(0xff9b4708))
        : dark
        ? neon
        : context.colors.ink;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: warning
            ? context.colors.warning
            : subdued
            ? context.colors.canvas
            : dark
            ? neon.withValues(alpha: .14)
            : context.colors.soft,
        borderRadius: BorderRadius.circular(20),
        border: dark ? Border.all(color: accent.withValues(alpha: .45)) : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: accent,
        ),
      ),
    );
  }
}

/// Round neon "go" button used at the end of price rows.
class NeonArrow extends StatelessWidget {
  final double size;
  const NeonArrow({this.size = 38, super.key});
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: context.colors.primary,
      boxShadow: [
        if (_dark(context))
          BoxShadow(color: neon.withValues(alpha: .45), blurRadius: 14),
      ],
    ),
    alignment: Alignment.center,
    child: SihhatIcon(
      'arrow-right',
      size: size * .5,
      color: Theme.of(context).colorScheme.onPrimary,
    ),
  );
}

/// Bottom action panel: glass sheet with a glowing primary button.
class ConceptDock extends StatelessWidget {
  final String label;
  final String? amount, caption;
  final VoidCallback? onPressed;
  final Widget? secondary;
  const ConceptDock({
    required this.label,
    this.amount,
    this.caption,
    this.onPressed,
    this.secondary,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final dark = _dark(context);
    return Container(
      decoration: BoxDecoration(
        color: dark ? const Color(0xf00a2e29) : context.colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
        border: Border(
          top: BorderSide(
            color: dark ? neon.withValues(alpha: .35) : context.colors.border,
          ),
        ),
        boxShadow: [
          if (dark)
            BoxShadow(
              color: neon.withValues(alpha: .10),
              blurRadius: 24,
              offset: const Offset(0, -6),
            ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (amount != null) ...[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Text(
                        caption ?? 'Jami',
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    Flexible(
                      flex: 2,
                      child: Text(
                        amount!,
                        style: conceptHeading(context, size: 21),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              Pressable(
                child: FilledButton(
                  onPressed: onPressed,
                  child: Text(label, textAlign: TextAlign.center),
                ),
              ),
              if (secondary != null) ...[const SizedBox(height: 8), secondary!],
            ],
          ),
        ),
      ),
    );
  }
}

/// Pill message composer with a round neon send button.
class ConceptComposer extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final bool busy;
  final VoidCallback? send;
  const ConceptComposer({
    required this.controller,
    required this.hint,
    this.busy = false,
    this.send,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final pill = OutlineInputBorder(
      borderRadius: BorderRadius.circular(28),
      borderSide: BorderSide(
        color: _dark(context)
            ? neon.withValues(alpha: .3)
            : context.colors.border,
      ),
    );
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                enabled: !busy,
                minLines: 1,
                maxLines: 4,
                maxLength: 1000,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => send?.call(),
                decoration: InputDecoration(
                  hintText: hint,
                  counterText: '',
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 15,
                  ),
                  border: pill,
                  enabledBorder: pill,
                  disabledBorder: pill,
                  focusedBorder: pill.copyWith(
                    borderSide: BorderSide(
                      color: context.colors.primary,
                      width: 1.5,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Pressable(
              scale: .9,
              child: PulseGlow(
                strength: busy ? 0 : .8,
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: IconButton.filled(
                    tooltip: 'Yuborish',
                    onPressed: busy ? null : send,
                    icon: const SihhatIcon('send'),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// One accessible editable field, six visible cells; supports paste and OS OTP autofill.
class OtpField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool enabled, autofocus;
  final VoidCallback? submitted;
  const OtpField({
    required this.controller,
    this.label = 'SMS kodi',
    this.enabled = true,
    this.autofocus = false,
    this.submitted,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      if (label != 'SMS kodi') ...[
        Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
      ],
      ValueListenableBuilder<TextEditingValue>(
        valueListenable: controller,
        builder: (c, value, _) => Stack(
          children: [
            ExcludeSemantics(
              child: Row(
                children: List.generate(
                  6,
                  (n) => Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: n == 5 ? 0 : 8),
                      height: 58,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: c.colors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: n == value.text.length && enabled
                              ? c.colors.primary
                              : c.colors.border,
                        ),
                      ),
                      child: Text(
                        n < value.text.length ? value.text[n] : '',
                        style: conceptHeading(c, size: 24),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            SizedBox(
              height: 58,
              child: TextField(
                controller: controller,
                enabled: enabled,
                autofocus: autofocus,
                keyboardType: TextInputType.number,
                autofillHints: const [AutofillHints.oneTimeCode],
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                style: const TextStyle(color: Colors.transparent),
                showCursor: false,
                onSubmitted: (_) => submitted?.call(),
                decoration: InputDecoration(
                  labelText: label,
                  floatingLabelBehavior: FloatingLabelBehavior.never,
                  labelStyle: const TextStyle(color: Colors.transparent),
                  fillColor: Colors.transparent,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

class SihhatIcon extends StatelessWidget {
  final String name;
  final double size;
  final Color? color;
  final bool filled;
  const SihhatIcon(
    this.name, {
    this.size = 24,
    this.color,
    this.filled = false,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final effective =
        color ?? IconTheme.of(context).color ?? context.colors.ink;
    return ExcludeSemantics(
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(painter: _LucidePainter(name, effective, filled)),
      ),
    );
  }
}

class _LucidePainter extends CustomPainter {
  final String name;
  final Color color;
  final bool filled;
  static final _cache = <String, List<Path>>{};
  _LucidePainter(this.name, this.color, this.filled);
  @override
  void paint(Canvas canvas, Size size) {
    final paths = _cache.putIfAbsent(
      name,
      () => [
        for (final node in sihhatIconNodes[name] ?? sihhatIconNodes['info']!)
          _shape(node.$1, node.$2),
      ],
    );
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);
    final paint = Paint()
      ..color = color
      ..style = filled ? PaintingStyle.fill : PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final path in paths) {
      canvas.drawPath(path, paint);
    }
    canvas.restore();
  }

  static Path _shape(String tag, Map<String, String> a) {
    double num(String key, [double fallback = 0]) =>
        double.tryParse(a[key] ?? '') ?? fallback;
    switch (tag) {
      case 'path':
        return _svgPath(a['d']!);
      case 'circle':
        return Path()..addOval(
          Rect.fromCircle(
            center: Offset(num('cx'), num('cy')),
            radius: num('r'),
          ),
        );
      case 'ellipse':
        return Path()..addOval(
          Rect.fromCenter(
            center: Offset(num('cx'), num('cy')),
            width: num('rx') * 2,
            height: num('ry') * 2,
          ),
        );
      case 'rect':
        return Path()..addRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(num('x'), num('y'), num('width'), num('height')),
            Radius.circular(num('rx')),
          ),
        );
      case 'line':
        return Path()
          ..moveTo(num('x1'), num('y1'))
          ..lineTo(num('x2'), num('y2'));
      case 'polyline':
      case 'polygon':
        final points = a['points']!
            .split(RegExp(r'[\s,]+'))
            .where((v) => v.isNotEmpty)
            .map(double.parse)
            .toList();
        final p = Path()..moveTo(points[0], points[1]);
        for (var i = 2; i < points.length; i += 2) {
          p.lineTo(points[i], points[i + 1]);
        }
        if (tag == 'polygon') p.close();
        return p;
      default:
        throw StateError('Unsupported Lucide shape: $tag');
    }
  }

  static Path _svgPath(String d) {
    final tokens = RegExp(r'[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
        .allMatches(d)
        .map((m) => m[0]!)
        .toList();
    final path = Path();
    var i = 0;
    String command = '';
    var position = Offset.zero, start = Offset.zero;
    Offset? control;
    double take() => double.parse(tokens[i++]);
    while (i < tokens.length) {
      if (RegExp(r'^[a-zA-Z]$').hasMatch(tokens[i])) command = tokens[i++];
      final relative = command == command.toLowerCase();
      Offset point() {
        final p = Offset(take(), take());
        return relative ? position + p : p;
      }

      switch (command.toUpperCase()) {
        case 'M':
          position = point();
          start = position;
          path.moveTo(position.dx, position.dy);
          command = relative ? 'l' : 'L';
          control = null;
        case 'L':
          position = point();
          path.lineTo(position.dx, position.dy);
          control = null;
        case 'H':
          position = Offset((relative ? position.dx : 0) + take(), position.dy);
          path.lineTo(position.dx, position.dy);
          control = null;
        case 'V':
          position = Offset(position.dx, (relative ? position.dy : 0) + take());
          path.lineTo(position.dx, position.dy);
          control = null;
        case 'C':
          final c1 = point(), c2 = point(), end = point();
          path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, end.dx, end.dy);
          position = end;
          control = c2;
        case 'S':
          final c1 = control == null ? position : position * 2 - control;
          final c2 = point(), end = point();
          path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, end.dx, end.dy);
          position = end;
          control = c2;
        case 'Q':
          final c = point(), end = point();
          path.quadraticBezierTo(c.dx, c.dy, end.dx, end.dy);
          position = end;
          control = c;
        case 'T':
          final c = control == null ? position : position * 2 - control;
          final end = point();
          path.quadraticBezierTo(c.dx, c.dy, end.dx, end.dy);
          position = end;
          control = c;
        case 'A':
          final rx = take(),
              ry = take(),
              rotation = take(),
              large = take(),
              sweep = take(),
              end = point();
          path.arcToPoint(
            end,
            radius: Radius.elliptical(rx, ry),
            rotation: rotation,
            largeArc: large == 1,
            clockwise: sweep == 1,
          );
          position = end;
          control = null;
        case 'Z':
          path.close();
          position = start;
          control = null;
          command = '';
        default:
          throw StateError('Unsupported Lucide path: $command');
      }
    }
    return path;
  }

  @override
  bool shouldRepaint(_LucidePainter old) =>
      name != old.name || color != old.color || filled != old.filled;
}

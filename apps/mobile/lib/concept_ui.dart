import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'design.dart';
import 'icon_nodes.dart';

/// The approved UI is scoped to inner pages; the existing home theme stays intact.
ThemeData conceptTheme(ThemeData base) {
  final c = SihhatColors.forBrightness(base.brightness);
  final text = base.textTheme.apply(fontFamily: 'DMSans');
  final outline = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: BorderSide(color: c.border),
  );
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
      fillColor: c.surface,
      border: outline,
      enabledBorder: outline,
      focusedBorder: outline.copyWith(
        borderSide: BorderSide(color: c.primary, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: TextStyle(color: c.muted, fontSize: 14),
      hintStyle: TextStyle(color: c.muted, fontSize: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 52),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
      backgroundColor: c.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.surface,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 76,
      backgroundColor: masthead,
      surfaceTintColor: Colors.transparent,
      indicatorColor: const Color(0xff9bf2da),
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
          color: Colors.white,
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

class ConceptPage extends StatelessWidget {
  final String title;
  final Widget body;
  final Widget? bottom;
  final List<Widget>? actions;
  const ConceptPage({
    required this.title,
    required this.body,
    this.bottom,
    this.actions,
    super.key,
  });
  @override
  Widget build(BuildContext context) => ConceptScope(
    child: Builder(
      builder: (c) => Scaffold(
        appBar: AppBar(
          title: Text(title),
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
  );
}

class ConceptCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding, margin;
  final Color? color;
  final VoidCallback? onTap;
  const ConceptCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.margin = const EdgeInsets.only(bottom: 14),
    this.color,
    this.onTap,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: margin,
    child: DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          if (Theme.of(context).brightness == Brightness.light)
            const BoxShadow(
              color: Color(0x08043b33),
              blurRadius: 16,
              offset: Offset(0, 4),
            ),
        ],
      ),
      child: Material(
        color: color ?? context.colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: context.colors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    ),
  );
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

class IconTile extends StatelessWidget {
  final String icon;
  final double size;
  const IconTile(this.icon, {this.size = 44, super.key});
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: context.colors.soft,
      borderRadius: BorderRadius.circular(size * .28),
    ),
    alignment: Alignment.center,
    child: SihhatIcon(icon, size: size * .5, color: context.colors.primary),
  );
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
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 14),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: warning ? context.colors.warning : context.colors.soft,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SihhatIcon(
          icon,
          color: warning ? const Color(0xffa34a09) : context.colors.primary,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
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
  const ConceptMenuRow(this.icon, this.title, {this.onTap, super.key});
  @override
  Widget build(BuildContext context) => ListTile(
    minVerticalPadding: 12,
    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
    leading: SihhatIcon(icon),
    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
    trailing: const SihhatIcon('chevron-right', size: 20),
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
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
    decoration: BoxDecoration(
      color: warning
          ? context.colors.warning
          : subdued
          ? context.colors.canvas
          : context.colors.soft,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      label,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: warning
            ? (Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xffffd593)
                  : const Color(0xff9b4708))
            : context.colors.ink,
      ),
    ),
  );
}

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
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: context.colors.surface,
      border: Border(top: BorderSide(color: context.colors.border)),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
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
                      style: conceptHeading(context, size: 20),
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
            if (secondary != null) ...[const SizedBox(height: 8), secondary!],
          ],
        ),
      ),
    ),
  );
}

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
  Widget build(BuildContext context) => SafeArea(
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
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 52,
            height: 52,
            child: IconButton.filled(
              tooltip: 'Yuborish',
              onPressed: busy ? null : send,
              icon: const SihhatIcon('send'),
            ),
          ),
        ],
      ),
    ),
  );
}

/// One accessible editable field, six visible cells; supports paste and OS OTP autofill.
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

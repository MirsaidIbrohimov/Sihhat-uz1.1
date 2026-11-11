import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'concept_ui.dart';
import 'data/api.dart';
import 'design.dart';
import 'motion.dart';

/// Shared pieces of the 2026-11 neon design (yangi_dizayn/yangi_UI.jpg).

const neonGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xff8ff5dc), neon, Color(0xff16b38f)],
);

bool isDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

/// Brand mark from the design: Sihhat.uz official logo with neon glow.
class NeonHeartLogo extends StatelessWidget {
  final double size;
  const NeonHeartLogo({this.size = 40, super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Sihhat uz logosi',
    image: true,
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * .24),
        boxShadow: [
          BoxShadow(
            color: neon.withValues(alpha: .5),
            blurRadius: size * .28,
            spreadRadius: 1,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * .24),
        child: Image.asset(
          'assets/branding/sihhat-logo.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => Image.asset(
            'assets/branding/sihhat-logo.jpg',
            width: size,
            height: size,
            fit: BoxFit.contain,
          ),
        ),
      ),
    ),
  );
}

/// Neon glyph (filled Material icon) with a soft glow.
class NeonGlyph extends StatelessWidget {
  final IconData icon;
  final double size;
  final Color? color;
  const NeonGlyph(this.icon, {this.size = 24, this.color, super.key});
  @override
  Widget build(BuildContext context) {
    final c = color ?? context.colors.primary;
    return Icon(
      icon,
      size: size,
      color: c,
      shadows: isDark(context)
          ? [Shadow(color: c.withValues(alpha: .7), blurRadius: 12)]
          : null,
    );
  }
}

/// Dark glass tile with a glowing filled glyph, as in the home shortcuts.
class GlyphTile extends StatelessWidget {
  final IconData icon;
  final double size;
  final bool solid;
  const GlyphTile(this.icon, {this.size = 48, this.solid = false, super.key});
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      gradient: solid
          ? neonGradient
          : isDark(context)
          ? const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xff165a4c), Color(0xff08302a)],
            )
          : null,
      color: isDark(context) || solid ? null : context.colors.soft,
      borderRadius: BorderRadius.circular(size * .3),
      border: isDark(context) && !solid
          ? Border.all(color: neon.withValues(alpha: .45))
          : null,
      boxShadow: [
        if (isDark(context))
          BoxShadow(
            color: neon.withValues(alpha: solid ? .45 : .22),
            blurRadius: 16,
          ),
      ],
    ),
    alignment: Alignment.center,
    child: solid
        ? Icon(icon, size: size * .54, color: abyss)
        : NeonGlyph(icon, size: size * .64),
  );
}

/// Local favourites (saved on the device only).
class Favorites extends ValueNotifier<Set<String>> {
  final TokenStore store;
  Favorites._(this.store) : super({}) {
    load();
  }
  static final _all = Expando<Favorites>();
  factory Favorites(Api api) => _all[api.store] ??= Favorites._(api.store);

  Future<void> load() async {
    try {
      final raw = await store.read('favorites');
      if (raw != null) value = {...(jsonDecode(raw) as List).cast<String>()};
    } catch (_) {
      // Favourites are optional; a broken value starts an empty list.
    }
  }

  Future<void> toggle(String id) async {
    final next = {...value};
    if (!next.remove(id)) next.add(id);
    value = next;
    try {
      await store.write('favorites', jsonEncode(next.toList()));
    } catch (_) {
      // Keep the in-memory choice when secure storage is unavailable.
    }
  }
}

/// Round heart button; bounces when toggled.
class FavoriteButton extends StatelessWidget {
  final Api api;
  final String? id;
  final double size;
  const FavoriteButton(this.api, this.id, {this.size = 38, super.key});
  @override
  Widget build(BuildContext context) {
    if (id == null) return const SizedBox.shrink();
    final favorites = Favorites(api);
    return ValueListenableBuilder<Set<String>>(
      valueListenable: favorites,
      builder: (context, value, _) {
        final on = value.contains(id);
        return Pressable(
          scale: .85,
          child: Tooltip(
            message: on
                ? 'Sevimlilardan olib tashlash'
                : 'Sevimlilarga qo‘shish',
            child: InkResponse(
              onTap: () => favorites.toggle(id!),
              radius: size * .7,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                width: size,
                height: size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: abyss.withValues(alpha: .72),
                  border: Border.all(color: neon.withValues(alpha: .5)),
                  boxShadow: [
                    if (on)
                      BoxShadow(
                        color: neon.withValues(alpha: .55),
                        blurRadius: 14,
                      ),
                  ],
                ),
                alignment: Alignment.center,
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  transitionBuilder: (child, a) => ScaleTransition(
                    scale: CurvedAnimation(parent: a, curve: Curves.elasticOut),
                    child: child,
                  ),
                  child: Icon(
                    on ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                    key: ValueKey(on),
                    size: size * .52,
                    color: neon,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Neon robot with headphones for the AI assistant.
class RobotFace extends StatefulWidget {
  final double size;
  const RobotFace({this.size = 130, super.key});
  @override
  State<RobotFace> createState() => _RobotFaceState();
}

class _RobotFaceState extends State<RobotFace>
    with SingleTickerProviderStateMixin {
  late final AnimationController blink = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3600),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (ambientMotion(context)) {
      if (!blink.isAnimating) blink.repeat();
    } else {
      blink
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    blink.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: AnimatedBuilder(
      animation: blink,
      builder: (context, _) => CustomPaint(
        size: Size.square(widget.size),
        painter: _RobotPainter(blink.value),
      ),
    ),
  );
}

class _RobotPainter extends CustomPainter {
  final double t;
  const _RobotPainter(this.t);
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final glow = Paint()
      ..color = neon.withValues(alpha: .35)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18);
    final head = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(w / 2, w * .54),
        width: w * .66,
        height: w * .56,
      ),
      Radius.circular(w * .2),
    );
    canvas.drawRRect(head, glow);
    // Headphone band and ear cups.
    final band = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * .06
      ..strokeCap = StrokeCap.round
      ..shader = neonGradient.createShader(Offset.zero & size);
    canvas.drawArc(
      Rect.fromCenter(
        center: Offset(w / 2, w * .5),
        width: w * .82,
        height: w * .78,
      ),
      math.pi * 1.08,
      math.pi * .84,
      false,
      band,
    );
    final cup = Paint()..shader = neonGradient.createShader(Offset.zero & size);
    for (final x in [w * .12, w * .88]) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(x, w * .56),
            width: w * .16,
            height: w * .3,
          ),
          Radius.circular(w * .07),
        ),
        cup,
      );
    }
    canvas.drawRRect(
      head,
      Paint()..shader = neonGradient.createShader(head.outerRect),
    );
    // Dark visor.
    final visor = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(w / 2, w * .55),
        width: w * .5,
        height: w * .36,
      ),
      Radius.circular(w * .14),
    );
    canvas.drawRRect(visor, Paint()..color = abyss);
    // Eyes blink once per cycle.
    final open = t > .92 && t < .97 ? .15 : 1.0;
    final eye = Paint()..color = neon;
    for (final x in [w * .41, w * .59]) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(x, w * .52),
            width: w * .07,
            height: w * .1 * open,
          ),
          Radius.circular(w * .035),
        ),
        eye,
      );
    }
    canvas.drawArc(
      Rect.fromCenter(
        center: Offset(w / 2, w * .6),
        width: w * .12,
        height: w * .07,
      ),
      .2,
      math.pi - .4,
      false,
      Paint()
        ..color = neon
        ..style = PaintingStyle.stroke
        ..strokeWidth = w * .022
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_RobotPainter old) => old.t != t;
}

/// Flowing neon light waves (notifications background in the design).
class NeonWaves extends StatefulWidget {
  const NeonWaves({super.key});
  @override
  State<NeonWaves> createState() => _NeonWavesState();
}

class _NeonWavesState extends State<NeonWaves>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 12),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (ambientMotion(context)) {
      if (!controller.isAnimating) controller.repeat();
    } else {
      controller.stop();
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: AnimatedBuilder(
      animation: controller,
      builder: (context, _) => CustomPaint(
        painter: _WavesPainter(controller.value, isDark(context)),
        size: Size.infinite,
      ),
    ),
  );
}

class _WavesPainter extends CustomPainter {
  final double t;
  final bool dark;
  const _WavesPainter(this.t, this.dark);
  @override
  void paint(Canvas canvas, Size size) {
    final phase = t * 2 * math.pi;
    void wave(
      double baseY,
      double amp,
      double alpha,
      double width,
      double shift,
    ) {
      final path = Path();
      for (var x = 0.0; x <= size.width; x += 6) {
        final y =
            baseY +
            math.sin(x / size.width * 2.2 * math.pi + phase + shift) * amp;
        x == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
      }
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = width * 9
          ..color = neon.withValues(alpha: alpha * .4)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 22),
      );
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = width
          ..color = neon.withValues(alpha: alpha),
      );
    }

    final k = dark ? 1.0 : .5;
    wave(size.height * .24, 44, .6 * k, 2.6, 0);
    wave(size.height * .31, 30, .3 * k, 1.4, 1.4);
    wave(size.height * .8, 54, .8 * k, 3.2, 2.6);
    wave(size.height * .9, 34, .4 * k, 1.6, 4);
  }

  @override
  bool shouldRepaint(_WavesPainter old) => old.t != t || old.dark != dark;
}

/// Diagonal light beams of the design background.
class LightStreaks extends CustomPainter {
  final bool dark;
  const LightStreaks(this.dark);
  @override
  void paint(Canvas canvas, Size size) {
    if (!dark) return;
    final w = size.width, h = size.height;
    void beam(Offset a, Offset b, double alpha, double width) {
      canvas.drawLine(
        a,
        b,
        Paint()
          ..strokeWidth = width * 6
          ..strokeCap = StrokeCap.round
          ..color = neon.withValues(alpha: alpha * .18)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20),
      );
      canvas.drawLine(
        a,
        b,
        Paint()
          ..strokeWidth = width
          ..strokeCap = StrokeCap.round
          ..shader = LinearGradient(
            colors: [
              neon.withValues(alpha: 0),
              neon.withValues(alpha: alpha),
              neon.withValues(alpha: 0),
            ],
          ).createShader(Rect.fromPoints(a, b)),
      );
    }

    beam(Offset(w * .45, -h * .02), Offset(w * 1.05, h * .2), .55, 1.6);
    beam(Offset(w * .7, -h * .02), Offset(w * 1.05, h * .1), .35, 1);
    beam(Offset(-w * .05, h * .7), Offset(w * .4, h * 1.02), .3, 1.2);
  }

  @override
  bool shouldRepaint(LightStreaks old) => old.dark != dark;
}

/// Card edge that is brighter at the top-left, like lit glass.
class GlowBorderPainter extends CustomPainter {
  final double radius;
  final double strength;
  const GlowBorderPainter({required this.radius, this.strength = 1});
  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(.6);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(radius)),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xffb6fbe9).withValues(alpha: .75 * strength),
            neon.withValues(alpha: .28 * strength),
            neon.withValues(alpha: .12 * strength),
            neon.withValues(alpha: .4 * strength),
          ],
          stops: const [0, .3, .7, 1],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(GlowBorderPainter old) =>
      old.radius != radius || old.strength != strength;
}

/// Big neon page heading with optional "Barchasi" link (bookings, news).
class NeonSectionHeader extends StatelessWidget {
  final String title;
  final IconData? icon;
  final VoidCallback? onAll;
  final double size;
  const NeonSectionHeader(
    this.title, {
    this.icon,
    this.onAll,
    this.size = 18,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 10),
    child: Row(
      children: [
        if (icon != null) ...[
          NeonGlyph(icon!, size: 22),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: Text(title, style: conceptHeading(context, size: size)),
        ),
        if (onAll != null)
          TextButton(
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
      ],
    ),
  );
}

/// Big glowing bell with a check badge (empty notifications).
class NeonBell extends StatelessWidget {
  final double size;
  const NeonBell({this.size = 130, super.key});
  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: size,
    child: Stack(
      alignment: Alignment.center,
      children: [
        Swing(
          child: ShaderMask(
            shaderCallback: neonGradient.createShader,
            child: Icon(
              Icons.notifications_rounded,
              size: size,
              color: Colors.white,
              shadows: [
                Shadow(color: neon.withValues(alpha: .7), blurRadius: 30),
              ],
            ),
          ),
        ),
        Positioned(
          right: size * .02,
          bottom: size * .14,
          child: PulseGlow(
            child: Container(
              padding: EdgeInsets.all(size * .05),
              decoration: BoxDecoration(
                color: const Color(0xff0e4a40),
                shape: BoxShape.circle,
                border: Border.all(color: neon, width: 2),
              ),
              child: Icon(Icons.check_rounded, size: size * .22, color: neon),
            ),
          ),
        ),
      ],
    ),
  );
}

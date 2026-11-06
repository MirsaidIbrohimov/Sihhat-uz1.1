import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'design.dart';

/// Motion settings for the 2026-11 neon design.
abstract final class Motion {
  /// Looping animations never settle, so widget/integration tests switch them off.
  static bool ambient = !Platform.environment.containsKey('FLUTTER_TEST');
}

/// Users who ask the OS for less motion get static, fully visible content.
bool reducedMotion(BuildContext context) =>
    MediaQuery.maybeDisableAnimationsOf(context) ?? false;

bool ambientMotion(BuildContext context) =>
    Motion.ambient && !reducedMotion(context);

/// Fades and lifts its child in once; [index] staggers items of a list.
class Reveal extends StatefulWidget {
  final Widget child;
  final int index;
  final Offset offset;
  const Reveal({
    required this.child,
    this.index = 0,
    this.offset = const Offset(0, .14),
    super.key,
  });
  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController controller;
  late final Animation<double> progress;
  @override
  void initState() {
    super.initState();
    final delay = math.min(widget.index, 8) * 70;
    final total = delay + 520;
    controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: total),
    )..forward();
    progress = CurvedAnimation(
      parent: controller,
      curve: Interval(delay / total, 1, curve: Curves.easeOutCubic),
    );
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (reducedMotion(context)) return widget.child;
    return FadeTransition(
      opacity: progress,
      child: SlideTransition(
        position: Tween(
          begin: widget.offset,
          end: Offset.zero,
        ).animate(progress),
        child: widget.child,
      ),
    );
  }
}

/// Springy press feedback for any tappable child; it never consumes the tap.
class Pressable extends StatefulWidget {
  final Widget child;
  final double scale;
  const Pressable({required this.child, this.scale = .96, super.key});
  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool down = false;
  void set(bool value) {
    if (down != value && mounted) setState(() => down = value);
  }

  @override
  Widget build(BuildContext context) => Listener(
    onPointerDown: (_) {
      set(true);
      HapticFeedback.selectionClick();
    },
    onPointerUp: (_) => set(false),
    onPointerCancel: (_) => set(false),
    child: AnimatedScale(
      scale: down && !reducedMotion(context) ? widget.scale : 1,
      duration: Duration(milliseconds: down ? 90 : 260),
      curve: down ? Curves.easeOut : Curves.elasticOut,
      child: widget.child,
    ),
  );
}

/// A breathing neon glow; static when motion is reduced.
class PulseGlow extends StatefulWidget {
  final Widget child;
  final Color color;
  final BorderRadius? borderRadius;
  final double strength;
  final Duration period;
  const PulseGlow({
    required this.child,
    this.color = neon,
    this.borderRadius,
    this.strength = 1,
    this.period = const Duration(milliseconds: 2200),
    super.key,
  });
  @override
  State<PulseGlow> createState() => _PulseGlowState();
}

class _PulseGlowState extends State<PulseGlow>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: widget.period,
    value: .5,
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (ambientMotion(context)) {
      if (!controller.isAnimating) controller.repeat(reverse: true);
    } else {
      controller
        ..stop()
        ..value = .5;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, child) {
      final t = Curves.easeInOut.transform(controller.value);
      return DecoratedBox(
        decoration: BoxDecoration(
          shape: widget.borderRadius == null
              ? BoxShape.circle
              : BoxShape.rectangle,
          borderRadius: widget.borderRadius,
          boxShadow: [
            BoxShadow(
              color: widget.color.withValues(
                alpha: (.18 + .26 * t) * widget.strength,
              ),
              blurRadius: 16 + 22 * t,
              spreadRadius: 1 + 4 * t,
            ),
          ],
        ),
        child: child,
      );
    },
    child: widget.child,
  );
}

/// Gentle vertical bobbing for illustrations.
class FloatY extends StatefulWidget {
  final Widget child;
  final double distance;
  const FloatY({required this.child, this.distance = 6, super.key});
  @override
  State<FloatY> createState() => _FloatYState();
}

class _FloatYState extends State<FloatY> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3200),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (ambientMotion(context)) {
      if (!controller.isAnimating) controller.repeat();
    } else {
      controller
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, child) => Transform.translate(
      offset: Offset(
        0,
        math.sin(controller.value * 2 * math.pi) * widget.distance,
      ),
      child: child,
    ),
    child: widget.child,
  );
}

/// A bell-like swing with a rest between swings.
class Swing extends StatefulWidget {
  final Widget child;
  const Swing({required this.child, super.key});
  @override
  State<Swing> createState() => _SwingState();
}

class _SwingState extends State<Swing> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (ambientMotion(context)) {
      if (!controller.isAnimating) controller.repeat();
    } else {
      controller
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, child) {
      final t = controller.value;
      // Swing during the first third, then rest.
      final angle = t < .34
          ? math.sin(t / .34 * 4 * math.pi) * .2 * (1 - t / .34)
          : 0.0;
      return Transform.rotate(
        angle: angle,
        alignment: Alignment.topCenter,
        child: child,
      );
    },
    child: widget.child,
  );
}

/// A rotating neon ring (used around avatars and the AI assistant).
class NeonRing extends StatefulWidget {
  final double size, width;
  final Widget child;
  const NeonRing({
    required this.size,
    required this.child,
    this.width = 3,
    super.key,
  });
  @override
  State<NeonRing> createState() => _NeonRingState();
}

class _NeonRingState extends State<NeonRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 6),
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
  Widget build(BuildContext context) => SizedBox.square(
    dimension: widget.size,
    child: Stack(
      alignment: Alignment.center,
      children: [
        RotationTransition(
          turns: controller,
          child: Container(
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: SweepGradient(
                colors: [
                  Color(0x003ee6bf),
                  neon,
                  Color(0xff9bf7e1),
                  Color(0x003ee6bf),
                ],
                stops: [0, .45, .6, 1],
              ),
            ),
          ),
        ),
        Padding(padding: EdgeInsets.all(widget.width), child: widget.child),
      ],
    ),
  );
}

/// Modern fade-through page transition used for every pushed page.
class NeonPageTransitions extends PageTransitionsBuilder {
  const NeonPageTransitions();
  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (reducedMotion(context)) return child;
    final enter = CurvedAnimation(
      parent: animation,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    );
    final leave = CurvedAnimation(
      parent: secondaryAnimation,
      curve: Curves.easeOutCubic,
    );
    return FadeTransition(
      opacity: Tween(begin: 1.0, end: .55).animate(leave),
      child: FadeTransition(
        opacity: enter,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(.08, 0),
            end: Offset.zero,
          ).animate(enter),
          child: ScaleTransition(
            scale: Tween(begin: .98, end: 1.0).animate(enter),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// A light sweep across skeleton placeholders; static when motion is off.
class Shimmer extends StatefulWidget {
  final Widget child;
  const Shimmer({required this.child, super.key});
  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1500),
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
  Widget build(BuildContext context) {
    if (!ambientMotion(context)) return widget.child;
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) => ShaderMask(
        blendMode: BlendMode.srcATop,
        shaderCallback: (rect) => LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            Colors.white.withValues(alpha: 0),
            Colors.white.withValues(alpha: .16),
            Colors.white.withValues(alpha: 0),
          ],
          stops: const [.35, .5, .65],
          transform: _SlideGradient(controller.value * 2 - 1),
        ).createShader(rect),
        child: child,
      ),
      child: widget.child,
    );
  }
}

class _SlideGradient extends GradientTransform {
  final double offset;
  const _SlideGradient(this.offset);
  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) =>
      Matrix4.translationValues(bounds.width * offset * 1.4, 0, 0);
}

/// Three bouncing neon dots ("yozmoqda…").
class TypingDots extends StatefulWidget {
  final Color? color;
  const TypingDots({this.color, super.key});
  @override
  State<TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<TypingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (ambientMotion(context)) {
      if (!controller.isAnimating) controller.repeat();
    } else {
      controller
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? neon;
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < 3; i++)
            Builder(
              builder: (context) {
                final t = (controller.value - i * .16) % 1;
                final lift = t < .4 ? math.sin(t / .4 * math.pi) : 0.0;
                return Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  transform: Matrix4.translationValues(0, -5 * lift, 0),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withValues(alpha: .45 + .55 * lift),
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: .5 * lift),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

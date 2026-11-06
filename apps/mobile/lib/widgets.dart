import 'dart:io';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import 'data/api.dart';
import 'data/catalog_cache.dart';
import 'design.dart';
import 'concept_ui.dart' show ConceptCard, IconTile, SihhatIcon, conceptHeading;
import 'motion.dart';

/// Loading state: glass skeleton cards with a light sweep.
class Busy extends StatelessWidget {
  final int cards;
  const Busy({this.cards = 2, super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Yuklanmoqda',
    liveRegion: true,
    child: ExcludeSemantics(
      child: LayoutBuilder(
        builder: (context, box) {
          final column = Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < cards; i++)
                Reveal(index: i, child: const SkeletonCard()),
            ],
          );
          // Standalone (page body) placeholders need their own page margins.
          return box.hasBoundedHeight
              ? SingleChildScrollView(
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                  child: column,
                )
              : column;
        },
      ),
    ),
  );
}

/// Placeholder shaped like a catalogue card.
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key});
  @override
  Widget build(BuildContext context) {
    final block = isDarkTheme(context)
        ? neon.withValues(alpha: .10)
        : context.colors.soft;
    Widget bar(double width, double height) => FractionallySizedBox(
      widthFactor: width,
      alignment: Alignment.centerLeft,
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: block,
          borderRadius: BorderRadius.circular(height / 2),
        ),
      ),
    );
    return ConceptCard(
      padding: const EdgeInsets.all(14),
      child: Shimmer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 132,
              decoration: BoxDecoration(
                color: block,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 16),
            bar(.62, 18),
            const SizedBox(height: 10),
            bar(.38, 12),
            const SizedBox(height: 16),
            Row(
              children: [
                for (final w in [64.0, 88.0, 72.0])
                  Container(
                    width: w,
                    height: 22,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: block,
                      borderRadius: BorderRadius.circular(11),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

bool isDarkTheme(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

bool isOfflineError(Object error) =>
    error is ApiException &&
        ['NETWORK_ERROR', 'NETWORK_TIMEOUT'].contains(error.code) ||
    error.toString().toLowerCase().contains('internet');

/// Errors: a compact inline banner, or a full state card when retry exists.
class ErrorView extends StatelessWidget {
  final Object error;
  final VoidCallback? retry;
  const ErrorView(this.error, {this.retry, super.key});
  @override
  Widget build(BuildContext context) {
    final offline = isOfflineError(error);
    final accent = offline
        ? context.colors.primary
        : isDarkTheme(context)
        ? const Color(0xffff8a80)
        : Theme.of(context).colorScheme.error;
    final icon = offline ? 'wifi-off' : 'circle-alert';
    if (retry == null) {
      return Semantics(
        liveRegion: true,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: .10),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accent.withValues(alpha: .45)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SihhatIcon(icon, color: accent, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  error.toString(),
                  style: TextStyle(
                    color: context.colors.ink,
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Reveal(
            child: ConceptCard(
              padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FloatY(
                    child: PulseGlow(
                      color: accent,
                      strength: .7,
                      borderRadius: const BorderRadius.all(Radius.circular(22)),
                      child: Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: .12),
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(
                            color: accent.withValues(alpha: .5),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: SihhatIcon(icon, color: accent, size: 36),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    offline ? 'Internet aloqasi yo‘q' : 'Nimadir xato ketdi',
                    textAlign: TextAlign.center,
                    style: conceptHeading(context, size: 20),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: context.colors.muted,
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Pressable(
                    child: FilledButton.icon(
                      onPressed: retry,
                      icon: const SihhatIcon('refresh-cw', size: 18),
                      label: const Text('Qayta urinish'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Empty lists: floating neon illustration, message and an optional action.
class EmptyView extends StatelessWidget {
  final String text;
  final String icon;
  final String? title, actionLabel;
  final VoidCallback? onAction;
  const EmptyView(
    this.text, {
    this.icon = 'leaf',
    this.title,
    this.actionLabel,
    this.onAction,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
      child: Reveal(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FloatY(
              child: PulseGlow(
                borderRadius: const BorderRadius.all(Radius.circular(24)),
                strength: .7,
                child: IconTile(icon, size: 80),
              ),
            ),
            const SizedBox(height: 22),
            if (title != null) ...[
              Text(
                title!,
                textAlign: TextAlign.center,
                style: conceptHeading(context, size: 20),
              ),
              const SizedBox(height: 8),
            ],
            Text(
              text,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: context.colors.muted,
                fontSize: 15,
                height: 1.45,
              ),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 22),
              Pressable(
                child: FilledButton.icon(
                  onPressed: onAction,
                  icon: const SihhatIcon('arrow-right', size: 18),
                  label: Text(actionLabel!),
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

class AsyncContent extends StatefulWidget {
  final Future<dynamic> Function() load;
  final Widget Function(dynamic value) builder;
  const AsyncContent({required this.load, required this.builder, super.key});
  @override
  State<AsyncContent> createState() => _AsyncContentState();
}

/// Show saved content immediately, then update it without hiding it on outages.
class CachedContent extends StatefulWidget {
  final Future<dynamic> Function() cached, refresh;
  final Widget Function(dynamic value) builder;
  final Listenable? changes;
  final bool clearWhenMissing;
  const CachedContent({
    required this.cached,
    required this.refresh,
    required this.builder,
    this.changes,
    this.clearWhenMissing = false,
    super.key,
  });
  @override
  State<CachedContent> createState() => _CachedContentState();
}

class _CachedContentState extends State<CachedContent> {
  dynamic value;
  Object? error;
  bool loading = true;
  int request = 0;
  @override
  void initState() {
    super.initState();
    widget.changes?.addListener(readCache);
    initial();
  }

  Future<void> readCache() async {
    final data = await widget.cached();
    if (mounted && data != null) setState(() => value = data);
    if (mounted && data == null && widget.clearWhenMissing && value != null) {
      setState(() {
        value = null;
        loading = false;
        error = 'Sanatoriya hozir katalogda mavjud emas.';
      });
    }
  }

  Future<void> initial() async {
    await readCache();
    if (mounted) await refresh();
  }

  Future<void> refresh() async {
    final current = ++request;
    try {
      final data = await widget.refresh();
      if (mounted && current == request) {
        setState(() {
          value = data;
          error = null;
        });
      }
    } catch (e) {
      if (mounted && current == request) {
        setState(() {
          if (e is ApiException && [401, 403, 404].contains(e.status)) {
            value = null;
          }
          error = e;
        });
      }
    } finally {
      if (mounted && current == request) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    widget.changes?.removeListener(readCache);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (value != null) {
      return RefreshIndicator(onRefresh: refresh, child: widget.builder(value));
    }
    if (loading) return const Busy();
    return ErrorView(
      error ?? 'Ma’lumotlarni yuklash uchun internetga ulaning.',
      retry: refresh,
    );
  }
}

class SanatoriumPhoto extends StatefulWidget {
  final Api api;
  final String id;
  final BoxFit fit;
  final Widget fallback;
  const SanatoriumPhoto({
    required this.api,
    required this.id,
    this.fit = BoxFit.cover,
    this.fallback = const SizedBox(),
    super.key,
  });
  @override
  State<SanatoriumPhoto> createState() => _SanatoriumPhotoState();
}

class _SanatoriumPhotoState extends State<SanatoriumPhoto> {
  late Future<File?> future;
  @override
  void initState() {
    super.initState();
    CatalogCache(widget.api).addListener(updated);
    load();
  }

  void load() {
    future = CatalogCache(widget.api).photos.file(widget.id);
  }

  @override
  void didUpdateWidget(covariant SanatoriumPhoto oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.api != widget.api) {
      CatalogCache(oldWidget.api).removeListener(updated);
      CatalogCache(widget.api).addListener(updated);
    }
    if (oldWidget.api != widget.api || oldWidget.id != widget.id) load();
  }

  void updated() {
    if (mounted) setState(load);
  }

  @override
  void dispose() {
    CatalogCache(widget.api).removeListener(updated);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<File?>(
    future: future,
    builder: (_, result) => result.data == null
        ? widget.fallback
        : Image.file(
            result.data!,
            cacheWidth: 1200,
            fit: widget.fit,
            errorBuilder: (_, _, _) => widget.fallback,
          ),
  );
}

class _AsyncContentState extends State<AsyncContent> {
  late Future<dynamic> future;
  @override
  void initState() {
    super.initState();
    future = widget.load();
  }

  @override
  void didUpdateWidget(covariant AsyncContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.key != widget.key) future = widget.load();
  }

  void reload() => setState(() {
    future = widget.load();
  });
  @override
  Widget build(BuildContext context) => FutureBuilder(
    future: future,
    builder: (context, s) {
      if (s.connectionState != ConnectionState.done) return const Busy();
      if (s.hasError) return ErrorView(s.error!, retry: reload);
      return RefreshIndicator(
        onRefresh: () async {
          reload();
          await future;
        },
        child: widget.builder(s.data),
      );
    },
  );
}

class Pill extends StatelessWidget {
  final String value;
  const Pill(this.value, {super.key});
  @override
  Widget build(BuildContext context) {
    final good = ['CONFIRMED', 'SUCCEEDED', 'CHECKED_OUT'].contains(value);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final accent = good
        ? (dark ? neon : forest)
        : (dark ? const Color(0xffffc46b) : const Color(0xff9b4708));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: dark
            ? abyss.withValues(alpha: .8)
            : good
            ? context.colors.soft
            : context.colors.warning,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withValues(alpha: .6)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            states[value] ?? value,
            style: TextStyle(
              fontSize: 11,
              color: dark ? accent : context.colors.ink,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class SanatoriumCard extends StatelessWidget {
  final Json item;
  final Api api;
  final VoidCallback open;
  final Widget? trailing;
  final Widget? footer;
  const SanatoriumCard({
    required this.item,
    required this.api,
    required this.open,
    this.trailing,
    this.footer,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final photos = ((item['photos'] as List?)?.isNotEmpty == true
        ? (item['photos'] as List)
        : (item['photo_ids'] as List? ?? []));
    return GlassCard(
      padding: EdgeInsets.zero,
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: open,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 184,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: Theme.of(context).brightness == Brightness.dark
                            ? [context.colors.soft, context.colors.canvas]
                            : const [Color(0xffcfe1bb), Color(0xffe8efdd)],
                      ),
                    ),
                    child: ExcludeSemantics(
                      child: CustomPaint(
                        painter: RetreatLandscape(
                          dark: Theme.of(context).brightness == Brightness.dark,
                        ),
                      ),
                    ),
                  ),
                  if (photos.isNotEmpty)
                    SanatoriumPhoto(
                      api: api,
                      id: photos.first.toString(),
                      fit: BoxFit.cover,
                    ),
                  Positioned(
                    left: 16,
                    bottom: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: context.colors.surface.withValues(alpha: .94),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            size: 14,
                            color: context.colors.primary,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            item['region'] ?? '',
                            style: TextStyle(
                              color: context.colors.ink,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (trailing != null)
                    Positioned(right: 12, top: 12, child: trailing!),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['name'] ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 20,
                      letterSpacing: -.4,
                      color: context.colors.ink,
                    ),
                  ),
                  const SizedBox(height: 9),
                  Wrap(
                    spacing: 7,
                    runSpacing: 5,
                    children: (item['amenities'] as List? ?? [])
                        .take(3)
                        .map(
                          (a) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: context.colors.canvas,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              a,
                              style: TextStyle(
                                color: context.colors.muted,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item['from_amount'] == null
                              ? 'Tarifni ko‘ring'
                              : money(item['from_amount']),
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 19,
                            color: context.colors.primary,
                          ),
                        ),
                      ),
                      CircleAvatar(
                        backgroundColor: context.colors.soft,
                        radius: 22,
                        child: Icon(
                          Icons.arrow_forward_rounded,
                          size: 20,
                          color: context.colors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Boshlang‘ich tarif · yakuniy narx bron hisobida',
                    style: TextStyle(fontSize: 11, color: context.colors.muted),
                  ),
                ],
              ),
            ),
            if (footer != null) ...[const Divider(height: 1), footer!],
          ],
        ),
      ),
    );
  }
}

Future<bool> messageDialog(
  BuildContext context,
  String title,
  Future<void> Function(String) submit, {
  String button = 'Yuborish',
}) async {
  final sent = await showGlassDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) =>
        _MessageDialog(title: title, submit: submit, button: button),
  );
  return sent ?? false;
}

class _MessageDialog extends StatefulWidget {
  final String title, button;
  final Future<void> Function(String) submit;
  const _MessageDialog({
    required this.title,
    required this.submit,
    required this.button,
  });
  @override
  State<_MessageDialog> createState() => _MessageDialogState();
}

class _MessageDialogState extends State<_MessageDialog> {
  final text = TextEditingController();
  bool busy = false;
  String? error;
  @override
  void dispose() {
    text.dispose();
    super.dispose();
  }

  Future<void> send() async {
    if (busy) return;
    final value = text.text.trim();
    if (value.length < 3) {
      setState(() => error = 'Kamida 3 belgi yozing.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.submit(value);
      if (!mounted) return;
      setState(() => busy = false);
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        busy = false;
        error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: text,
            enabled: !busy,
            minLines: 2,
            maxLines: 5,
            decoration: const InputDecoration(labelText: 'Izoh'),
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: busy ? null : () => Navigator.pop(context),
          child: const Text('Yopish'),
        ),
        FilledButton(
          onPressed: busy ? null : send,
          child: Text(busy ? 'Yuborilmoqda…' : widget.button),
        ),
      ],
    ),
  );
}

/// Dialog with a blurred backdrop and a soft scale/fade entrance.
Future<T?> showGlassDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool barrierDismissible = true,
}) {
  final navigator = Navigator.of(context, rootNavigator: true);
  final themes = InheritedTheme.capture(from: context, to: navigator.context);
  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: abyss.withValues(alpha: .55),
    transitionDuration: const Duration(milliseconds: 320),
    pageBuilder: (c, _, _) =>
        themes.wrap(SafeArea(child: Builder(builder: builder))),
    transitionBuilder: (c, animation, _, child) {
      final curve = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutBack,
        reverseCurve: Curves.easeInCubic,
      );
      final reduced = reducedMotion(c);
      return AnimatedBuilder(
        animation: animation,
        builder: (c, child) => BackdropFilter(
          filter: ImageFilter.blur(
            sigmaX: 6 * animation.value,
            sigmaY: 6 * animation.value,
          ),
          child: child,
        ),
        child: FadeTransition(
          opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
          child: reduced
              ? child
              : ScaleTransition(
                  scale: Tween(begin: .9, end: 1.0).animate(curve),
                  child: child,
                ),
        ),
      );
    },
  );
}

import 'package:flutter/material.dart';

import 'data/api.dart';
import 'design.dart';

class Busy extends StatelessWidget {
  const Busy({super.key});
  @override
  Widget build(BuildContext context) => const Center(
    child: Padding(
      padding: EdgeInsets.all(32),
      child: CircularProgressIndicator(),
    ),
  );
}

class ErrorView extends StatelessWidget {
  final Object error;
  final VoidCallback? retry;
  const ErrorView(this.error, {this.retry, super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.wifi_off_rounded, color: context.colors.primary, size: 30),
        const SizedBox(height: 16),
        Text(error.toString(), textAlign: TextAlign.center),
        if (retry != null)
          TextButton(onPressed: retry, child: const Text('Qayta urinish')),
      ],
    ),
  );
}

class EmptyView extends StatelessWidget {
  final String text;
  const EmptyView(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(35),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.spa_outlined, color: context.colors.primary, size: 36),
          const SizedBox(height: 14),
          Text(text, textAlign: TextAlign.center),
        ],
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
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
    decoration: BoxDecoration(
      color: ['CONFIRMED', 'SUCCEEDED', 'CHECKED_OUT'].contains(value)
          ? context.colors.soft
          : context.colors.warning,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(
      states[value] ?? value,
      style: TextStyle(
        fontSize: 11,
        color: context.colors.ink,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
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
    final photos = item['photo_ids'] as List?;
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
                  if (photos?.isNotEmpty == true)
                    Image.network(
                      api.image(photos!.first),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox(),
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
  final sent = await showDialog<bool>(
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

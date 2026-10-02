import 'package:flutter/material.dart';

import 'data/api.dart';

const green = Color(0xff176b51),
    ink = Color(0xff203a2d),
    pale = Color(0xffedf3e8);

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
        const Icon(Icons.wifi_off_rounded, color: green, size: 30),
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
          const Icon(Icons.spa_outlined, color: green, size: 36),
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
          ? pale
          : const Color(0xfffff2dc),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(
      states[value] ?? value,
      style: const TextStyle(
        fontSize: 11,
        color: ink,
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
  const SanatoriumCard({
    required this.item,
    required this.api,
    required this.open,
    this.trailing,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final photos = item['photo_ids'] as List?;
    return Card(
      clipBehavior: Clip.antiAlias,
      margin: const EdgeInsets.only(bottom: 18),
      child: InkWell(
        onTap: open,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 150,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xffcfe1bb), Color(0xffe8efdd)],
                      ),
                    ),
                    child: const Icon(
                      Icons.landscape_outlined,
                      size: 65,
                      color: Color(0xff73946a),
                    ),
                  ),
                  if (photos?.isNotEmpty == true)
                    Image.network(
                      api.image(photos!.first),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox(),
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
                    item['region'] ?? '',
                    style: const TextStyle(fontSize: 11, color: green),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    item['name'] ?? '',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 19,
                      color: ink,
                    ),
                  ),
                  const SizedBox(height: 9),
                  Wrap(
                    spacing: 7,
                    runSpacing: 5,
                    children: (item['amenities'] as List? ?? [])
                        .take(3)
                        .map(
                          (a) => Text(
                            a,
                            style: const TextStyle(
                              color: Colors.black54,
                              fontSize: 11,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item['from_amount'] == null
                            ? 'Tarifni ko‘ring'
                            : money(item['from_amount']),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: green,
                        ),
                      ),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        size: 19,
                        color: green,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Boshlang‘ich tarif · yakuniy narx bron hisobida',
                    style: TextStyle(fontSize: 10, color: Colors.black45),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> messageDialog(
  BuildContext context,
  String title,
  Future<void> Function(String) submit, {
  String button = 'Yuborish',
}) async {
  final text = TextEditingController();
  await showDialog<void>(
    context: context,
    builder: (dialogContext) {
      bool busy = false;
      String? error;
      return StatefulBuilder(
        builder: (context, set) => AlertDialog(
          title: Text(title),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: text,
                minLines: 2,
                maxLines: 5,
                decoration: const InputDecoration(labelText: 'Izoh'),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    error!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: busy ? null : () => Navigator.pop(dialogContext),
              child: const Text('Yopish'),
            ),
            FilledButton(
              onPressed: busy
                  ? null
                  : () async {
                      if (text.text.trim().length < 3) {
                        set(() => error = 'Kamida 3 belgi yozing.');
                        return;
                      }
                      set(() => busy = true);
                      try {
                        await submit(text.text.trim());
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                      } catch (e) {
                        set(() => error = e.toString());
                      } finally {
                        if (dialogContext.mounted) set(() => busy = false);
                      }
                    },
              child: Text(busy ? 'Yuborilmoqda…' : button),
            ),
          ],
        ),
      );
    },
  );
  text.dispose();
}

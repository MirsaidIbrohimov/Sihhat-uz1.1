import 'dart:async';

import 'package:flutter/material.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../appearance.dart';
import '../concept_ui.dart';
import '../catalog_card.dart';
import 'catalog.dart';
import 'login.dart';

class AiScreen extends StatefulWidget {
  final Api api;
  const AiScreen(this.api, {super.key});
  @override
  State<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends State<AiScreen> {
  final input = TextEditingController();
  final scroll = ScrollController();
  void scrollToEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted && scroll.hasClients) {
      scroll.animateTo(
        scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  });
  final messages = <Json>[];
  bool busy = false, share = false, askingConsent = false;

  Future<bool> consent() async {
    if (share || await widget.api.store.read('ai_consent') == 'true') {
      return share = true;
    }
    if (!mounted) return false;
    final agreed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Column(
          children: [
            const IconTile('shield-check', size: 60),
            const SizedBox(height: 18),
            Text('AI yordamchi', style: conceptHeading(c, size: 24)),
          ],
        ),
        content: const Text(
          'Tavsiyalar olish uchun savolingiz va suhbatdagi tanlovlaringiz tashqi AI xizmatida qayta ishlanadi. Telefon va email yashiriladi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Keyinroq'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Davom etish'),
          ),
        ],
      ),
    );
    if (agreed != true) return false;
    await widget.api.store.write('ai_consent', 'true');
    return share = true;
  }

  @override
  void dispose() {
    scroll.dispose();
    input.dispose();
    super.dispose();
  }

  Future<void> send() async {
    final text = input.text.trim();
    if (text.isEmpty || busy || askingConsent) return;
    setState(() => askingConsent = true);
    if (!await consent()) {
      if (mounted) setState(() => askingConsent = false);
      return;
    }
    if (!mounted) return;
    final history = messages
        .where((m) => m['error'] != true)
        .map(
          (m) => {
            'role': m['user'] == true ? 'user' : 'assistant',
            'message': (m['message'] as String).length > 1000
                ? (m['message'] as String).substring(0, 1000)
                : m['message'],
          },
        )
        .toList();
    setState(() {
      askingConsent = false;
      messages.add({'user': true, 'message': text});
      busy = true;
      input.clear();
    });
    scrollToEnd();
    try {
      final r = asJson(
        await widget.api.send(
          '/ai/messages',
          method: 'POST',
          body: {
            'message': text,
            'history': history.length > 12
                ? history.sublist(history.length - 12)
                : history,
            'share_with_provider': share,
          },
        ),
      );
      if (!mounted) return;
      setState(() => messages.add(r));
    } catch (e) {
      if (mounted) {
        setState(() => messages.add({'message': e.toString(), 'error': true}));
      }
    } finally {
      if (mounted) {
        setState(() => busy = false);
        scrollToEnd();
      }
    }
  }

  @override
  Widget build(BuildContext context) => ConceptScope(
    child: Column(
      children: [
        Expanded(
          child: ListView(
            controller: scroll,
            padding: const EdgeInsets.all(20),
            children: [
              if (messages.isEmpty) ...[
                const SizedBox(height: 36),
                const Center(child: IconTile('sparkles', size: 88)),
                const SizedBox(height: 24),
                Text(
                  'Sizga mos dam olishni topamiz',
                  textAlign: TextAlign.center,
                  style: conceptHeading(context, size: 26),
                ),
                const SizedBox(height: 14),
                Text(
                  'Hudud, sana va byudjetingizni yozing.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: context.colors.muted, fontSize: 16),
                ),
                const Divider(height: 40),
                const ConceptRow(
                  'shield-check',
                  'Tibbiy moslikni sanatoriya mutaxassisi bilan aniqlang.',
                ),
                const SizedBox(height: 20),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final suggestion in [
                      'Tog‘da dam olish',
                      'Oilaviy safar',
                      '500 minggacha',
                    ])
                      ActionChip(
                        label: Text(suggestion),
                        onPressed: busy || askingConsent
                            ? null
                            : () {
                                input.text = suggestion;
                                send();
                              },
                      ),
                  ],
                ),
              ] else ...[
                const ConceptInfo(
                  icon: 'shield-check',
                  title: 'Tavsiyalar tasdiqlangan katalogdan',
                ),
                for (final m in messages) ...[
                  ChatBubble(
                    text: m['message'] ?? '',
                    own: m['user'] == true,
                    error: m['error'] == true,
                  ),
                  if (m['provider_status'] == 'unavailable' ||
                      m['provider_status'] == 'daily_limit')
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        'AI xizmatiga hozir ulanib bo‘lmadi.',
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  for (final card in rows(m['cards']))
                    CatalogueCard(
                      api: widget.api,
                      compact: true,
                      item: {
                        ...?catalogueItem(widget.api, card['id']),
                        ...card,
                        'from_amount': card['price'],
                      },
                      open: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              SanatoriumScreen(widget.api, card['id']),
                        ),
                      ),
                    ),
                ],
              ],
              if (busy) const Busy(),
            ],
          ),
        ),
        ConceptComposer(
          controller: input,
          hint: 'Qanday dam olishni xohlaysiz?',
          busy: busy || askingConsent,
          send: send,
        ),
      ],
    ),
  );
}

String eventTime(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return '';
  final now = DateTime.now();
  final time =
      '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  return date.year == now.year && date.month == now.month && date.day == now.day
      ? 'Bugun, $time'
      : '${dateOnly(date)} · $time';
}

class ChatBubble extends StatelessWidget {
  final String text;
  final bool own, error;
  final String? author, time;
  const ChatBubble({
    required this.text,
    this.own = false,
    this.error = false,
    this.author,
    this.time,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Align(
    alignment: own ? Alignment.centerRight : Alignment.centerLeft,
    child: FractionallySizedBox(
      widthFactor: .88,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: own ? masthead : context.colors.surface,
          border: Border.all(color: own ? masthead : context.colors.border),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(own ? 18 : 4),
            bottomRight: Radius.circular(own ? 4 : 18),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (author != null) ...[
              Text(
                author!,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: own ? const Color(0xffb5e4d5) : context.colors.muted,
                ),
              ),
              const SizedBox(height: 6),
            ],
            SelectableText(
              text,
              style: TextStyle(
                color: own
                    ? Colors.white
                    : error
                    ? Theme.of(context).colorScheme.error
                    : context.colors.ink,
                fontSize: 15,
                height: 1.5,
              ),
            ),
            if (time != null && time!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    time!,
                    style: TextStyle(
                      fontSize: 11,
                      color: own
                          ? const Color(0xffb5e4d5)
                          : context.colors.muted,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

class NotificationsScreen extends StatefulWidget {
  final Api api;
  const NotificationsScreen(this.api, {super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final read = <String>{}, pending = <String>{};
  String title(dynamic topic) =>
      {
        'booking.created': 'Bron yaratildi',
        'booking.confirmed': 'Bron tasdiqlandi',
        'booking.checked_in': 'Joylashish qayd etildi',
        'booking.checked_out': 'Yashash yakunlandi',
        'refund.succeeded': 'Qaytarish tasdiqlandi',
        'support.replied': 'Yordam xizmatidan javob',
      }[topic] ??
      'Platforma yangilanishi';
  Future<void> mark(Json item) async {
    final id = item['id'] as String;
    if (pending.contains(id) || read.contains(id) || item['readAt'] != null) {
      return;
    }
    setState(() => pending.add(id));
    try {
      await widget.api.send(
        '/notifications/$id/read',
        method: 'POST',
        body: {},
      );
      if (mounted) setState(() => read.add(id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => pending.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Bildirishnomalar',
    body: AsyncContent(
      load: () => widget.api.send('/notifications'),
      builder: (v) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (rows(v).isEmpty) const EmptyView('Yangi bildirishnomalar yo‘q.'),
          for (final n in rows(v))
            ConceptCard(
              onTap: pending.contains(n['id']) ? null : () => mark(n),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const IconTile('bell'),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title(n['payload']?['topic']),
                          style: conceptHeading(context, size: 17),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          eventTime(n['createdAt']),
                          style: TextStyle(
                            color: context.colors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (n['readAt'] == null && !read.contains(n['id']))
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: ConceptBadge(
                        pending.contains(n['id']) ? '…' : 'Yangi',
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}

class SupportScreen extends StatefulWidget {
  final Api api;
  const SupportScreen(this.api, {super.key});
  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  int revision = 0;
  Future<void> open([String? id]) async {
    var ticket = id;
    if (ticket == null) {
      final created = await Navigator.push<Json>(
        context,
        MaterialPageRoute(builder: (_) => NewSupportTicketScreen(widget.api)),
      );
      ticket = created?['id'];
    }
    if (ticket == null || !mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => SupportThread(widget.api, ticket!)),
    );
    if (mounted) setState(() => revision++);
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Yordam xizmati',
    bottom: ConceptScope(
      child: ConceptDock(label: 'Yangi murojaat', onPressed: () => open()),
    ),
    body: AsyncContent(
      key: ValueKey(revision),
      load: () => widget.api.send('/support/tickets'),
      builder: (v) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const ConceptInfo(
            icon: 'headphones',
            title: 'Sizga yordam beramiz',
            text: 'Savolingizni murojaat orqali yuboring.',
          ),
          const SizedBox(height: 12),
          Text('Murojaatlarim', style: conceptHeading(context, size: 24)),
          const SizedBox(height: 18),
          if (rows(v).isEmpty) const EmptyView('Hozircha murojaatlar yo‘q.'),
          for (final t in rows(v))
            ConceptCard(
              onTap: () => open(t['id']),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          t['title'],
                          style: conceptHeading(context, size: 19),
                        ),
                      ),
                      const SihhatIcon('chevron-right'),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Pill(t['status']),
                  const SizedBox(height: 10),
                  Text(
                    eventTime(t['createdAt']),
                    style: TextStyle(color: context.colors.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}

class NewSupportTicketScreen extends StatefulWidget {
  final Api api;
  final String? bookingId, reference;
  const NewSupportTicketScreen(
    this.api, {
    this.bookingId,
    this.reference,
    super.key,
  });
  @override
  State<NewSupportTicketScreen> createState() => _NewSupportTicketScreenState();
}

class _NewSupportTicketScreenState extends State<NewSupportTicketScreen> {
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
    if (text.text.trim().length < 3) {
      setState(() => error = 'Kamida 3 belgidan iborat xabar yozing.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final created = asJson(
        await widget.api.send(
          '/support/tickets',
          method: 'POST',
          body: {
            'title': widget.bookingId == null
                ? 'Ilovadan murojaat'
                : 'Bron ${widget.reference ?? ''}',
            'text': text.text.trim(),
            if (widget.bookingId != null) 'booking_id': widget.bookingId,
          },
        ),
      );
      if (mounted) {
        setState(() => busy = false);
        Navigator.pop(context, created);
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: ConceptPage(
      title: 'Yangi murojaat',
      bottom: ConceptScope(
        child: Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: ConceptDock(
            label: busy ? 'Yuborilmoqda…' : 'Murojaat yuborish',
            onPressed: busy ? null : send,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const ConceptInfo(
            icon: 'message-square',
            title: 'Sizga yordam beramiz',
            text: 'Savolingizni murojaat orqali yuboring.',
          ),
          const SizedBox(height: 18),
          TextField(
            controller: text,
            enabled: !busy,
            minLines: 8,
            maxLines: 12,
            maxLength: 1000,
            decoration: const InputDecoration(
              labelText: 'Xabaringiz',
              helperText: 'Savolingizni batafsil yozing.',
            ),
          ),
          const SizedBox(height: 22),
          const ConceptInfo(title: 'Javob shu suhbatda ko‘rinadi.'),
          if (error != null) ErrorView(error!),
        ],
      ),
    ),
  );
}

class SupportThread extends StatefulWidget {
  final Api api;
  final String id;
  const SupportThread(this.api, this.id, {super.key});
  @override
  State<SupportThread> createState() => _SupportThreadState();
}

class _SupportThreadState extends State<SupportThread>
    with WidgetsBindingObserver {
  Json? thread;
  Future<Json>? reading;
  Timer? timer;
  final revision = ValueNotifier(0);
  bool active = true, sending = false;
  final reply = TextEditingController();
  String? sendError;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (active) refreshThread().catchError((_) => <String, dynamic>{});
    });
  }

  Future<Json> refreshThread() => reading ??= (() async {
    final value = asJson(
      await widget.api.send('/support/tickets/${widget.id}'),
    );
    if (mounted) {
      thread = value;
      revision.value++;
    }
    return value;
  })().whenComplete(() => reading = null);
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    active = state == AppLifecycleState.resumed;
    if (active) refreshThread().catchError((_) => <String, dynamic>{});
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    revision.dispose();
    reply.dispose();
    super.dispose();
  }

  Future<void> sendReply() async {
    final text = reply.text.trim();
    if (sending || text.length < 3 || thread?['status'] == 'CLOSED') return;
    setState(() {
      sending = true;
      sendError = null;
    });
    try {
      await widget.api.send(
        '/support/tickets/${widget.id}/messages',
        method: 'POST',
        body: {'text': text},
      );
      if (mounted) reply.clear();
      await refreshThread();
    } catch (e) {
      if (mounted) setState(() => sendError = e.toString());
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Murojaat',
    body: CachedContent(
      cached: () async => thread,
      refresh: refreshThread,
      changes: revision,
      builder: (v) {
        final t = asJson(v);
        return Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  ConceptCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Pill(t['status']),
                        const SizedBox(height: 16),
                        Text(
                          t['title'],
                          style: conceptHeading(context, size: 24),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (final m in rows(t['messages']))
                    ChatBubble(
                      text: m['text'] ?? '',
                      own: m['userId'] == t['userId'],
                      author: m['userId'] == t['userId']
                          ? 'Siz'
                          : 'Yordam xizmati',
                      time: eventTime(m['createdAt']),
                    ),
                  if (sendError != null) ErrorView(sendError!),
                ],
              ),
            ),
            if (t['status'] != 'CLOSED')
              ConceptComposer(
                controller: reply,
                hint: 'Javob yozish',
                busy: sending,
                send: sendReply,
              )
            else
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Murojaat yopilgan. Yangi savol uchun yangi murojaat yuboring.',
                ),
              ),
          ],
        );
      },
    ),
  );
}

class ProfileScreen extends StatefulWidget {
  final Api api;
  final VoidCallback changed;
  const ProfileScreen(this.api, this.changed, {super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int epoch = 0;
  Future<void> edit(Json p) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          ConceptScope(child: _ProfileNameDialog(widget.api, p['name'] ?? '')),
    );
    if (saved == true && mounted) setState(() => epoch++);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.api.signedIn) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 20),
          const Center(child: IconTile('user-round', size: 80)),
          const SizedBox(height: 18),
          const EmptyView('Profilingizni ko‘rish uchun kiring.'),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () async {
              if (await ensureLogin(context, widget.api)) {
                widget.changed();
                if (mounted) setState(() => epoch++);
              }
            },
            child: const Text('Email orqali kirish'),
          ),
          const SizedBox(height: 24),
          const ConceptAppearanceSettings(),
        ],
      );
    }
    return CachedContent(
      key: ValueKey(epoch),
      cached: widget.api.cachedProfile,
      refresh: widget.api.refreshProfile,
      changes: widget.api.profileRevision,
      builder: (v) {
        final p = asJson(v);
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 24),
              child: Column(
                children: [
                  Container(
                    width: 92,
                    height: 92,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: context.colors.soft,
                      border: Border.all(
                        color: context.colors.surface,
                        width: 5,
                      ),
                    ),
                    child: SihhatIcon(
                      'user-round',
                      size: 44,
                      color: context.colors.primary,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    p['name'] ?? 'Mijoz',
                    textAlign: TextAlign.center,
                    style: conceptHeading(context, size: 25),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    p['phone'] ?? '',
                    style: TextStyle(color: context.colors.muted),
                  ),
                ],
              ),
            ),
            ConceptCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  ConceptMenuRow(
                    'user-round',
                    'Ism-familiyani o‘zgartirish',
                    onTap: () => edit(p),
                  ),
                  const Divider(height: 1, indent: 18, endIndent: 18),
                  ConceptMenuRow(
                    'phone',
                    'Telefonni o‘zgartirish',
                    onTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PhoneChangeScreen(widget.api),
                        ),
                      );
                      if (mounted) setState(() => epoch++);
                    },
                  ),
                  const Divider(height: 1, indent: 18, endIndent: 18),
                  ConceptMenuRow(
                    'bell',
                    'Bildirishnomalar',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => NotificationsScreen(widget.api),
                      ),
                    ),
                  ),
                  const Divider(height: 1, indent: 18, endIndent: 18),
                  ConceptMenuRow(
                    'headphones',
                    'Yordam xizmati',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SupportScreen(widget.api),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const ConceptAppearanceSettings(),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () async {
                await widget.api.logout();
                widget.changed();
                if (mounted) setState(() => epoch++);
              },
              icon: const SihhatIcon('log-out'),
              label: const Text('Hisobdan chiqish'),
            ),
          ],
        );
      },
    );
  }
}

class _ProfileNameDialog extends StatefulWidget {
  final Api api;
  final String initialName;
  const _ProfileNameDialog(this.api, this.initialName);
  @override
  State<_ProfileNameDialog> createState() => _ProfileNameDialogState();
}

class _ProfileNameDialogState extends State<_ProfileNameDialog> {
  late final name = TextEditingController(text: widget.initialName);
  bool busy = false;
  String? error;
  @override
  void dispose() {
    name.dispose();
    super.dispose();
  }

  Future<void> save() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.api.send(
        '/auth/profile',
        method: 'PATCH',
        body: {'name': name.text.trim()},
      );
      if (mounted) {
        setState(() => busy = false);
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Profilni tahrirlash',
                  style: conceptHeading(context, size: 24),
                ),
              ),
              IconButton(
                tooltip: 'Yopish',
                onPressed: busy ? null : () => Navigator.pop(context),
                icon: const SihhatIcon('x'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: name,
            enabled: !busy,
            textCapitalization: TextCapitalization.words,
            autofillHints: const [AutofillHints.name],
            decoration: const InputDecoration(
              labelText: 'Ism-familiya',
              helperText: 'Bron uchun ismingizni aniq kiriting.',
            ),
          ),
          if (error != null) ErrorView(error!),
          const SizedBox(height: 28),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: busy ? null : () => Navigator.pop(context),
                  child: const Text('Yopish'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: busy ? null : save,
                  child: Text(busy ? 'Saqlanmoqda…' : 'Saqlash'),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class PhoneChangeScreen extends StatefulWidget {
  final Api api;
  const PhoneChangeScreen(this.api, {super.key});
  @override
  State<PhoneChangeScreen> createState() => _PhoneChangeScreenState();
}

class _PhoneChangeScreenState extends State<PhoneChangeScreen> {
  final phone = TextEditingController(text: '+998'),
      old = TextEditingController(),
      next = TextEditingController();
  Json? challenge;
  String? error;
  bool busy = false;
  @override
  void dispose() {
    phone.dispose();
    old.dispose();
    next.dispose();
    super.dispose();
  }

  Future<void> action() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (challenge == null) {
        final r = asJson(
          await widget.api.send(
            '/auth/customer/phone-change/request',
            method: 'POST',
            body: {'new_phone': phone.text.trim()},
          ),
        );
        if (mounted) setState(() => challenge = r);
      } else {
        await widget.api.send(
          '/auth/customer/phone-change/confirm',
          method: 'POST',
          body: {
            'old_challenge_id': challenge!['old_challenge_id'],
            'new_challenge_id': challenge!['new_challenge_id'],
            'old_code': old.text,
            'new_code': next.text,
          },
        );
        final profile = await widget.api.cachedProfile();
        if (profile != null) {
          await widget.api.saveProfile({
            ...profile,
            'phone': phone.text.trim(),
          });
        }
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Telefonni o‘zgartirish',
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Center(child: IconTile('phone', size: 72)),
        const SizedBox(height: 24),
        const ConceptInfo(
          icon: 'shield-check',
          title: 'Ikkala raqamni tasdiqlang',
          text: 'Eski va yangi raqamga yuborilgan kodlarni kiriting.',
        ),
        const SizedBox(height: 12),
        TextField(
          controller: phone,
          enabled: challenge == null && !busy,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumber],
          decoration: const InputDecoration(labelText: 'Yangi telefon'),
        ),
        if (challenge != null) ...[
          const SizedBox(height: 24),
          OtpField(controller: old, label: 'Eski telefon kodi', enabled: !busy),
          const SizedBox(height: 24),
          OtpField(
            controller: next,
            label: 'Yangi telefon kodi',
            enabled: !busy,
          ),
        ],
        if (error != null) ErrorView(error!),
        const SizedBox(height: 28),
        FilledButton(
          onPressed: busy ? null : action,
          child: Text(
            busy
                ? 'Tekshirilmoqda…'
                : challenge == null
                ? 'Ikkala raqamga kod yuborish'
                : 'Telefonni tasdiqlash',
          ),
        ),
      ],
    ),
  );
}

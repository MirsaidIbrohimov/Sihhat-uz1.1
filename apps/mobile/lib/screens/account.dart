import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../appearance.dart';
import '../concept_ui.dart';
import '../motion.dart';
import '../neon.dart';
import '../catalog_card.dart';
import 'catalog.dart';
import 'login.dart';
import 'support_telegram.dart';

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
    final agreed = await showGlassDialog<bool>(
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
                Reveal(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: 'Sihhat.uz\n',
                          style: TextStyle(
                            fontSize: 13,
                            color: context.colors.muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const TextSpan(text: 'AI yordamchi'),
                      ],
                    ),
                    style: conceptHeading(context, size: 24),
                  ),
                ),
                const SizedBox(height: 22),
                const Center(child: AiAvatar()),
                const SizedBox(height: 24),
                Reveal(
                  index: 1,
                  child: Text(
                    'Sizga mos dam olishni topamiz',
                    textAlign: TextAlign.center,
                    style: conceptHeading(context, size: 26),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Hudud, sana va byudjetingizni yozing.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: context.colors.muted, fontSize: 16),
                ),
                const SizedBox(height: 20),
                const Reveal(
                  index: 2,
                  child: ConceptInfo(
                    icon: 'shield-check',
                    title: 'Tibbiy moslikni sanatoriya mutaxassisi bilan aniqlang.',
                  ),
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
                      Pressable(
                        child: ActionChip(
                          avatar: SihhatIcon(
                            'sparkles',
                            size: 15,
                            color: context.colors.primary,
                          ),
                          label: Text(suggestion),
                          onPressed: busy || askingConsent
                              ? null
                              : () {
                                  input.text = suggestion;
                                  send();
                                },
                        ),
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
                    key: ObjectKey(m),
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
              if (busy)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Semantics(
                    label: 'AI javob yozmoqda',
                    liveRegion: true,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        color: context.colors.surface.withValues(alpha: .85),
                        border: Border.all(color: neon.withValues(alpha: .25)),
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(18),
                          topRight: Radius.circular(18),
                          bottomRight: Radius.circular(18),
                          bottomLeft: Radius.circular(4),
                        ),
                      ),
                      child: const TypingDots(),
                    ),
                  ),
                ),
            ],
          ),
        ),
        ConceptComposer(
          controller: input,
          hint: 'Savol yozing…',
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
  final String? author, time, imageUrl;
  final bool isEdited;
  const ChatBubble({
    required this.text,
    this.own = false,
    this.error = false,
    this.author,
    this.time,
    this.imageUrl,
    this.isEdited = false,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Reveal(
    offset: Offset(own ? .15 : -.15, .05),
    child: Align(
      alignment: own ? Alignment.centerRight : Alignment.centerLeft,
      child: FractionallySizedBox(
        widthFactor: .88,
        child: Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: own ? null : context.colors.surface.withValues(alpha: .85),
            gradient: own
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xff5ff0cf), neon],
                  )
                : null,
            boxShadow: [
              if (own)
                BoxShadow(color: neon.withValues(alpha: .3), blurRadius: 16),
            ],
            border: Border.all(color: own ? neon : neon.withValues(alpha: .25)),
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
                    color: own ? abyss : context.colors.primary,
                  ),
                ),
                const SizedBox(height: 6),
              ],
              if (imageUrl != null && imageUrl!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: imageUrl!.startsWith('data:')
                      ? Image.memory(
                          base64Decode(imageUrl!.split(',').last),
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const SizedBox.shrink(),
                        )
                      : Image.network(
                          imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const SizedBox.shrink(),
                        ),
                ),
                if (text.isNotEmpty && text != '📷 Rasm')
                  const SizedBox(height: 8),
              ],
              SelectableText(
                text,
                style: TextStyle(
                  color: own
                      ? abyss
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
                      isEdited ? '$time · tahrirlangan' : time!,
                      style: TextStyle(
                        fontSize: 11,
                        color: own
                            ? abyss.withValues(alpha: .7)
                            : context.colors.muted,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// Floating, glowing assistant avatar for the AI screen.
class AiAvatar extends StatelessWidget {
  final double size;
  const AiAvatar({this.size = 140, super.key});
  @override
  Widget build(BuildContext context) => FloatY(child: RobotFace(size: size));
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
        'payment.succeeded': 'Bron to‘lovi tasdiqlandi',
        'booking.confirmed': 'Bron tasdiqlandi',
        'booking.checked_in': 'Joylashish qayd etildi',
        'booking.checked_out': 'Yashash yakunlandi',
        'refund.succeeded': 'Qaytarish tasdiqlandi',
        'support.replied': 'Yordam xizmatidan javob',
        'ad.requested': 'Yangi reklama arizasi',
        'ad.moderated': 'Reklama moderatsiyasi',
      }[topic] ??
      'Platforma yangilanishi';
  int refreshKey = 0;
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

  Future<void> markAll() async {
    try {
      await widget.api.send(
        '/notifications/read-all',
        method: 'POST',
        body: {},
      );
      if (mounted) {
        setState(() => refreshKey++);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Barcha bildirishnomalar o‘qildi')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Bildirishnomalar',
    subtitle: 'Barcha bildirishnomalar',
    actions: [
      TextButton.icon(
        onPressed: markAll,
        icon: const SihhatIcon('check-check'),
        label: const Text('Barchasi'),
      ),
    ],
    body: AsyncContent(
      key: ValueKey(refreshKey),
      load: () => widget.api.send('/notifications'),
      builder: (v) => Stack(
        children: [
          if (rows(v).isEmpty) const Positioned.fill(child: NeonWaves()),
          ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (rows(v).isEmpty) ...[
                const SizedBox(height: 70),
                const Center(child: FloatY(child: NeonBell())),
                const SizedBox(height: 28),
                Reveal(
                  child: Text(
                    'Sizda yangi bildirishnoma yo‘q',
                    textAlign: TextAlign.center,
                    style: conceptHeading(context, size: 18),
                  ),
                ),
                const SizedBox(height: 22),
                Reveal(
                  index: 1,
                  child: Center(
                    child: Pressable(
                      child: OutlinedButton(
                        onPressed: () => Navigator.maybePop(context),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(200, 52),
                          shape: const StadiumBorder(),
                          backgroundColor: context.colors.surface,
                          side: BorderSide(color: neon.withValues(alpha: .45)),
                          elevation: 8,
                          shadowColor: neon.withValues(alpha: .4),
                        ),
                        child: const Text('Orqaga qaytish'),
                      ),
                    ),
                  ),
                ),
              ],
              for (final (i, n) in rows(v).indexed)
                Reveal(
                  index: i,
                  child: ConceptCard(
                    onTap: pending.contains(n['id']) ? null : () => mark(n),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const IconTile('bell', glow: true),
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
                ),
            ],
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
  String activeFolder = 'open';
  final searchController = TextEditingController();

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

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

  String _previewFor(Json t) {
    final last = t['lastMessage'];
    if (last is Map) {
      final txt = last['text']?.toString().trim() ?? '';
      if (txt.isNotEmpty) return txt;
      if ((last['imageUrl']?.toString() ?? '').isNotEmpty) return '📷 Rasm';
    }
    final msgs = t['messages'];
    if (msgs is List && msgs.isNotEmpty && msgs.last is Map) {
      final txt = (msgs.last as Map)['text']?.toString().trim() ?? '';
      if (txt.isNotEmpty) return txt;
    }
    return isSupportTicketClosed(t['status'])
        ? 'Murojaat yopilgan'
        : 'Suhbatni davom ettiring';
  }

  String _timeFor(Json t) {
    final last = t['lastMessage'];
    final raw = last is Map
        ? (last['createdAt'] ?? t['createdAt'])
        : t['createdAt'];
    return supportShortTime(raw);
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Yordam va xabarlar',
    subtitle: 'Telegram uslubidagi tezkor suhbatlar',
    actions: [
      IconButton(
        tooltip: 'Yangi murojaat',
        onPressed: () => open(),
        icon: Icon(Icons.edit_note_rounded, color: context.colors.primary),
      ),
    ],
    bottom: ConceptScope(
      child: ConceptDock(label: 'Yangi murojaat', onPressed: () => open()),
    ),
    body: AsyncContent(
      key: ValueKey(revision),
      load: () => widget.api.send('/support/tickets'),
      builder: (v) {
        final all = rows(v);
        final openTickets = all
            .where((t) => !isSupportTicketClosed(t['status']))
            .toList();
        final closedTickets = all
            .where((t) => isSupportTicketClosed(t['status']))
            .toList();
        final query = searchController.text.trim().toLowerCase();
        final baseList = activeFolder == 'closed' ? closedTickets : openTickets;
        final visible = query.isEmpty
            ? baseList
            : baseList.where((t) {
                final title = (t['title']?.toString() ?? '').toLowerCase();
                final preview = _previewFor(t).toLowerCase();
                return title.contains(query) || preview.contains(query);
              }).toList();

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
          children: [
            TextField(
              controller: searchController,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Suhbat yoki mavzu qidirish…',
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: context.colors.muted,
                  size: 20,
                ),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: () {
                          searchController.clear();
                          setState(() {});
                        },
                      ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: context.colors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: context.colors.border),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TgFolderTabs(
              activeFolder: activeFolder,
              openCount: openTickets.length,
              closedCount: closedTickets.length,
              onSelect: (f) => setState(() => activeFolder = f),
            ),
            const SizedBox(height: 14),
            if (visible.isEmpty)
              EmptyView(
                query.isNotEmpty
                    ? 'Qidiruv bo‘yicha suhbat topilmadi.'
                    : activeFolder == 'open'
                    ? (all.isEmpty
                          ? 'Hozircha murojaatlar yo‘q.'
                          : 'Ochiq murojaatlar yo‘q.')
                    : 'Yopilgan murojaatlar arxivi bo‘sh.',
                icon: 'message-circle',
              ),
            for (final (i, t) in visible.indexed) ...[
              Reveal(
                index: i,
                child: TgChatListTile(
                  title: t['title']?.toString() ?? 'Murojaat',
                  preview: _previewFor(t),
                  status: t['status']?.toString() ?? 'OPEN',
                  timeLabel: _timeFor(t),
                  onTap: () => open(t['id']?.toString()),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        );
      },
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
  final composerFocus = FocusNode();
  final scroll = ScrollController();
  int shown = 0;
  String? sendError;
  String? attachedImage;
  String? editingMessageId;
  String? editingOriginalText;
  final deletingIds = <String>{};
  static const _imageChannel = MethodChannel('uz.sihhat/image_picker');

  Future<void> _pickNativeOrUrlImage({bool urlOnly = false}) async {
    if (!urlOnly) {
      try {
        final result = await _imageChannel.invokeMethod<String>('pickImage');
        if (result != null && result.isNotEmpty && mounted) {
          setState(() => attachedImage = result);
          return;
        }
      } catch (_) {
        // Fallback to URL dialog when native picker channel is unavailable.
      }
    }
    if (!mounted) return;
    final controller = TextEditingController();
    final url = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rasm havolasini kiriting'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'https://...'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Bekor qilish'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Biriktirish'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (url != null && url.isNotEmpty && mounted) {
      setState(() => attachedImage = url);
    }
  }

  Future<void> pickImage() async {
    if (!mounted || editingMessageId != null) return;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: dark ? const Color(0xff092722) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: context.colors.muted.withValues(alpha: .35),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 8),
            ListTile(
              leading: Icon(
                Icons.photo_library_outlined,
                color: context.colors.primary,
              ),
              title: const Text('Galereyadan rasm tanlash'),
              subtitle: const Text('Qurilmadagi rasmni chatga yuborish'),
              onTap: () => Navigator.pop(ctx, 'gallery'),
            ),
            ListTile(
              leading: Icon(Icons.link_rounded, color: context.colors.primary),
              title: const Text('Rasm havolasi (URL)'),
              subtitle: const Text('Internetdagi rasm manzilini biriktirish'),
              onTap: () => Navigator.pop(ctx, 'url'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (choice == null || !mounted) return;
    await _pickNativeOrUrlImage(urlOnly: choice == 'url');
  }

  /// Keeps the newest message in view when replies arrive.
  void followNewMessages(int count) {
    if (count <= shown) return;
    final first = shown == 0;
    shown = count;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!scroll.hasClients) return;
      final end = scroll.position.maxScrollExtent;
      if (first || reducedMotion(context)) {
        scroll.jumpTo(end);
      } else {
        scroll.animateTo(
          end,
          duration: const Duration(milliseconds: 380),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

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
    composerFocus.dispose();
    scroll.dispose();
    super.dispose();
  }

  void startEditing(Json message) {
    final msgId = message['id']?.toString();
    if (msgId == null || msgId.isEmpty) return;
    final original = message['text']?.toString() ?? '';
    setState(() {
      editingMessageId = msgId;
      editingOriginalText = original;
      attachedImage = null;
      sendError = null;
      reply.text = original;
      reply.selection = TextSelection.collapsed(offset: original.length);
    });
    composerFocus.requestFocus();
  }

  void cancelEditing() {
    setState(() {
      editingMessageId = null;
      editingOriginalText = null;
      sendError = null;
      reply.clear();
    });
  }

  Future<void> confirmDeleteMessage(Json message) async {
    final msgId = message['id']?.toString();
    if (msgId == null || msgId.isEmpty || deletingIds.contains(msgId)) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xabarni o‘chirish'),
        content: const Text('Ushbu xabar sizning chatingizdan o‘chiriladi.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Bekor qilish'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(
              foregroundColor: TgThemeColors.of(ctx).danger,
            ),
            child: const Text('O‘chirish'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() {
      deletingIds.add(msgId);
      sendError = null;
    });
    try {
      await widget.api.send(
        '/support/tickets/${widget.id}/messages/$msgId',
        method: 'DELETE',
      );
      if (!mounted) return;
      if (editingMessageId == msgId) {
        editingMessageId = null;
        editingOriginalText = null;
        reply.clear();
      }
      // Optimistically remove for crisp Telegram responsiveness, then sync.
      final current = thread;
      if (current != null && current['messages'] is List) {
        final next = (current['messages'] as List)
            .where((item) => item is Map && item['id']?.toString() != msgId)
            .toList();
        thread = {...current, 'messages': next};
        shown = next.length;
        revision.value++;
      }
      await refreshThread();
    } catch (e) {
      if (mounted) setState(() => sendError = e.toString());
    } finally {
      if (mounted) setState(() => deletingIds.remove(msgId));
    }
  }

  Future<void> openMessageMenu(Json message, bool own, bool closed) async {
    if (!mounted) return;
    final msgId = message['id']?.toString();
    final canModify = own && !closed && msgId != null && msgId.isNotEmpty;
    final rawText = message['text']?.toString() ?? '';
    final tg = TgThemeColors.of(context);
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: tg.panelBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: context.colors.muted.withValues(alpha: .35),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          own ? 'Sizning xabaringiz' : 'Yordam xizmati',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: context.colors.primary,
                          ),
                        ),
                        if (rawText.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            rawText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              color: context.colors.muted,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            if (canModify) ...[
              ListTile(
                leading: Icon(
                  Icons.edit_rounded,
                  color: context.colors.primary,
                ),
                title: const Text('Tahrirlash'),
                onTap: () {
                  Navigator.pop(ctx);
                  startEditing(message);
                },
              ),
              ListTile(
                leading: Icon(Icons.delete_outline_rounded, color: tg.danger),
                title: Text('O‘chirish', style: TextStyle(color: tg.danger)),
                onTap: () {
                  Navigator.pop(ctx);
                  confirmDeleteMessage(message);
                },
              ),
            ],
            if (rawText.isNotEmpty)
              ListTile(
                leading: Icon(Icons.copy_rounded, color: context.colors.ink),
                title: const Text('Nusxa olish'),
                onTap: () async {
                  Navigator.pop(ctx);
                  await Clipboard.setData(ClipboardData(text: rawText));
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Xabar nusxalandi'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void openImagePreview(String imageUrl) {
    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog.fullscreen(
        backgroundColor: Colors.black.withValues(alpha: .94),
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                child: imageUrl.startsWith('data:')
                    ? Image.memory(
                        base64Decode(imageUrl.split(',').last),
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => const Icon(
                          Icons.broken_image_outlined,
                          color: Colors.white54,
                          size: 48,
                        ),
                      )
                    : Image.network(
                        imageUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => const Icon(
                          Icons.broken_image_outlined,
                          color: Colors.white54,
                          size: 48,
                        ),
                      ),
              ),
            ),
            Positioned(
              top: 16,
              right: 16,
              child: IconButton.filled(
                onPressed: () => Navigator.pop(ctx),
                icon: const Icon(Icons.close_rounded, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> sendReply() async {
    final text = reply.text.trim();
    if (sending || isSupportTicketClosed(thread?['status'])) return;

    if (editingMessageId != null) {
      if (text.isEmpty) {
        setState(() => sendError = 'Xabar matni bo‘sh bo‘lmasin');
        return;
      }
      setState(() {
        sending = true;
        sendError = null;
      });
      try {
        await widget.api.send(
          '/support/tickets/${widget.id}/messages/$editingMessageId',
          method: 'PATCH',
          body: {'text': text},
        );
        if (mounted) {
          reply.clear();
          setState(() {
            editingMessageId = null;
            editingOriginalText = null;
          });
        }
        await refreshThread();
      } catch (e) {
        if (mounted) setState(() => sendError = e.toString());
      } finally {
        if (mounted) setState(() => sending = false);
      }
      return;
    }

    if (text.isEmpty && attachedImage == null) return;
    setState(() {
      sending = true;
      sendError = null;
    });
    try {
      await widget.api.send(
        '/support/tickets/${widget.id}/messages',
        method: 'POST',
        body: {
          'text': text.isNotEmpty ? text : '📷 Rasm',
          if (attachedImage != null) 'imageUrl': attachedImage,
        },
      );
      if (mounted) {
        reply.clear();
        setState(() => attachedImage = null);
      }
      await refreshThread();
    } catch (e) {
      if (mounted) setState(() => sendError = e.toString());
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Yordam xizmati (Chat)',
    subtitle: 'Telegram uslubidagi suhbat',
    body: CachedContent(
      cached: () async => thread,
      refresh: refreshThread,
      changes: revision,
      builder: (v) {
        final t = asJson(v);
        final messages = rows(t['messages']);
        final closed = isSupportTicketClosed(t['status']);
        final title = t['title']?.toString() ?? 'Murojaat';
        final c = context.colors;
        final dark = Theme.of(context).brightness == Brightness.dark;
        followNewMessages(messages.length);

        final pillBorder = OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: BorderSide(
            color: dark ? neon.withValues(alpha: .3) : c.border,
          ),
        );

        String? prevDayKey;
        return Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
              decoration: BoxDecoration(
                color: c.surface.withValues(alpha: .92),
                border: Border(bottom: BorderSide(color: c.border)),
              ),
              child: Row(
                children: [
                  TgAvatar(label: title, size: 42, closed: closed),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: conceptHeading(context, size: 15),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          closed
                              ? 'Murojaat yopilgan (Arxiv)'
                              : 'Resepshn · Onlayn',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: closed ? c.muted : c.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: closed ? c.muted.withValues(alpha: .14) : c.soft,
                    ),
                    child: Text(
                      supportStatusLabel(t['status']),
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: closed ? c.muted : c.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: TgWallpaperBackground(
                child: ListView(
                  controller: scroll,
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                  children: [
                    if (messages.isEmpty)
                      Center(
                        child: Container(
                          margin: const EdgeInsets.only(top: 24),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: TgThemeColors.of(context).datePillBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            'Suhbatni boshlash uchun xabar yozing',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: TgThemeColors.of(context).datePillText,
                            ),
                          ),
                        ),
                      ),
                    for (final m in messages) ...[
                      Builder(
                        builder: (_) {
                          final dayKey = supportDayKey(m['createdAt']);
                          final dayChanged =
                              dayKey.isNotEmpty && dayKey != prevDayKey;
                          if (dayKey.isNotEmpty) prevDayKey = dayKey;
                          final own = m['isMe'] is bool
                              ? m['isMe'] as bool
                              : m['userId'] == t['userId'];
                          final msgId = m['id']?.toString();
                          final canModify =
                              own &&
                              !closed &&
                              msgId != null &&
                              msgId.isNotEmpty;
                          final imageUrl = m['imageUrl'] as String?;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (dayChanged)
                                TgDateSeparator(
                                  supportDayLabel(m['createdAt']),
                                ),
                              TgMessageBubble(
                                text: m['text']?.toString() ?? '',
                                imageUrl: imageUrl,
                                author: own ? null : 'Yordam xizmati',
                                time: supportClockTime(m['createdAt']),
                                own: own,
                                isEdited: m['isEdited'] == true,
                                canModify: canModify,
                                isDeleting:
                                    msgId != null &&
                                    deletingIds.contains(msgId),
                                onOpenMenu: () =>
                                    openMessageMenu(m, own, closed),
                                onPreviewImage:
                                    imageUrl != null && imageUrl.isNotEmpty
                                    ? () => openImagePreview(imageUrl)
                                    : null,
                              ),
                            ],
                          );
                        },
                      ),
                    ],
                    if (sendError != null) ErrorView(sendError!),
                  ],
                ),
              ),
            ),
            if (!closed) ...[
              if (editingMessageId != null)
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
                  decoration: BoxDecoration(
                    color: c.surface,
                    border: Border(top: BorderSide(color: c.border)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 3,
                        height: 34,
                        decoration: BoxDecoration(
                          color: c.primary,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Icon(Icons.edit_rounded, size: 18, color: c.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Xabarni tahrirlash',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: c.primary,
                              ),
                            ),
                            Text(
                              editingOriginalText ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: c.muted),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'Tahrirlashni bekor qilish',
                        onPressed: sending ? null : cancelEditing,
                        icon: const Icon(Icons.close_rounded, size: 20),
                      ),
                    ],
                  ),
                ),
              if (attachedImage != null && editingMessageId == null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: c.surface.withValues(alpha: .9),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: neon.withValues(alpha: .3)),
                    ),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 44,
                            height: 44,
                            child: attachedImage!.startsWith('data:')
                                ? Image.memory(
                                    base64Decode(
                                      attachedImage!.split(',').last,
                                    ),
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) =>
                                        const Icon(Icons.broken_image),
                                  )
                                : Image.network(
                                    attachedImage!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) =>
                                        const Icon(Icons.broken_image),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Rasm biriktirildi',
                            style: TextStyle(
                              color: c.ink,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 20),
                          color: Colors.redAccent,
                          onPressed: () => setState(() => attachedImage = null),
                        ),
                      ],
                    ),
                  ),
                ),
              SafeArea(
                top: false,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                  decoration: BoxDecoration(
                    color: c.surface.withValues(alpha: .95),
                    border: Border(top: BorderSide(color: c.border)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (editingMessageId == null) ...[
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: attachedImage != null
                                ? c.primary.withValues(alpha: .18)
                                : c.soft.withValues(alpha: dark ? .35 : .8),
                            border: Border.all(
                              color: attachedImage != null
                                  ? c.primary
                                  : c.border,
                            ),
                          ),
                          child: IconButton(
                            tooltip: 'Biriktirish (+)',
                            onPressed: sending ? null : pickImage,
                            icon: Icon(
                              Icons.add_rounded,
                              color: attachedImage != null ? c.primary : c.ink,
                              size: 24,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Expanded(
                        child: TextField(
                          controller: reply,
                          focusNode: composerFocus,
                          enabled: !sending,
                          minLines: 1,
                          maxLines: 4,
                          maxLength: 5000,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => sendReply(),
                          decoration: InputDecoration(
                            hintText: editingMessageId != null
                                ? 'Tahrirlangan xabarni kiriting…'
                                : attachedImage != null
                                ? 'Izoh yozing (ixtiyoriy)…'
                                : 'Xabar yozing…',
                            counterText: '',
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 18,
                              vertical: 13,
                            ),
                            border: pillBorder,
                            enabledBorder: pillBorder,
                            disabledBorder: pillBorder,
                            focusedBorder: pillBorder.copyWith(
                              borderSide: BorderSide(
                                color: c.primary,
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 48,
                        height: 48,
                        child: IconButton.filled(
                          tooltip: 'Yuborish',
                          onPressed: sending ? null : sendReply,
                          icon: sending
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : editingMessageId != null
                              ? const Icon(Icons.check_rounded)
                              : const SihhatIcon('send'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else
              const SafeArea(
                top: false,
                child: Padding(
                  padding: EdgeInsets.fromLTRB(16, 6, 16, 12),
                  child: ConceptInfo(
                    icon: 'check-check',
                    title: 'Murojaat yopilgan',
                    text: 'Yangi savol uchun yangi murojaat yuboring.',
                  ),
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
          const EmptyView(
            'Profilingizni ko‘rish uchun kiring.',
            icon: 'user-round',
          ),
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
                  const PulseGlow(
                    child: CircleAvatar(
                      radius: 52,
                      backgroundColor: neon,
                      child: Icon(Icons.person_rounded, size: 62, color: abyss),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Reveal(
                    child: Text(
                      (p['name'] ?? 'Mijoz').toString(),
                      textAlign: TextAlign.center,
                      style: conceptHeading(context, size: 25),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Builder(
                    builder: (_) {
                      final email =
                          p['email'] ??
                          (p['login']?.toString().contains('@') == true
                              ? p['login']
                              : '');
                      final phone = p['phone'] ?? '';
                      final list = [
                        if (email != null && email.toString().isNotEmpty)
                          email.toString(),
                        if (phone != null && phone.toString().isNotEmpty)
                          phone.toString(),
                      ];
                      return Text(
                        list.isNotEmpty
                            ? list.join(' · ')
                            : 'Email orqali tasdiqlangan',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 13,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            Reveal(
              index: 1,
              child: ConceptCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    ConceptMenuRow(
                      'user-round',
                      'Ism-familiyani o‘zgartirish',
                      glyph: Icons.person_rounded,
                      onTap: () => edit(p),
                    ),
                    const Divider(height: 1, indent: 18, endIndent: 18),
                    ConceptMenuRow(
                      'phone',
                      'Telefonni o‘zgartirish',
                      glyph: Icons.phone_in_talk_rounded,
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
                      glyph: Icons.notifications_rounded,
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
                      glyph: Icons.support_agent_rounded,
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
            ),
            const Reveal(index: 2, child: ConceptAppearanceSettings()),
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
                  'Ism-familiyani o‘zgartirish',
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

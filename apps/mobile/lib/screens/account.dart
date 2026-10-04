import 'package:flutter/material.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../appearance.dart';
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
  final messages = <Json>[];
  bool busy = false, share = false;
  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  Future<void> send() async {
    final text = input.text.trim();
    if (text.isEmpty || busy) return;
    setState(() {
      messages.add({'user': true, 'message': text});
      busy = true;
      input.clear();
    });
    try {
      final r = asJson(
        await widget.api.send(
          '/ai/messages',
          method: 'POST',
          body: {'message': text, 'share_with_provider': share},
        ),
      );
      if (!mounted) return;
      setState(() => messages.add(r));
    } catch (e) {
      if (mounted) {
        setState(() => messages.add({'message': e.toString(), 'error': true}));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Expanded(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Card(
              color: context.colors.soft,
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Text(
                  'Sizga mos sanatoriya topishga yordam beraman. Tavsiyalar tasdiqlangan katalogdan olinadi. Tibbiy moslikni sanatoriya mutaxassisi bilan aniqlang.',
                  style: TextStyle(height: 1.8),
                ),
              ),
            ),
            ...messages.map(
              (m) => Align(
                alignment: m['user'] == true
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(top: 14),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: m['user'] == true
                        ? context.colors.primary
                        : context.colors.surface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        m['message'] ?? '',
                        style: TextStyle(
                          color: m['user'] == true
                              ? Theme.of(context).colorScheme.onPrimary
                              : context.colors.ink,
                          height: 1.7,
                        ),
                      ),
                      if (m['provider_status'] == 'connected')
                        Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            'Gemini · tasdiqlangan katalog va qo‘llanma',
                            style: TextStyle(
                              fontSize: 10,
                              color: context.colors.primary,
                            ),
                          ),
                        ),
                      if (m['provider_status'] == 'unavailable' ||
                          m['provider_status'] == 'daily_limit')
                        Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            'AI vaqtincha javob bermadi. Katalog va qo‘llanma asosida javob berildi.',
                            style: TextStyle(
                              fontSize: 10,
                              color: context.colors.muted,
                            ),
                          ),
                        ),
                      ...rows(m['cards']).map(
                        (card) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(card['name']),
                          subtitle: Text(
                            '${card['region']} · ${card['price'] == null ? card['price_status'] : money(card['price'])}',
                          ),
                          trailing: Icon(
                            Icons.arrow_forward,
                            color: context.colors.primary,
                          ),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  SanatoriumScreen(widget.api, card['id']),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (busy) const Busy(),
          ],
        ),
      ),
      CheckboxListTile(
        dense: true,
        value: share,
        onChanged: (v) => setState(() => share = v ?? false),
        title: const Text(
          'Savolimni Gemini xizmatiga yuborishga roziman',
          style: TextStyle(fontSize: 11),
        ),
      ),
      SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: input,
                  maxLength: 1000,
                  decoration: const InputDecoration(
                    hintText: 'Qanday dam olishni xohlaysiz?',
                    counterText: '',
                  ),
                  onSubmitted: (_) => send(),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filled(
                onPressed: busy ? null : send,
                icon: const Icon(Icons.send_outlined),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

class NotificationsScreen extends StatelessWidget {
  final Api api;
  const NotificationsScreen(this.api, {super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Bildirishnomalar')),
    body: AsyncContent(
      load: () => api.send('/notifications'),
      builder: (v) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (rows(v).isEmpty) const EmptyView('Yangi bildirishnomalar yo‘q.'),
          ...rows(v).map(
            (r) => Card(
              child: ListTile(
                leading: Icon(
                  r['readAt'] == null
                      ? Icons.notifications_active_outlined
                      : Icons.notifications_none,
                  color: context.colors.primary,
                ),
                title: Text(_title(r['payload']?['topic'])),
                subtitle: Text(r['readAt'] == null ? 'Yangi' : 'O‘qilgan'),
                onTap: () async {
                  try {
                    await api.send(
                      '/notifications/${r['id']}/read',
                      method: 'POST',
                      body: {},
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('O‘qilgan deb belgilandi'),
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context)
                          .showSnackBar(SnackBar(content: Text(e.toString())));
                    }
                  }
                },
              ),
            ),
          ),
        ],
      ),
    ),
  );
  String _title(dynamic topic) =>
      {
        'booking.created': 'Bron yaratildi',
        'booking.checked_in': 'Joylashish qayd etildi',
        'booking.checked_out': 'Yashash yakunlandi',
        'refund.succeeded': 'Qaytarish tasdiqlandi',
        'support.replied': 'Yordam xizmatidan javob',
      }[topic] ??
      'Platforma yangilanishi';
}

class SupportScreen extends StatelessWidget {
  final Api api;
  const SupportScreen(this.api, {super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Yordam xizmati')),
    body: AsyncContent(
      load: () => api.send('/support/tickets'),
      builder: (v) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (rows(v).isEmpty) const EmptyView('Hozircha murojaatlar yo‘q.'),
          ...rows(v).map(
            (t) => Card(
              child: ListTile(
                title: Text(t['title']),
                subtitle: Pill(t['status']),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SupportThread(api, t['id']),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: () => messageDialog(context, 'Yangi murojaat', (text) async {
        final r = asJson(
          await api.send(
            '/support/tickets',
            method: 'POST',
            body: {'title': 'Ilovadan murojaat', 'text': text},
          ),
        );
        if (context.mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => SupportThread(api, r['id'])),
          );
        }
      }),
      icon: const Icon(Icons.add),
      label: const Text('Murojaat'),
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

class _SupportThreadState extends State<SupportThread> {
  int epoch = 0;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Murojaat')),
    body: AsyncContent(
      key: ValueKey(epoch),
      load: () => widget.api.send('/support/tickets/${widget.id}'),
      builder: (v) {
        final t = asJson(v);
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              t['title'],
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Pill(t['status']),
            ...rows(t['messages']).map(
              (m) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Text(m['text'], style: const TextStyle(height: 1.8)),
                ),
              ),
            ),
            if (t['status'] != 'CLOSED')
              FilledButton(
                onPressed: () =>
                    messageDialog(context, 'Javob yozish', (text) async {
                      await widget.api.send(
                        '/support/tickets/${widget.id}/messages',
                        method: 'POST',
                        body: {'text': text},
                      );
                      setState(() => epoch++);
                    }),
                child: const Text('Javob yozish'),
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
    final name = TextEditingController(text: p['name']);
    await showDialog<void>(
      context: context,
      builder: (c) {
        String? error;
        bool busy = false;
        return StatefulBuilder(
          builder: (c, set) => AlertDialog(
            title: const Text('Profilni tahrirlash'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Ism-familiya'),
                ),
                if (error != null)
                  Text(
                    error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: busy ? null : () => Navigator.pop(c),
                child: const Text('Yopish'),
              ),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        set(() => busy = true);
                        try {
                          await widget.api.send(
                            '/auth/profile',
                            method: 'PATCH',
                            body: {'name': name.text.trim()},
                          );
                          if (c.mounted) Navigator.pop(c);
                          if (mounted) setState(() => epoch++);
                        } catch (e) {
                          set(() => error = e.toString());
                        } finally {
                          if (c.mounted) set(() => busy = false);
                        }
                      },
                child: const Text('Saqlash'),
              ),
            ],
          ),
        );
      },
    );
    name.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.api.signedIn) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const EmptyView('Profilingizni ko‘rish uchun kiring.'),
          const AppearanceSettings(),
          FilledButton(
            onPressed: () async {
              if (await ensureLogin(context, widget.api)) {
                widget.changed();
                if (mounted) setState(() => epoch++);
              }
            },
            child: const Text('Telefon orqali kirish'),
          ),
        ],
      );
    }
    return AsyncContent(
      key: ValueKey(epoch),
      load: () => widget.api.send('/auth/me'),
      builder: (v) {
        final p = asJson(v);
        return ListView(
          padding: const EdgeInsets.all(22),
          children: [
            CircleAvatar(
              radius: 38,
              backgroundColor: context.colors.soft,
              child: Icon(
                Icons.person_outline,
                size: 42,
                color: context.colors.primary,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              p['name'],
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 24),
            ),
            Text(
              p['phone'] ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(color: context.colors.muted),
            ),
            const SizedBox(height: 25),
            const AppearanceSettings(),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.edit_outlined),
                    title: const Text('Ism-familiyani o‘zgartirish'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => edit(p),
                  ),
                  ListTile(
                    leading: const Icon(Icons.phone_outlined),
                    title: const Text('Telefonni o‘zgartirish'),
                    trailing: const Icon(Icons.chevron_right),
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
                  ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: const Text('Bildirishnomalar'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => NotificationsScreen(widget.api),
                      ),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.support_agent_outlined),
                    title: const Text('Yordam xizmati'),
                    trailing: const Icon(Icons.chevron_right),
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
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () async {
                await widget.api.logout();
                widget.changed();
                if (mounted) setState(() => epoch++);
              },
              icon: const Icon(Icons.logout),
              label: const Text('Hisobdan chiqish'),
            ),
          ],
        );
      },
    );
  }
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
        setState(() => challenge = r);
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
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Telefonni o‘zgartirish')),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'Eski va yangi raqamga yuborilgan kodlar bilan ikkala raqamni tasdiqlang.',
          style: TextStyle(height: 1.8),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: phone,
          enabled: challenge == null,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Yangi telefon'),
        ),
        if (challenge != null) ...[
          const SizedBox(height: 15),
          TextField(
            controller: old,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: 'Eski telefon kodi'),
          ),
          TextField(
            controller: next,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: 'Yangi telefon kodi'),
          ),
        ],
        if (error != null) ErrorView(error!),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: busy ? null : action,
          child: Text(
            challenge == null
                ? 'Ikkala raqamga kod yuborish'
                : 'Telefonni tasdiqlash',
          ),
        ),
      ],
    ),
  );
}

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';

class BookingComposer extends StatefulWidget {
  final Api api;
  final Json sanatorium;
  const BookingComposer(this.api, this.sanatorium, {super.key});
  @override
  State<BookingComposer> createState() => _BookingComposerState();
}

class _BookingComposerState extends State<BookingComposer> {
  final name = TextEditingController(),
      phone = TextEditingController(text: '+998');
  late DateTimeRange dates;
  final items = <Json>[];
  Json? quote;
  bool busy = false, accepted = false;
  String? error;
  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    dates = DateTimeRange(
      start: DateTime(now.year, now.month, now.day + 1),
      end: DateTime(now.year, now.month, now.day + 3),
    );
    items.add(newRoom());
    widget.api.store.read('profile').then((p) {
      if (p != null && mounted) {
        final user = asJson(jsonDecode(p));
        name.text = user['name'] == 'Mijoz' ? '' : user['name'] ?? '';
        phone.text = user['phone'] ?? '+998';
      }
    });
  }

  Json newRoom() => {
    'rate_id': rows(widget.sanatorium['rate_plans']).first['id'],
    'adults': 1,
    'children': '',
  };
  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    super.dispose();
  }

  Json request() {
    final rates = rows(widget.sanatorium['rate_plans']);
    return {
      'sanatorium_id': widget.sanatorium['id'],
      'check_in': dateOnly(dates.start),
      'check_out': dateOnly(dates.end),
      'items': items.map((item) {
        final r = rates.firstWhere((r) => r['id'] == item['rate_id']);
        final children = item['children']
            .toString()
            .split(',')
            .where((s) => s.trim().isNotEmpty)
            .map((s) => int.tryParse(s.trim()) ?? -1)
            .toList();
        if (children.any((a) => a < 0 || a > 17)) {
          throw const ApiException(
            'AGE_INVALID',
            'Bolalar yoshi 0–17 orasida bo‘lsin.',
          );
        }
        return {
          'room_type_id': r['roomTypeId'],
          'rate_plan_id': r['id'],
          'adults': item['adults'],
          'children_ages': children,
        };
      }).toList(),
    };
  }

  void changed(VoidCallback fn) => setState(() {
    fn();
    quote = null;
    accepted = false;
    error = null;
  });
  Future<void> calculate() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = asJson(
        await widget.api.send(
          '/customer/quotes',
          method: 'POST',
          body: request(),
        ),
      );
      if (mounted) setState(() => quote = result);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> hold() async {
    if (name.text.trim().length < 2 ||
        !RegExp(r'^\+998\d{9}$').hasMatch(phone.text.trim())) {
      setState(
        () => error = 'Mehmon ismi va +998 bilan telefonni to‘liq kiriting.',
      );
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = asJson(
        await widget.api.send(
          '/customer/bookings/hold',
          method: 'POST',
          body: {
            'quote_id': quote!['id'],
            'accepted_policy_versions': rows(quote!['data']['policies'])
                .map((p) => p['id'])
                .toList(),
            'guest': {'name': name.text.trim(), 'phone': phone.text.trim()},
          },
        ),
      );
      await widget.api.pendingBooking(result['id']);
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => BookingScreen(widget.api, result['id']),
          ),
        );
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.sanatorium, rates = rows(s['rate_plans']);
    return Scaffold(
      appBar: AppBar(title: const Text('Bron yaratish')),
      bottomNavigationBar: ActionDock(
        amount: quote == null ? null : money(quote!['amount']),
        caption: 'Yakuniy bron narxi',
        label: busy
            ? 'Hisoblanmoqda…'
            : quote == null
            ? 'Narx va bo‘sh joyni tekshirish'
            : 'Xonalarni band qilish va to‘lash',
        onPressed: busy
            ? null
            : quote == null
            ? calculate
            : accepted
            ? hold
            : null,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            s['name'],
            style: const TextStyle(
              fontSize: 23,
              fontWeight: FontWeight.w700,
              color: ink,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: pale,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              quote == null
                  ? '1. Sana  →  2. Xona va mehmonlar  →  3. Bron hisobi'
                  : 'Bron hisobi tayyor. Mehmon ma’lumotlari va qaytarish shartlarini tasdiqlang.',
              style: const TextStyle(color: forest, fontSize: 12, height: 1.5),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.date_range, color: green),
              title: Text('${dateOnly(dates.start)} — ${dateOnly(dates.end)}'),
              subtitle: Text('${dates.duration.inDays} tun'),
              trailing: const Icon(Icons.edit_calendar_outlined),
              onTap: busy
                  ? null
                  : () async {
                      final now = DateTime.now(),
                          result = await showDateRangePicker(
                            context: context,
                            firstDate: DateTime(now.year, now.month, now.day),
                            lastDate: DateTime(
                              now.year + 2,
                              now.month,
                              now.day,
                            ),
                            initialDateRange: dates,
                            helpText: 'Kelish va ketish sanalari',
                            saveText: 'Tanlash',
                          );
                      if (mounted && result != null) {
                        changed(() => dates = result);
                      }
                    },
            ),
          ),
          const SizedBox(height: 16),
          ...items.asMap().entries.map((e) {
            final n = e.key,
                item = e.value,
                rate = rates.firstWhere((r) => r['id'] == item['rate_id']),
                type = rows(s['room_types'])
                    .firstWhere((t) => t['id'] == rate['roomTypeId']);
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${n + 1}-xona',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (items.length > 1)
                          IconButton(
                            tooltip: 'Xonani olib tashlash',
                            onPressed: busy
                                ? null
                                : () => changed(() => items.removeAt(n)),
                            icon: const Icon(Icons.close),
                          ),
                      ],
                    ),
                    DropdownButtonFormField<String>(
                      key: ValueKey('rate-$n-${item['rate_id']}'),
                      initialValue: item['rate_id'],
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Xona va tarif',
                      ),
                      items: rates
                          .map(
                            (r) => DropdownMenuItem<String>(
                              value: r['id'],
                              child: Text(
                                '${r['name']} · ${money(r['baseAmount'])}',
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: busy
                          ? null
                          : (v) => changed(() => item['rate_id'] = v),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${type['name']} · sig‘im ${type['maxGuests']} mehmon',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.black54,
                      ),
                    ),
                    Row(
                      children: [
                        const Expanded(child: Text('Kattalar')),
                        IconButton(
                          onPressed: busy || item['adults'] <= 1
                              ? null
                              : () => changed(() => item['adults']--),
                          icon: const Icon(Icons.remove_circle_outline),
                        ),
                        Text('${item['adults']}'),
                        IconButton(
                          onPressed: busy || item['adults'] >= type['maxAdults']
                              ? null
                              : () => changed(() => item['adults']++),
                          icon: const Icon(Icons.add_circle_outline),
                        ),
                      ],
                    ),
                    TextFormField(
                      key: ValueKey(item),
                      initialValue: item['children'],
                      enabled: !busy,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Bolalar yoshi',
                        hintText: 'Masalan: 4, 9',
                        helperText: 'Bola yo‘q bo‘lsa bo‘sh qoldiring.',
                      ),
                      onChanged: (v) => changed(() => item['children'] = v),
                    ),
                  ],
                ),
              ),
            );
          }),
          if (items.length < 10)
            TextButton.icon(
              onPressed: busy
                  ? null
                  : () => changed(() => items.add(newRoom())),
              icon: const Icon(Icons.add),
              label: const Text('Yana xona qo‘shish'),
            ),
          const SizedBox(height: 16),
          if (error != null) ErrorView(error!),
          if (quote != null) ...[
            const SizedBox(height: 20),
            Card(
              color: pale,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Bron hisobi',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 19,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...rows(quote!['data']['items']).map(
                      (i) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(
                          '${i['room_type_name']} · ${quote!['data']['nights']} tun: ${money(i['amount'])}',
                        ),
                      ),
                    ),
                    Text(
                      'Jami: ${money(quote!['amount'])}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 21,
                        color: green,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...rows(quote!['data']['policies']).map(
                      (p) => Text(
                        '${p['name']}${p['kind'] == 'FULL_BEFORE_CUTOFF' ? ' · kelishdan ${p['cutoff_hours']} soat oldingacha to‘liq refund' : ''}',
                        style: const TextStyle(fontSize: 12, height: 1.8),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Taklif 10 daqiqa amal qiladi. Bron yaratishda narx va inventar yana tekshiriladi.',
                      style: TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: name,
              decoration: const InputDecoration(
                labelText: 'Mehmon ism-familiyasi',
              ),
              autofillHints: const [AutofillHints.name],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Mehmon telefoni'),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: accepted,
              onChanged: busy
                  ? null
                  : (v) => setState(() => accepted = v ?? false),
              title: const Text(
                'Qaytarish shartlarini o‘qidim va qabul qilaman.',
                style: TextStyle(fontSize: 13),
              ),
            ),
          ],
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}

class BookingsScreen extends StatefulWidget {
  final Api api;
  const BookingsScreen(this.api, {super.key});
  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  int page = 1, epoch = 0;
  @override
  Widget build(BuildContext context) => AsyncContent(
    key: ValueKey('$page:$epoch'),
    load: () => widget.api.send('/customer/bookings?page=$page&limit=15'),
    builder: (v) {
      final r = asJson(v), bookings = rows(r);
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (bookings.isEmpty) const EmptyView('Hozircha bronlaringiz yo‘q.'),
          ...bookings.map(
            (b) => Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(18),
                title: Text(
                  b['reference'],
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    Text(
                      '${b['checkIn'].toString().substring(0, 10)} — ${b['checkOut'].toString().substring(0, 10)}',
                    ),
                    const SizedBox(height: 7),
                    Text(money(b['amount'])),
                    const SizedBox(height: 7),
                    Pill(b['status']),
                  ],
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => BookingScreen(widget.api, b['id']),
                    ),
                  );
                  if (mounted) setState(() => epoch++);
                },
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: page > 1 ? () => setState(() => page--) : null,
                child: const Text('← Oldingi'),
              ),
              Text('$page / ${r['pages'] == 0 ? 1 : r['pages']}'),
              TextButton(
                onPressed: page < r['pages']
                    ? () => setState(() => page++)
                    : null,
                child: const Text('Keyingi →'),
              ),
            ],
          ),
        ],
      );
    },
  );
}

class BookingScreen extends StatefulWidget {
  final Api api;
  final String id;
  const BookingScreen(this.api, this.id, {super.key});
  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen>
    with WidgetsBindingObserver {
  Json? booking, checkout;
  String? error;
  bool busy = false;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    refresh();
    timer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (booking != null &&
          ['HOLD', 'PAYMENT_PENDING'].contains(booking!['status']) &&
          !busy) {
        refresh();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) refresh();
  }

  Future<void> refresh() async {
    try {
      if (checkout?['mode'] == 'tezcheck') {
        await widget.api.send(
          '/payments/${checkout!['order_id']}/refresh',
          method: 'POST',
          body: {},
        );
      }
      final r = asJson(
        await widget.api.send('/customer/bookings/${widget.id}'),
      );
      if (!['HOLD', 'PAYMENT_PENDING'].contains(r['status'])) {
        if (await widget.api.getPendingBooking() == widget.id) {
          await widget.api.pendingBooking(null);
        }
      }
      if (mounted) {
        setState(() {
          booking = r;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> pay() async {
    setState(() => busy = true);
    try {
      await widget.api.pendingBooking(widget.id);
      final r = asJson(
        await widget.api.send(
          '/customer/bookings/${widget.id}/checkout',
          method: 'POST',
          body: {},
        ),
      );
      if (!mounted) return;
      setState(() => checkout = r);
      if (r['mode'] != 'local') {
        final url = Uri.parse(r['checkout_url']);
        if (url.scheme != 'https' ||
            !await launchUrl(url, mode: LaunchMode.externalApplication)) {
          throw const ApiException(
            'CHECKOUT_OPEN_FAILED',
            'To‘lov sahifasini ochib bo‘lmadi. Qayta urinib ko‘ring.',
          );
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> support() async {
    await messageDialog(context, 'Bron bo‘yicha yordam', (text) async {
      await widget.api.send(
        '/support/tickets',
        method: 'POST',
        body: {
          'booking_id': widget.id,
          'title': 'Bron ${booking?['reference'] ?? ''}',
          'text': text,
        },
      );
    });
  }

  Future<void> review() async {
    final text = TextEditingController();
    int rating = 5;
    await showDialog<void>(
      context: context,
      builder: (c) {
        bool sending = false;
        String? failure;
        return StatefulBuilder(
          builder: (c, set) => AlertDialog(
            title: const Text('Yashashingizni baholang'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButton<int>(
                  value: rating,
                  items: List.generate(
                    5,
                    (i) => DropdownMenuItem(
                      value: i + 1,
                      child: Text('${i + 1} / 5'),
                    ),
                  ),
                  onChanged: (v) => set(() => rating = v!),
                ),
                TextField(
                  controller: text,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Sharh'),
                ),
                if (failure != null)
                  Text(failure!, style: const TextStyle(color: Colors.red)),
              ],
            ),
            actions: [
              TextButton(
                onPressed: sending ? null : () => Navigator.pop(c),
                child: const Text('Yopish'),
              ),
              FilledButton(
                onPressed: sending
                    ? null
                    : () async {
                        set(() => sending = true);
                        try {
                          await widget.api.send(
                            '/reviews',
                            method: 'POST',
                            body: {
                              'booking_id': widget.id,
                              'rating': rating,
                              'text': text.text.trim(),
                            },
                          );
                          if (c.mounted) Navigator.pop(c);
                        } catch (e) {
                          set(() => failure = e.toString());
                        } finally {
                          if (c.mounted) set(() => sending = false);
                        }
                      },
                child: const Text('Sharh qoldirish'),
              ),
            ],
          ),
        );
      },
    );
    text.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final b = booking;
    return Scaffold(
      appBar: AppBar(
        title: Text(b?['reference'] ?? 'Bron'),
        actions: [
          IconButton(
            tooltip: 'Holatni yangilash',
            onPressed: refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      bottomNavigationBar:
          b != null && ['HOLD', 'PAYMENT_PENDING'].contains(b['status'])
          ? ActionDock(
              amount: money(b['amount']),
              caption: 'Bron narxi',
              label: busy ? 'Ochilmoqda…' : 'To‘lovga o‘tish',
              onPressed: busy ? null : pay,
            )
          : null,
      body: b == null
          ? error == null
                ? const Busy()
                : ErrorView(error!, retry: refresh)
          : RefreshIndicator(
              onRefresh: refresh,
              child: ListView(
                padding: const EdgeInsets.all(22),
                children: [
                  Pill(b['status']),
                  const SizedBox(height: 18),
                  Text(
                    b['reference'],
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: ink,
                    ),
                  ),
                  Text(
                    '${b['checkIn'].toString().substring(0, 10)} — ${b['checkOut'].toString().substring(0, 10)}',
                  ),
                  const SizedBox(height: 18),
                  Text(
                    money(b['amount']),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: green,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('Mehmon: ${b['guest']['name']}'),
                  if (b['holdExpiresAt'] != null && b['status'] == 'HOLD')
                    Text(
                      'To‘lov muddati: ${DateTime.parse(b['holdExpiresAt']).toLocal()}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.black54,
                      ),
                    ),
                  if (b['status'] == 'PAYMENT_PENDING')
                    const Text(
                      'To‘lov provayderda kutilmoqda. Natija server tasdig‘i bilan yangilanadi.',
                      style: TextStyle(height: 1.8),
                    ),
                  if (error != null) ErrorView(error!, retry: refresh),
                  const SizedBox(height: 16),
                  ...rows(b['items']).map(
                    (i) => Card(
                      child: ListTile(
                        leading: const Icon(Icons.bed_outlined),
                        title: Text(
                          '${i['adults']} katta · ${(i['childrenAges'] as List).length} bola',
                        ),
                        subtitle: Text(money(i['amount'])),
                      ),
                    ),
                  ),
                  if ([
                    'CONFIRMED',
                    'CHECKED_IN',
                    'CHECKED_OUT',
                  ].contains(b['status'])) ...[
                    Center(
                      child: QrImageView(
                        data: 'sihhat://booking/${b['id']}',
                        version: QrVersions.auto,
                        size: 180,
                      ),
                    ),
                    const Text(
                      'Bronni topish uchun QR. Qabulxonada shaxsingiz ham tekshiriladi.',
                      style: TextStyle(fontSize: 11, color: Colors.black54),
                      textAlign: TextAlign.center,
                    ),
                    TextButton.icon(
                      onPressed: () => showDialog<void>(
                        context: context,
                        builder: (c) => AlertDialog(
                          title: Text(b['reference']),
                          content: Text(
                            '${b['guest']['name']}\n${b['checkIn'].toString().substring(0, 10)} — ${b['checkOut'].toString().substring(0, 10)}\n${money(b['amount'])}\n${states[b['status']]}',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(c),
                              child: const Text('Yopish'),
                            ),
                          ],
                        ),
                      ),
                      icon: const Icon(Icons.receipt_long_outlined),
                      label: const Text('Bron hujjatini ko‘rish'),
                    ),
                  ],
                  if (checkout?['mode'] == 'local' &&
                      kDebugMode &&
                      ['HOLD', 'PAYMENT_PENDING'].contains(b['status']))
                    Card(
                      color: const Color(0xfffff2dc),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          children: [
                            const Text(
                              'Mahalliy sinov to‘lovi. Haqiqiy pul o‘tkazilmaydi.',
                              style: TextStyle(fontSize: 12),
                            ),
                            TextButton(
                              onPressed: busy
                                  ? null
                                  : () async {
                                      setState(() => busy = true);
                                      try {
                                        await widget.api.send(
                                          '/payments/${checkout!['order_id']}/local-confirm',
                                          method: 'POST',
                                          body: {},
                                        );
                                        await refresh();
                                      } catch (e) {
                                        if (mounted) {
                                          setState(() => error = e.toString());
                                        }
                                      } finally {
                                        if (mounted) {
                                          setState(() => busy = false);
                                        }
                                      }
                                    },
                              child: const Text('Sinov to‘lovini tasdiqlash'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (b['status'] == 'HOLD')
                    TextButton(
                      onPressed: () => messageDialog(
                        context,
                        'To‘lovsiz bronni bekor qilish',
                        (reason) async {
                          await widget.api.send(
                            '/customer/bookings/${widget.id}/cancel',
                            method: 'POST',
                            body: {'reason': reason},
                          );
                          await refresh();
                        },
                      ),
                      child: const Text('Bronni bekor qilish'),
                    ),
                  if (b['payment']?['status'] == 'SUCCEEDED' &&
                      b['refund'] == null)
                    TextButton(
                      onPressed: () => messageDialog(
                        context,
                        'To‘liq qaytarish so‘rovi',
                        (reason) async {
                          await widget.api.send(
                            '/customer/bookings/${widget.id}/refund-request',
                            method: 'POST',
                            body: {'reason': reason},
                          );
                          await refresh();
                        },
                      ),
                      child: const Text('Pulni qaytarish so‘rovi'),
                    ),
                  if (b['refund'] != null)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        'Qaytarish: ${states[b['refund']['status']] ?? b['refund']['status']}',
                      ),
                    ),
                  if (b['status'] == 'CHECKED_OUT')
                    TextButton.icon(
                      onPressed: review,
                      icon: const Icon(Icons.star_outline),
                      label: const Text('Sharh qoldirish'),
                    ),
                  TextButton.icon(
                    onPressed: support,
                    icon: const Icon(Icons.support_agent_outlined),
                    label: const Text('Yordam xizmati'),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}

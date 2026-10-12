import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import '../data/booking_cache.dart';
import '../widgets.dart';
import '../design.dart';
import '../concept_ui.dart';
import '../catalog_card.dart';
import '../booking_dates.dart';
import 'login.dart';
import 'account.dart' show NewSupportTicketScreen, SupportThread;

class BookingComposer extends StatefulWidget {
  final Api api;
  final Json sanatorium;
  final String? initialRateId;
  const BookingComposer(
    this.api,
    this.sanatorium, {
    this.initialRateId,
    super.key,
  });
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
    widget.api.cachedProfile().then((p) {
      if (p != null && mounted) {
        name.text = p['name'] == 'Mijoz' ? '' : p['name'] ?? '';
        phone.text = p['phone'] ?? '+998';
      }
    });
  }

  Json newRoom() => {
    'rate_id': items.isNotEmpty
        ? items.last['rate_id']
        : widget.initialRateId ??
              rows(widget.sanatorium['rate_plans']).first['id'],
    'adults': 1,
    'children': <int>[],
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
        final children = List<int>.from(item['children']);
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
    if (busy) return;
    if (dates.duration.inDays < 1) {
      setState(
        () =>
            error = 'Kelish va ketish sanalari orasida kamida bir tun bo‘lsin.',
      );
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (!await ensureLogin(context, widget.api)) return;
      if (!mounted) return;
      final result = asJson(
        await widget.api.send(
          '/customer/quotes',
          method: 'POST',
          body: request(),
        ),
      );
      if (mounted) setState(() => quote = result);
    } catch (e) {
      if (mounted) {
        setState(
          () => error =
              e is ApiException &&
                  ['NETWORK_ERROR', 'NETWORK_TIMEOUT'].contains(e.code)
              ? 'To‘lovga o‘tish uchun internetga ulaning. Tanlovlaringiz saqlanadi.'
              : e.toString(),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> hold() async {
    if (busy) return;
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
      await BookingCache(widget.api)
          .remember({...result, 'sanatorium_name': widget.sanatorium['name']});
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

  Future<void> pickDates() async {
    final result = await Navigator.push<DateTimeRange>(
      context,
      MaterialPageRoute(
        builder: (_) => BookingDateScreen(widget.api, widget.sanatorium, dates),
      ),
    );
    if (mounted && result != null) changed(() => dates = result);
  }

  Widget room(int n, Json item, List<Json> rates, Json s) {
    final rate = rates.firstWhere((r) => r['id'] == item['rate_id']);
    final type = rows(s['room_types'])
        .firstWhere((r) => r['id'] == rate['roomTypeId']);
    final children = List<int>.from(item['children']);
    final types = rows(s['room_types'])
        .where((type) => rates.any((rate) => rate['roomTypeId'] == type['id']))
        .toList();
    final typeRates = rates
        .where((r) => r['roomTypeId'] == type['id'])
        .toList();
    return ConceptCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (items.length > 1)
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${n + 1}-xona',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (items.length > 1)
                  IconButton(
                    tooltip: 'Xonani olib tashlash',
                    onPressed: busy
                        ? null
                        : () => changed(() => items.removeAt(n)),
                    icon: const SihhatIcon('x'),
                  ),
              ],
            ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            key: ValueKey('type-$n-${type['id']}'),
            initialValue: type['id'],
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Xona turi'),
            items: types
                .map(
                  (r) => DropdownMenuItem<String>(
                    value: r['id'],
                    child: Text(r['name'], overflow: TextOverflow.ellipsis),
                  ),
                )
                .toList(),
            onChanged: busy
                ? null
                : (v) => changed(() {
                    item['rate_id'] = rates.firstWhere(
                      (r) => r['roomTypeId'] == v,
                    )['id'];
                    final capacity = types.firstWhere((r) => r['id'] == v);
                    item['adults'] = (item['adults'] as int).clamp(
                      1,
                      (capacity['maxAdults'] as int).clamp(
                        1,
                        capacity['maxGuests'] as int,
                      ),
                    );
                    item['children'] = <int>[];
                  }),
          ),
          const SizedBox(height: 12),
          if (typeRates.length > 1)
            DropdownButtonFormField<String>(
              key: ValueKey('rate-$n-${item['rate_id']}'),
              initialValue: item['rate_id'],
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Tarif'),
              items: typeRates
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
            )
          else
            Text(
              '${rate['name']} · ${money(rate['baseAmount'])} / tun',
              style: TextStyle(
                color: context.colors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Expanded(child: Text('Kattalar')),
              IconButton(
                tooltip: 'Kattani kamaytirish',
                onPressed: busy || item['adults'] <= 1
                    ? null
                    : () => changed(() => item['adults']--),
                icon: const SihhatIcon('minus'),
              ),
              Text(
                '${item['adults']}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              IconButton(
                tooltip: 'Kattani qo‘shish',
                onPressed:
                    busy ||
                        item['adults'] >= type['maxAdults'] ||
                        item['adults'] + children.length >= type['maxGuests']
                    ? null
                    : () => changed(() => item['adults']++),
                icon: const SihhatIcon('plus'),
              ),
            ],
          ),
          if (type['maxChildren'] > 0)
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: Text(
                children.isEmpty
                    ? 'Bolalar bilan kelaman'
                    : '${children.length} bola',
              ),
              children: [
                for (var c = 0; c < children.length; c++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<int>(
                            key: ValueKey('child-$n-$c-${children[c]}'),
                            initialValue: children[c],
                            decoration: InputDecoration(
                              labelText: '${c + 1}-bola yoshi',
                            ),
                            items: List.generate(
                              18,
                              (age) => DropdownMenuItem(
                                value: age,
                                child: Text('$age yosh'),
                              ),
                            ),
                            onChanged: busy
                                ? null
                                : (v) => changed(() {
                                    children[c] = v!;
                                    item['children'] = children;
                                  }),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Bolani olib tashlash',
                          onPressed: busy
                              ? null
                              : () => changed(() {
                                  children.removeAt(c);
                                  item['children'] = children;
                                }),
                          icon: const SihhatIcon('x'),
                        ),
                      ],
                    ),
                  ),
                if (children.length < type['maxChildren'] &&
                    item['adults'] + children.length < type['maxGuests'])
                  TextButton.icon(
                    onPressed: busy
                        ? null
                        : () => changed(
                            () => item['children'] = [...children, 5],
                          ),
                    icon: const SihhatIcon('users'),
                    label: const Text('Bola qo‘shish'),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.sanatorium, rates = rows(s['rate_plans']);
    final confirming = quote != null;
    return ConceptPage(
      title: confirming ? 'Bronni tasdiqlash' : 'Sana va xona',
      bottom: ConceptScope(
        child: ConceptDock(
          amount: confirming ? money(quote!['amount']) : null,
          caption: '${dates.duration.inDays} tun · ${items.length} xona',
          label: busy
              ? 'Kutilmoqda…'
              : confirming
              ? 'Bronni tasdiqlash'
              : 'To‘lovga o‘tish',
          onPressed: busy
              ? null
              : confirming
              ? (accepted ? hold : null)
              : calculate,
        ),
      ),
      body: ListView(
        key: ValueKey(confirming),
        padding: const EdgeInsets.all(20),
        children: [
          BookingSteps(confirming: confirming),
          if (error != null) ErrorView(error!),
          PlaceSummary(
            widget.api,
            s,
            subtitle: confirming
                ? '${dateOnly(dates.start)} — ${dateOnly(dates.end)}'
                : null,
            details: confirming
                ? '${items.length} xona · ${items.fold<int>(0, (sum, i) => sum + (i['adults'] as int) + (i['children'] as List).length)} mehmon'
                : null,
          ),
          if (!confirming) ...[
            ConceptCard(
              color: context.colors.soft,
              padding: EdgeInsets.zero,
              child: ListTile(
                leading: SihhatIcon(
                  'calendar-days',
                  color: context.colors.primary,
                ),
                title: Text(
                  '${dateOnly(dates.start)} — ${dateOnly(dates.end)}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text('${dates.duration.inDays} tun'),
                trailing: const SihhatIcon('pencil', size: 20),
                onTap: busy ? null : pickDates,
              ),
            ),
            ...items.asMap().entries.map((e) => room(e.key, e.value, rates, s)),
            if (items.length < 10)
              ConceptCard(
                padding: EdgeInsets.zero,
                child: ExpansionTile(
                  title: const Text('Qo‘shimcha xona'),
                  leading: const SihhatIcon('bed-double'),
                  subtitle: const Text('Agar yana xona kerak bo‘lsa'),
                  children: [
                    TextButton.icon(
                      onPressed: busy
                          ? null
                          : () => changed(() => items.add(newRoom())),
                      icon: const SihhatIcon('plus'),
                      label: const Text('Yana xona qo‘shish'),
                    ),
                  ],
                ),
              ),
            const ConceptInfo(
              icon: 'shield-check',
              title: 'Tanlovingiz saqlanadi',
              text: 'Yakuniy narx va bo‘sh xonalar keyingi bosqichda tekshiriladi.',
            ),
          ] else ...[
            ConceptCard(
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Mehmon ma’lumotlari', style: conceptHeading(context)),
                    const SizedBox(height: 18),
                    TextField(
                      controller: name,
                      enabled: !busy,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.name],
                      decoration: const InputDecoration(
                        labelText: 'Mehmon ism-familiyasi',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: phone,
                      enabled: !busy,
                      keyboardType: TextInputType.phone,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: const InputDecoration(
                        labelText: 'Mehmon telefoni',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            ConceptCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final i in rows(quote!['data']['items']))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              '${i['room_type_name'] ?? 'Xona'} · ${quote!['data']['nights']} tun',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Flexible(
                            child: Text(
                              money(i['amount']),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const Divider(height: 24),
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Jami',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Flexible(
                        flex: 2,
                        child: Text(
                          money(quote!['amount']),
                          style: conceptHeading(context, size: 21),
                        ),
                      ),
                    ],
                  ),
                  TextButton.icon(
                    onPressed: busy ? null : () => changed(() {}),
                    icon: const SihhatIcon('pencil', size: 18),
                    label: const Text('Sana yoki xonani o‘zgartirish'),
                  ),
                ],
              ),
            ),
            ConceptCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                leading: const SihhatIcon('shield-check'),
                title: const Text(
                  'Bekor qilish va pulni qaytarish shartlari',
                  style: TextStyle(fontSize: 14),
                ),
                children: [
                  for (final p in rows(quote!['data']['policies']))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        p['kind'] == 'FULL_BEFORE_CUTOFF'
                            ? '${p['name']}. Kelishdan ${p['cutoff_hours']} soat oldingacha to‘liq qaytariladi.'
                            : '${p['name']}. To‘lov qaytarilmaydi.',
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 13,
                          height: 1.5,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: accepted,
              controlAffinity: ListTileControlAffinity.leading,
              onChanged: busy
                  ? null
                  : (v) => setState(() => accepted = v ?? false),
              title: const Text(
                'Shartlarni o‘qidim va qabul qilaman',
                style: TextStyle(fontSize: 14),
              ),
            ),
          ],
          const SizedBox(height: 20),
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

class _BookingsScreenState extends State<BookingsScreen>
    with WidgetsBindingObserver {
  int page = 1;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    timer = Timer.periodic(const Duration(seconds: 1), (t) {
      BookingCache(widget.api).prune();
      if (t.tick % 60 == 0) BookingCache(widget.api).sync();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) BookingCache(widget.api).sync();
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CachedContent(
    key: ValueKey(page),
    cached: () => BookingCache(widget.api).page(page),
    changes: BookingCache(widget.api),
    refresh: () async {
      final cache = BookingCache(widget.api);
      await cache.sync();
      final result = await cache.page(page);
      if (result == null) {
        throw cache.error ?? 'Bronlarni yuklash uchun internetga ulaning.';
      }
      return result;
    },
    builder: (v) {
      final r = asJson(v), bookings = rows(r);
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (BookingCache(widget.api).error != null &&
              BookingCache(widget.api).hasSnapshot)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text(
                'Saqlangan bronlar · Internet qaytganda yangilanadi.',
              ),
            ),
          if (bookings.isEmpty) const EmptyView('Hozircha bronlaringiz yo‘q.'),
          for (final b in bookings)
            ConceptCard(
              padding: EdgeInsets.zero,
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BookingScreen(widget.api, b['id']),
                  ),
                );
                if (mounted) BookingCache(widget.api).sync();
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  PlacePhoto(
                    widget.api,
                    catalogueItem(widget.api, b['sanatoriumId']),
                    height: 160,
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b['sanatorium_name'] ?? 'Sanatoriya',
                          style: conceptHeading(context, size: 20),
                        ),
                        const SizedBox(height: 8),
                        Pill(b['status']),
                        const SizedBox(height: 8),
                        ConceptRow(
                          'calendar-days',
                          '${b['checkIn'].toString().substring(0, 10)} — ${b['checkOut'].toString().substring(0, 10)}',
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    money(b['amount']),
                                    style: conceptHeading(context, size: 19),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    b['reference'],
                                    style: TextStyle(
                                      color: context.colors.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SihhatIcon('chevron-right'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
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
  bool offline = false;
  Future<void>? refreshing;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    initial();
    timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (booking != null && !bookingVisible(booking!)) {
        BookingCache(widget.api).prune();
        if (mounted) setState(() {});
      }
      if (mounted && booking?['status'] == 'HOLD') setState(() {});
      if (booking != null &&
          ['HOLD', 'PAYMENT_PENDING'].contains(booking!['status']) &&
          !busy &&
          t.tick % 8 == 0) {
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

  Future<void> initial() async {
    final saved = await BookingCache(widget.api).cached(widget.id);
    if (!mounted) return;
    if (saved != null) setState(() => booking = saved);
    await refresh();
  }

  Future<void> refresh() =>
      refreshing ??= _refresh().whenComplete(() => refreshing = null);
  Future<void> _refresh() async {
    try {
      if (checkout?['mode'] == 'tezcheck') {
        await widget.api.send(
          '/payments/${checkout!['order_id']}/refresh',
          method: 'POST',
          body: {},
        );
      }
      final r = await BookingCache(widget.api).refresh(widget.id);
      if (!['HOLD', 'PAYMENT_PENDING'].contains(r['status']) ||
          !bookingVisible(r)) {
        if (await widget.api.getPendingBooking() == widget.id) {
          await widget.api.pendingBooking(null);
        }
      }
      if (mounted) {
        setState(() {
          booking = r;
          error = null;
          offline = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          offline =
              e is ApiException &&
              ['NETWORK_ERROR', 'NETWORK_TIMEOUT'].contains(e.code);
          if (e is ApiException && [401, 403, 404].contains(e.status)) {
            booking = null;
          }
          error = offline && booking != null ? null : e.toString();
        });
      }
    }
  }

  Future<void> cancel() async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await BookingCache(widget.api)
          .cancel(widget.id, 'Foydalanuvchi to‘lovni bekor qildi');
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> pay() async {
    if (busy) return;
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
    final created = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => NewSupportTicketScreen(
          widget.api,
          bookingId: widget.id,
          reference: booking?['reference'],
        ),
      ),
    );
    if (created != null && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => SupportThread(widget.api, created['id']),
        ),
      );
    }
  }

  Future<void> review() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BookingReviewScreen(widget.api, widget.id, booking!),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final b = booking;
    final pending =
        b != null && ['HOLD', 'PAYMENT_PENDING'].contains(b['status']);
    final checking =
        b?['status'] == 'PAYMENT_PENDING' || checkout != null && pending;
    final place = b == null
        ? <String, dynamic>{}
        : <String, dynamic>{
            ...?catalogueItem(widget.api, b['sanatoriumId']),
            'name':
                b['sanatorium_name'] ??
                catalogueItem(widget.api, b['sanatoriumId'])?['name'] ??
                'Sanatoriya',
          };
    return ConceptPage(
      title: b?['status'] == 'CONFIRMED'
          ? 'Bron tasdig‘i'
          : pending
          ? checking
                ? 'To‘lov holati'
                : 'Bron uchun to‘lov'
          : 'Bron ma’lumotlari',
      actions: [
        IconButton(
          tooltip: 'Holatni yangilash',
          onPressed: refresh,
          icon: const SihhatIcon('refresh-cw'),
        ),
      ],
      bottom: b != null && bookingVisible(b) && pending
          ? ConceptScope(
              child: ConceptDock(
                amount: money(b['amount']),
                caption: 'Jami to‘lov',
                label: busy
                    ? 'Ochilmoqda…'
                    : checking
                    ? 'Holatni yangilash'
                    : 'To‘lovga o‘tish',
                onPressed: busy
                    ? null
                    : checking
                    ? refresh
                    : pay,
                secondary: OutlinedButton(
                  onPressed: busy ? null : cancel,
                  child: const Text('To‘lovni bekor qilish'),
                ),
              ),
            )
          : null,
      body: b == null
          ? error == null
                ? const Busy()
                : ErrorView(error!, retry: refresh)
          : !bookingVisible(b)
          ? const EmptyView(
              'To‘lovsiz bron tarixdan olib tashlandi. Yangi bron yaratishingiz mumkin.',
            )
          : RefreshIndicator(
              onRefresh: refresh,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Pill(b['status']),
                  ),
                  const SizedBox(height: 14),
                  if (offline)
                    const ConceptInfo(
                      icon: 'wifi-off',
                      title: 'Saqlangan bron',
                      text: 'Internet qaytganda holati yangilanadi.',
                    ),
                  if (b['status'] == 'CONFIRMED')
                    const ConceptInfo(
                      icon: 'circle-check',
                      title: 'Broningiz tasdiqlandi!',
                      text: 'Yaxshi dam oling! Safaringiz yoqimli va xotirjam o‘tsin.',
                    )
                  else if (checking) ...[
                    const SizedBox(height: 20),
                    const Center(child: IconTile('clock', size: 100)),
                    const SizedBox(height: 24),
                    Text(
                      'To‘lov tekshirilmoqda',
                      textAlign: TextAlign.center,
                      style: conceptHeading(context, size: 26),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Natija kelgach bron holati yangilanadi.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: context.colors.muted,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 24),
                  ] else
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Pill(b['status']),
                      ),
                    ),
                  PlaceSummary(
                    widget.api,
                    place,
                    subtitle:
                        '${b['checkIn'].toString().substring(0, 10)} — ${b['checkOut'].toString().substring(0, 10)}',
                    details: b['reference'],
                  ),
                  ConceptCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bron raqami',
                          style: TextStyle(
                            color: context.colors.muted,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          b['reference'],
                          style: conceptHeading(context, size: 22),
                        ),
                        const SizedBox(height: 12),
                        ConceptRow(
                          'user-round',
                          'Mehmon: ${b['guest']?['name'] ?? ''}',
                        ),
                        for (final i in rows(b['items']))
                          ConceptRow(
                            'bed-double',
                            '${i['adults']} katta · ${(i['childrenAges'] as List? ?? []).length} bola · ${money(i['amount'])}',
                          ),
                        const Divider(height: 26),
                        Text(
                          'Jami to‘lov',
                          style: TextStyle(color: context.colors.muted),
                        ),
                        Text(
                          money(b['amount']),
                          style: conceptHeading(context, size: 27),
                        ),
                      ],
                    ),
                  ),
                  if (b['holdExpiresAt'] != null && b['status'] == 'HOLD')
                    Builder(
                      builder: (c) {
                        final seconds = DateTime.parse(b['holdExpiresAt'])
                            .difference(DateTime.now().toUtc())
                            .inSeconds
                            .clamp(0, 999999);
                        final remaining =
                            '${(seconds ~/ 60).toString().padLeft(2, '0')}:${(seconds % 60).toString().padLeft(2, '0')}';
                        return ConceptInfo(
                          icon: 'clock',
                          title: 'Bron saqlanadi: $remaining',
                          text: 'Belgilangan vaqt ichida to‘lovni yakunlang.',
                          warning: true,
                        );
                      },
                    ),
                  if (pending && !checking)
                    const ConceptInfo(
                      icon: 'shield-check',
                      title: 'To‘lov himoyalangan sahifada davom etadi.',
                    ),
                  if (error != null) ErrorView(error!, retry: refresh),
                  if ([
                    'CONFIRMED',
                    'CHECKED_IN',
                    'CHECKED_OUT',
                  ].contains(b['status']))
                    ConceptCard(
                      child: Column(
                        children: [
                          QrImageView(
                            data: 'sihhat://booking/${b['id']}',
                            version: QrVersions.auto,
                            size: 180,
                            backgroundColor: Colors.white,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Bronni topish uchun QR. Qabulxonada shaxsingiz ham tekshiriladi.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: context.colors.muted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 14),
                          OutlinedButton.icon(
                            icon: const SihhatIcon('file-text', size: 20),
                            label: const Text('Bron hujjatini ko‘rish'),
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => BookingDocumentScreen(b),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (checkout?['mode'] == 'local' && kDebugMode && pending)
                    ConceptCard(
                      color: context.colors.warning,
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
                                      if (mounted) setState(() => busy = false);
                                    }
                                  },
                            child: const Text('Sinov to‘lovini tasdiqlash'),
                          ),
                        ],
                      ),
                    ),
                  if (checking)
                    OutlinedButton.icon(
                      onPressed: busy ? null : pay,
                      icon: const SihhatIcon('credit-card'),
                      label: const Text('To‘lovni davom ettirish'),
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
                    ConceptInfo(
                      icon: 'coins',
                      title:
                          'Qaytarish: ${states[b['refund']['status']] ?? b['refund']['status']}',
                    ),
                  if (b['status'] == 'CHECKED_OUT')
                    FilledButton.icon(
                      onPressed: review,
                      icon: const SihhatIcon('star'),
                      label: const Text('Sharh qoldirish'),
                    ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: support,
                    icon: const SihhatIcon('headphones'),
                    label: const Text('Yordam xizmati'),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }
}

class BookingDocumentScreen extends StatelessWidget {
  final Json booking;
  const BookingDocumentScreen(this.booking, {super.key});
  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Bron hujjati',
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        ConceptCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const IconTile('file-text', size: 60),
              const SizedBox(height: 20),
              SelectableText(
                booking['reference'],
                style: conceptHeading(context, size: 28),
              ),
              const Divider(height: 32),
              ConceptRow('user-round', booking['guest']?['name'] ?? ''),
              ConceptRow(
                'calendar-days',
                '${booking['checkIn'].toString().substring(0, 10)} — ${booking['checkOut'].toString().substring(0, 10)}',
              ),
              ConceptRow('coins', money(booking['amount'])),
              const SizedBox(height: 12),
              Pill(booking['status']),
            ],
          ),
        ),
        const ConceptInfo(
          icon: 'shield-check',
          title: 'Qabulxonada ko‘rsating',
          text: 'Bron holati ilovadagi yangilangan ma’lumotlar asosida tekshiriladi. Shaxsingizni tasdiqlovchi hujjatni olib boring.',
        ),
      ],
    ),
  );
}

class BookingReviewScreen extends StatefulWidget {
  final Api api;
  final String bookingId;
  final Json booking;
  const BookingReviewScreen(
    this.api,
    this.bookingId,
    this.booking, {
    super.key,
  });
  @override
  State<BookingReviewScreen> createState() => _BookingReviewScreenState();
}

class _BookingReviewScreenState extends State<BookingReviewScreen> {
  final text = TextEditingController();
  int rating = 5;
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
      setState(() => error = 'Kamida 3 belgidan iborat sharh yozing.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.api.send(
        '/reviews',
        method: 'POST',
        body: {
          'booking_id': widget.bookingId,
          'rating': rating,
          'text': text.text.trim(),
        },
      );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Sharhingiz yuborildi.')));
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
      title: 'Sharh qoldirish',
      bottom: ConceptScope(
        child: ConceptDock(
          label: busy ? 'Yuborilmoqda…' : 'Sharhni yuborish',
          onPressed: busy ? null : send,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Dam olishingiz qanday o‘tdi?',
            style: conceptHeading(context, size: 26),
          ),
          const SizedBox(height: 10),
          Text(
            widget.booking['sanatorium_name'] ?? widget.booking['reference'],
            style: TextStyle(color: context.colors.muted),
          ),
          const SizedBox(height: 28),
          ConceptCard(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 1; i <= 5; i++)
                      Flexible(
                        child: IconButton(
                          tooltip: '$i yulduz',
                          onPressed: busy
                              ? null
                              : () => setState(() => rating = i),
                          icon: SihhatIcon(
                            'star',
                            size: 32,
                            filled: i <= rating,
                            color: const Color(0xffffbb28),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Text('$rating / 5', style: conceptHeading(context, size: 18)),
              ],
            ),
          ),
          TextField(
            controller: text,
            enabled: !busy,
            minLines: 5,
            maxLines: 8,
            maxLength: 2000,
            decoration: const InputDecoration(
              labelText: 'Sharh',
              hintText: 'Taassurotlaringiz bilan bo‘lishing…',
            ),
          ),
          const SizedBox(height: 16),
          const ConceptInfo(
            icon: 'shield-check',
            title: 'Tasdiqlangan yashash',
            text: 'Sharhlar faqat yakunlangan bronlar bo‘yicha qabul qilinadi.',
          ),
          if (error != null) ErrorView(error!),
        ],
      ),
    ),
  );
}

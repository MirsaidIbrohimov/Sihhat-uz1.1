import 'package:flutter/material.dart';

import 'concept_ui.dart';
import 'catalog_card.dart';
import 'data/api.dart';
import 'design.dart';

class BookingSteps extends StatelessWidget {
  final bool confirming;
  const BookingSteps({this.confirming = false, super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 22),
    child: Row(
      children: [
        CircleAvatar(
          radius: 15,
          backgroundColor: context.colors.primary,
          foregroundColor: context.colors.surface,
          child: confirming
              ? const SihhatIcon('check', size: 18)
              : const Text('1', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
        const SizedBox(width: 8),
        const Expanded(
          child: Text(
            'Sana va xona',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ),
        SizedBox(width: 20, child: Divider(color: context.colors.border)),
        const SizedBox(width: 8),
        CircleAvatar(
          radius: 15,
          backgroundColor: confirming
              ? context.colors.primary
              : context.colors.soft,
          foregroundColor: confirming
              ? context.colors.surface
              : context.colors.ink,
          child: const Text('2', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
        const SizedBox(width: 8),
        const Flexible(
          child: Text(
            'Tasdiqlash',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );
}

/// A real date range, independent of the example dates used in the UI board.
class BookingDateScreen extends StatefulWidget {
  final Api api;
  final Json sanatorium;
  final DateTimeRange initial;
  const BookingDateScreen(this.api, this.sanatorium, this.initial, {super.key});
  @override
  State<BookingDateScreen> createState() => _BookingDateScreenState();
}

class _BookingDateScreenState extends State<BookingDateScreen> {
  static const months = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ];
  late DateTime month, start, today, last;
  DateTime? end;
  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    today = DateTime(now.year, now.month, now.day);
    last = DateTime(now.year + 2, now.month, now.day);
    start = widget.initial.start;
    end = widget.initial.end;
    month = DateTime(start.year, start.month);
  }

  void pick(DateTime day) => setState(() {
    if (end != null || !day.isAfter(start)) {
      start = day;
      end = null;
    } else {
      end = day;
    }
  });
  void move(int direction) =>
      setState(() => month = DateTime(month.year, month.month + direction));
  @override
  Widget build(BuildContext context) {
    final offset = month.weekday - 1,
        days = DateTime(month.year, month.month + 1, 0).day;
    final cells = ((offset + days) / 7).ceil() * 7;
    final canPrevious = month.isAfter(DateTime(today.year, today.month));
    final canNext = month.isBefore(DateTime(last.year, last.month));
    return ConceptPage(
      title: 'Sana va xona',
      bottom: ConceptScope(
        child: ConceptDock(
          label: 'Sanani tanlash',
          onPressed: end == null
              ? null
              : () => Navigator.pop(
                  context,
                  DateTimeRange(start: start, end: end!),
                ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const BookingSteps(),
          PlaceSummary(widget.api, widget.sanatorium),
          ConceptCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Oldingi oy',
                      onPressed: canPrevious ? () => move(-1) : null,
                      icon: const SihhatIcon('chevron-left'),
                    ),
                    Expanded(
                      child: Text(
                        '${months[month.month - 1]} ${month.year}',
                        textAlign: TextAlign.center,
                        style: conceptHeading(context, size: 20),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Keyingi oy',
                      onPressed: canNext ? () => move(1) : null,
                      icon: const SihhatIcon('chevron-right'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    for (final d in ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'])
                      Expanded(
                        child: Text(
                          d,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: context.colors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                for (var week = 0; week < cells ~/ 7; week++)
                  Row(
                    children: [
                      for (var col = 0; col < 7; col++)
                        Expanded(
                          child: Builder(
                            builder: (c) {
                              final number = week * 7 + col - offset + 1;
                              if (number < 1 || number > days) {
                                return const SizedBox(height: 44);
                              }
                              final day = DateTime(
                                month.year,
                                month.month,
                                number,
                              );
                              final enabled =
                                  !day.isBefore(today) && !day.isAfter(last);
                              final endpoint = day == start || day == end;
                              final between =
                                  end != null &&
                                  day.isAfter(start) &&
                                  day.isBefore(end!);
                              return Container(
                                height: 44,
                                color: between ? c.colors.soft : null,
                                alignment: Alignment.center,
                                child: Semantics(
                                  selected: endpoint || between,
                                  child: TextButton(
                                    key: ValueKey(
                                      'booking-day-${dateOnly(day)}',
                                    ),
                                    onPressed: enabled ? () => pick(day) : null,
                                    style: TextButton.styleFrom(
                                      minimumSize: const Size(38, 38),
                                      padding: EdgeInsets.zero,
                                      backgroundColor: endpoint
                                          ? c.colors.primary
                                          : null,
                                      foregroundColor: endpoint
                                          ? c.colors.surface
                                          : c.colors.ink,
                                      shape: const CircleBorder(),
                                    ),
                                    child: Text(
                                      '$number',
                                      style: const TextStyle(fontSize: 14),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                const SizedBox(height: 14),
                ConceptInfo(
                  icon: 'calendar-days',
                  title:
                      dateOnly(start) +
                      (end == null
                          ? ' — ketish sanasini tanlang'
                          : ' — ${dateOnly(end!)}'),
                  text: end == null
                      ? 'Kamida bir tun tanlang.'
                      : '${end!.difference(start).inDays} tun',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

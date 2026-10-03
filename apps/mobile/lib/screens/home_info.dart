import 'package:flutter/material.dart';

import '../data/api.dart';
import '../data/home_feed.dart';
import '../widgets.dart';
import '../design.dart';

class HomeHighlights extends StatelessWidget {
  final Json? data;
  final bool loading, cached;
  final String region;
  final ValueChanged<String> selectRegion;
  const HomeHighlights({
    required this.data,
    required this.loading,
    required this.cached,
    required this.region,
    required this.selectRegion,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    final items = rows(data?['featured']);
    final prices =
        items
            .where((s) => s['from_amount'] != null)
            .map((s) => BigInt.parse(s['from_amount'].toString()))
            .toList()
          ..sort();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (loading && data == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: LinearProgressIndicator(minHeight: 2),
          ),
        if (data != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xffe3ebe6)),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _Stat(
                    Icons.spa_outlined,
                    '${data!['sanatorium_count'] ?? items.length} ta',
                    'Sanatoriya',
                  ),
                ),
                Expanded(
                  child: _Stat(
                    Icons.location_on_outlined,
                    '${(data!['regions'] as List? ?? []).length} ta',
                    'Hudud',
                  ),
                ),
                if (prices.isNotEmpty)
                  Expanded(
                    child: _Stat(
                      Icons.payments_outlined,
                      money(prices.first),
                      'Tariflar ... dan',
                    ),
                  ),
              ],
            ),
          ),
          if (cached)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'Saqlangan ma’lumot · ${_updated(data!['generated_at'])}. Narx va mavjudlik bron hisobida yangilanadi.',
                style: const TextStyle(fontSize: 11, color: Colors.black54),
              ),
            ),
          if ((data!['regions'] as List? ?? []).isNotEmpty) ...[
            const SizedBox(height: 18),
            const Text(
              'Hudud bo‘yicha tanlang',
              style: TextStyle(fontWeight: FontWeight.w700, color: ink),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: const Text('Barchasi'),
                      selected: region.isEmpty,
                      onSelected: (_) => selectRegion(''),
                    ),
                  ),
                  ...(data!['regions'] as List).map(
                    (r) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(r.toString()),
                        selected: region == r,
                        onSelected: (_) => selectRegion(r.toString()),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
        const SizedBox(height: 18),
        const SectionTitle(
          'Sanatoriyalarni kashf eting',
          subtitle: 'Dam olish uchun o‘zingizga mos joyni tanlang',
        ),
        const SizedBox(height: 10),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  final IconData icon;
  final String value, label;
  const _Stat(this.icon, this.value, this.label);
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, size: 20, color: green),
      const SizedBox(height: 7),
      Text(
        value,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          color: ink,
        ),
      ),
      const SizedBox(height: 3),
      Text(label, style: const TextStyle(fontSize: 11, color: muted)),
    ],
  );
}

String _updated(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return '';
  return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}

class HomeUpdates extends StatelessWidget {
  final Api api;
  final Json? data;
  const HomeUpdates({required this.api, required this.data, super.key});
  @override
  Widget build(BuildContext context) {
    final news = rows(data?['news']);
    final tips = data?['tips'] is List && (data!['tips'] as List).isNotEmpty
        ? rows(data!['tips'])
        : homeTips;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        const Text(
          'Yangiliklar',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: ink,
          ),
        ),
        const SizedBox(height: 12),
        if (news.isEmpty)
          const Card(
            child: ListTile(
              leading: Icon(Icons.newspaper_outlined, color: green),
              title: Text('Yangi e’lonlar shu yerda ko‘rinadi.'),
              subtitle: Text(
                'Sihhat.uz va sanatoriyalar haqidagi yangiliklar.',
              ),
            ),
          ),
        ...news.map(
          (article) => Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const Icon(Icons.newspaper_rounded, color: green),
              title: Text(
                article['title'],
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '${article['summary']}\n${_updated(article['published_at'])}',
                ),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ArticleScreen(api, article['id']),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Foydali tavsiyalar',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: ink,
          ),
        ),
        const SizedBox(height: 12),
        ...tips
            .take(5)
            .map(
              (tip) => Card(
                child: ExpansionTile(
                  leading: const Icon(
                    Icons.lightbulb_outline_rounded,
                    color: green,
                  ),
                  title: Text(
                    tip['title'],
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                  expandedCrossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tip['body'] ?? tip['summary'],
                      style: const TextStyle(height: 1.7),
                    ),
                  ],
                ),
              ),
            ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: pale,
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bron qilish — 3 qadam',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: ink,
                ),
              ),
              SizedBox(height: 10),
              Text(
                '1. Sanatoriya, sana va xonani tanlang.\n2. Hisob va bekor qilish shartlarini tekshiring.\n3. To‘lovni bajaring va bron holatini kuzating.',
                style: TextStyle(height: 1.9),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class ArticleScreen extends StatelessWidget {
  final Api api;
  final String id;
  const ArticleScreen(this.api, this.id, {super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Yangilik')),
    body: AsyncContent(
      load: () => api.send('/catalog/news/$id'),
      builder: (v) {
        final a = asJson(v);
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              a['title'],
              style: const TextStyle(
                fontSize: 27,
                fontWeight: FontWeight.w700,
                color: ink,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _updated(a['published_at']),
              style: const TextStyle(color: Colors.black54, fontSize: 12),
            ),
            const SizedBox(height: 24),
            SelectableText(
              a['body'],
              style: const TextStyle(fontSize: 16, height: 1.8),
            ),
          ],
        );
      },
    ),
  );
}

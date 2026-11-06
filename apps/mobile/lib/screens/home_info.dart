import 'package:flutter/material.dart';

import '../data/api.dart';
import '../data/home_feed.dart';
import '../widgets.dart';
import '../design.dart';
import '../concept_ui.dart';
import '../motion.dart';
import '../neon.dart';

String _updated(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return '';
  return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
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
        if (news.isNotEmpty) ...[
          NeonSectionHeader(
            'Yangiliklar',
            icon: Icons.auto_awesome_rounded,
            onAll: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => NewsScreen(api, news)),
            ),
          ),
          Reveal(
            child: NewsCard(api: api, article: news.first),
          ),
        ],
        const SizedBox(height: 4),
        Reveal(
          index: 1,
          child: ConceptCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => TipsScreen(tips)),
            ),
            child: Row(
              children: [
                const NeonGlyph(
                  Icons.lightbulb_rounded,
                  size: 26,
                  color: Color(0xffffc83d),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Foydali tavsiyalar',
                    style: conceptHeading(context, size: 16),
                  ),
                ),
                SihhatIcon('chevron-right', color: context.colors.ink),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

/// News card from the design: megaphone tile, "Yangi" badge, title, date.
class NewsCard extends StatelessWidget {
  final Api api;
  final Json article;
  const NewsCard({required this.api, required this.article, super.key});
  @override
  Widget build(BuildContext context) => ConceptCard(
    padding: const EdgeInsets.all(14),
    onTap: () => Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ArticleScreen(api, article['id'])),
    ),
    child: Row(
      children: [
        const PulseGlow(
          strength: .6,
          borderRadius: BorderRadius.all(Radius.circular(18)),
          child: GlyphTile(Icons.campaign_rounded, size: 62),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const ConceptBadge('Yangi'),
              const SizedBox(height: 6),
              Text(
                article['title'] ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: conceptHeading(context, size: 15),
              ),
              if (_updated(article['published_at']).isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    _updated(article['published_at']),
                    style: TextStyle(color: context.colors.muted, fontSize: 11),
                  ),
                ),
            ],
          ),
        ),
        SihhatIcon('chevron-right', color: context.colors.primary),
      ],
    ),
  );
}

class NewsScreen extends StatelessWidget {
  final Api api;
  final List<Json> news;
  const NewsScreen(this.api, this.news, {super.key});
  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Yangiliklar',
    subtitle: 'Sihhat.uz yangilanishlari',
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        for (final (i, article) in news.indexed)
          Reveal(
            index: i,
            child: NewsCard(api: api, article: article),
          ),
      ],
    ),
  );
}

class TipsScreen extends StatelessWidget {
  final List<Json> tips;
  const TipsScreen(this.tips, {super.key});
  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Foydali tavsiyalar',
    subtitle: 'Bron va safar bo‘yicha maslahatlar',
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        for (final (i, tip) in tips.indexed)
          Reveal(
            index: i,
            child: ConceptCard(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const NeonGlyph(
                    Icons.lightbulb_rounded,
                    size: 24,
                    color: Color(0xffffc83d),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tip['title'] ?? '',
                          style: conceptHeading(context, size: 16),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          (tip['body'] ?? tip['summary'] ?? '').toString(),
                          style: TextStyle(
                            color: context.colors.muted,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

// Section title with a neon icon (no "see all" action).
class HomeSectionTitle extends StatelessWidget {
  final String title, icon;
  const HomeSectionTitle(this.title, {required this.icon, super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 20, bottom: 10),
    child: Row(
      children: [
        SihhatIcon(icon, color: context.colors.primary, size: 22),
        const SizedBox(width: 8),
        Expanded(child: Text(title, style: conceptHeading(context, size: 18))),
      ],
    ),
  );
}

class ArticleScreen extends StatelessWidget {
  final Api api;
  final String id;
  const ArticleScreen(this.api, this.id, {super.key});
  @override
  Widget build(BuildContext context) => ConceptPage(
    title: 'Yangilik',
    body: AsyncContent(
      load: () => api.send('/catalog/news/$id'),
      builder: (v) {
        final a = asJson(v);
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(a['title'], style: conceptHeading(context, size: 28)),
            const SizedBox(height: 12),
            ConceptRow('calendar-days', _updated(a['published_at'])),
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

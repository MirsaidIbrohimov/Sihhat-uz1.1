import 'package:flutter/material.dart';

import '../data/api.dart';
import '../data/home_feed.dart';
import '../widgets.dart';
import '../design.dart';

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
          const SizedBox(height: 24),
          const SectionTitle('Yangiliklar'),
          const SizedBox(height: 12),
        ],
        ...news
            .take(2)
            .map(
              (article) => Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: Icon(
                    Icons.newspaper_rounded,
                    color: context.colors.primary,
                  ),
                  title: Text(
                    article['title'],
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(article['summary'] ?? ''),
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
        if (news.length > 2)
          Card(
            child: ExpansionTile(
              title: const Text('Boshqa yangiliklar'),
              children: news
                  .skip(2)
                  .map(
                    (article) => ListTile(
                      title: Text(article['title']),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ArticleScreen(api, article['id']),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        const SizedBox(height: 16),
        Card(
          child: ExpansionTile(
            leading: Icon(
              Icons.lightbulb_outline_rounded,
              color: context.colors.primary,
            ),
            title: const Text('Foydali tavsiyalar'),
            children: tips
                .map(
                  (tip) => ListTile(
                    title: Text(
                      tip['title'],
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 6, bottom: 10),
                      child: Text(
                        tip['body'] ?? tip['summary'],
                        style: const TextStyle(height: 1.7),
                      ),
                    ),
                  ),
                )
                .toList(),
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
              style: TextStyle(
                fontSize: 27,
                fontWeight: FontWeight.w700,
                color: context.colors.ink,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _updated(a['published_at']),
              style: TextStyle(color: context.colors.muted, fontSize: 12),
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

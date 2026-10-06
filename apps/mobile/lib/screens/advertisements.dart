import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import '../design.dart';
import 'catalog.dart';

void advertisementEvent(Api api, Json ad, String kind) {
  api
      .send(
        '/catalog/ads/${ad['id']}/events',
        method: 'POST',
        body: {'kind': kind},
      )
      .catchError((_) => null);
}

Uri? advertisementLink(Json ad) {
  final target = ad['target'] is Map
      ? asJson(ad['target'])
      : <String, dynamic>{};
  final value = target['url'] ?? ad['target_url'];
  if (target['kind'] != 'URL' && ad['target_kind'] != 'URL') {
    return null;
  }
  final uri = Uri.tryParse(value?.toString() ?? '');
  if (uri == null ||
      uri.scheme != 'https' ||
      !uri.host.contains('.') ||
      uri.userInfo.isNotEmpty ||
      uri.hasPort && uri.port != 443) {
    return null;
  }
  return uri;
}

Future<void> openAdvertisement(BuildContext context, Api api, Json ad) async {
  advertisementEvent(api, ad, 'CLICK');
  final target = ad['target'] is Map
      ? asJson(ad['target'])
      : <String, dynamic>{};
  if (target['kind'] == 'URL' || ad['target_kind'] == 'URL') {
    final link = advertisementLink(ad);
    try {
      if (link == null ||
          !await launchUrl(link, mode: LaunchMode.externalApplication)) {
        throw StateError('Link unavailable');
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Havolani ochib bo‘lmadi. Qayta urinib ko‘ring.'),
          ),
        );
      }
    }
  } else {
    final id =
        target['sanatorium_id'] ??
        ad['target_sanatorium_id'] ??
        ad['sanatorium_id'];
    if (context.mounted && id != null) {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => SanatoriumScreen(api, id)),
      );
    }
  }
}

class AdvertisementCard extends StatefulWidget {
  final Api api;
  final Json ad;
  final VoidCallback onOpen;
  const AdvertisementCard({
    super.key,
    required this.api,
    required this.ad,
    required this.onOpen,
  });
  @override
  State<AdvertisementCard> createState() => _AdvertisementCardState();
}

class _AdvertisementCardState extends State<AdvertisementCard> {
  @override
  void initState() {
    super.initState();
    advertisementEvent(widget.api, widget.ad, 'IMPRESSION');
  }

  @override
  Widget build(BuildContext context) {
    final ad = widget.ad;
    final discount = ad['has_discount'] == true;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: widget.onOpen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (ad['image_asset_id'] != null)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
                child: Image.network(
                  widget.api.image(ad['image_asset_id']),
                  height: 190,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    height: 130,
                    color: context.colors.soft,
                    child: Icon(
                      Icons.spa_outlined,
                      size: 48,
                      color: context.colors.primary,
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'REKLAMA',
                        style: TextStyle(
                          color: context.colors.primary,
                          fontSize: 10,
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (discount) ...[
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: context.colors.soft,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            ad['discount_percent'] != null
                                ? '${ad['discount_percent']}% chegirma'
                                : 'Chegirma',
                            style: TextStyle(
                              color: context.colors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    ad['title']?.toString() ?? '',
                    style: const TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if ((ad['text'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      ad['text'],
                      style: TextStyle(
                        color: context.colors.muted,
                        height: 1.5,
                      ),
                    ),
                  ],
                  if (discount &&
                      (ad['discount_text'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      ad['discount_text'],
                      style: TextStyle(
                        color: context.colors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text(
                        'Taklifni ko‘rish',
                        style: TextStyle(
                          color: context.colors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Icon(Icons.arrow_forward, color: context.colors.primary),
                    ],
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

Future<void> showEntranceAdvertisement(BuildContext context, Api api) async {
  try {
    final list = rows(
      await api.send('/catalog/ads').timeout(const Duration(seconds: 8)),
    ).where((ad) => ad['placement'] == 'POPUP').toList();
    if (list.isEmpty ||
        !context.mounted ||
        ModalRoute.of(context)?.isCurrent == false) {
      return;
    }
    final ad = list.first;
    final open = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => Dialog(
        insetPadding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 520,
            maxHeight: MediaQuery.sizeOf(dialogContext).height * .86,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 20, right: 8, top: 8),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Siz uchun taklif',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Reklamani yopish',
                        onPressed: () => Navigator.pop(dialogContext, false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                ),
                AdvertisementCard(
                  api: api,
                  ad: ad,
                  onOpen: () => Navigator.pop(dialogContext, true),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (open == true && context.mounted) {
      await openAdvertisement(context, api, ad);
    }
  } catch (_) {
    /* Advertisements never block entering the application. */
  }
}

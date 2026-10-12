import 'package:flutter/material.dart';

import 'data/api.dart';
import 'design.dart';
import 'widgets.dart';
import 'concept_ui.dart';

class SanatoriumGallery extends StatefulWidget {
  final Api api;
  final List<String> photos;
  final bool fullscreen;
  final int initialPage;
  const SanatoriumGallery(
    this.api,
    this.photos, {
    this.fullscreen = false,
    this.initialPage = 0,
    super.key,
  });
  @override
  State<SanatoriumGallery> createState() => _SanatoriumGalleryState();
}

class _SanatoriumGalleryState extends State<SanatoriumGallery> {
  late final PageController controller;
  late int current;
  @override
  void initState() {
    super.initState();
    current = widget.initialPage;
    controller = PageController(initialPage: current);
  }

  @override
  void didUpdateWidget(covariant SanatoriumGallery oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.photos.join(',') != widget.photos.join(',')) {
      current = 0;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && controller.hasClients) controller.jumpToPage(0);
      });
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void move(int direction) => controller.animateToPage(
    (current + direction + widget.photos.length) % widget.photos.length,
    duration: const Duration(milliseconds: 250),
    curve: Curves.easeOut,
  );

  @override
  Widget build(BuildContext context) => SizedBox(
    height: widget.fullscreen ? double.infinity : 230,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            key: const ValueKey('sanatorium-gallery'),
            controller: controller,
            itemCount: widget.photos.length,
            onPageChanged: (n) => setState(() => current = n),
            itemBuilder: (_, n) => Semantics(
              label: 'Sanatoriya surati ${n + 1}, jami ${widget.photos.length}',
              child: GestureDetector(
                onTap: widget.fullscreen
                    ? null
                    : () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ConceptPage(
                            title: 'Suratlar',
                            body: SanatoriumGallery(
                              widget.api,
                              widget.photos,
                              fullscreen: true,
                              initialPage: current,
                            ),
                          ),
                        ),
                      ),
                child: InteractiveViewer(
                  minScale: 1,
                  maxScale: widget.fullscreen ? 4 : 1,
                  child: SanatoriumPhoto(
                    api: widget.api,
                    id: widget.photos[n],
                    fit: widget.fullscreen ? BoxFit.contain : BoxFit.cover,
                    fallback: ColoredBox(
                      color: context.colors.soft,
                      child: SihhatIcon(
                        'building-2',
                        size: 70,
                        color: context.colors.primary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          if (widget.photos.length > 1) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: IconButton.filledTonal(
                  key: const ValueKey('gallery-previous'),
                  tooltip: 'Oldingi surat',
                  onPressed: () => move(-1),
                  icon: const SihhatIcon('chevron-left'),
                ),
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: IconButton.filledTonal(
                  key: const ValueKey('gallery-next'),
                  tooltip: 'Keyingi surat',
                  onPressed: () => move(1),
                  icon: const SihhatIcon('chevron-right'),
                ),
              ),
            ),
          ],
          Positioned(
            right: 12,
            bottom: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${current + 1} / ${widget.photos.length}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

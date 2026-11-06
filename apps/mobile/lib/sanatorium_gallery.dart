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
    height: widget.fullscreen ? double.infinity : 240,
    child: DecoratedBox(
      position: DecorationPosition.foreground,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: widget.fullscreen
            ? null
            : Border.all(color: neon.withValues(alpha: .4)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          fit: StackFit.expand,
          children: [
            PageView.builder(
              key: const ValueKey('sanatorium-gallery'),
              controller: controller,
              itemCount: widget.photos.length,
              onPageChanged: (n) => setState(() => current = n),
              itemBuilder: (_, n) => Semantics(
                label:
                    'Sanatoriya surati ${n + 1}, jami ${widget.photos.length}',
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
                    child: AnimatedBuilder(
                      animation: controller,
                      // Parallax: the photo moves slower than the page.
                      builder: (context, child) {
                        final page =
                            controller.hasClients &&
                                controller.position.haveDimensions
                            ? controller.page ?? current.toDouble()
                            : current.toDouble();
                        return ClipRect(
                          child: Transform.translate(
                            offset: Offset((page - n) * 90, 0),
                            child: Transform.scale(
                              scale: widget.fullscreen ? 1 : 1.12,
                              child: child,
                            ),
                          ),
                        );
                      },
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
            ),
            if (widget.photos.length > 1) ...[
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: IconButton.filledTonal(
                    key: const ValueKey('gallery-previous'),
                    style: IconButton.styleFrom(
                      backgroundColor: abyss.withValues(alpha: .65),
                      foregroundColor: Colors.white,
                      side: BorderSide(color: neon.withValues(alpha: .45)),
                    ),
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
                    style: IconButton.styleFrom(
                      backgroundColor: abyss.withValues(alpha: .65),
                      foregroundColor: Colors.white,
                      side: BorderSide(color: neon.withValues(alpha: .45)),
                    ),
                    tooltip: 'Keyingi surat',
                    onPressed: () => move(1),
                    icon: const SihhatIcon('chevron-right'),
                  ),
                ),
              ),
            ],
            if (widget.photos.length > 1 && widget.photos.length <= 12)
              Positioned(
                left: 0,
                right: 0,
                bottom: 16,
                child: IgnorePointer(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var i = 0; i < widget.photos.length; i++)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutCubic,
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: i == current ? 20 : 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: i == current
                                ? neon
                                : Colors.white.withValues(alpha: .55),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            Positioned(
              right: 12,
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: abyss.withValues(alpha: .7),
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
    ),
  );
}

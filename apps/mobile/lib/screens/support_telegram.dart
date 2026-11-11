import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../concept_ui.dart';
import '../design.dart';
import '../motion.dart';

/// Shared Telegram-inspired palette harmonised with Sihhat.uz light/dark themes.
class TgThemeColors {
  final bool dark;
  final Color wallpaperTop;
  final Color wallpaperBottom;
  final Color wallpaperPattern;
  final Color panelBg;
  final Color ownBubbleStart;
  final Color ownBubbleEnd;
  final Color ownText;
  final Color ownMeta;
  final Color incomingBubble;
  final Color incomingBorder;
  final Color incomingText;
  final Color incomingMeta;
  final Color datePillBg;
  final Color datePillText;
  final Color danger;

  const TgThemeColors({
    required this.dark,
    required this.wallpaperTop,
    required this.wallpaperBottom,
    required this.wallpaperPattern,
    required this.panelBg,
    required this.ownBubbleStart,
    required this.ownBubbleEnd,
    required this.ownText,
    required this.ownMeta,
    required this.incomingBubble,
    required this.incomingBorder,
    required this.incomingText,
    required this.incomingMeta,
    required this.datePillBg,
    required this.datePillText,
    required this.danger,
  });

  factory TgThemeColors.of(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    if (dark) {
      return TgThemeColors(
        dark: true,
        wallpaperTop: const Color(0xff061f1a),
        wallpaperBottom: const Color(0xff031310),
        wallpaperPattern: neon.withValues(alpha: .045),
        panelBg: const Color(0xff092722),
        ownBubbleStart: const Color(0xff157961),
        ownBubbleEnd: const Color(0xff0e5f4c),
        ownText: const Color(0xfff4fffb),
        ownMeta: const Color(0xffb5f5e5),
        incomingBubble: const Color(0xff0b2f28),
        incomingBorder: neon.withValues(alpha: .16),
        incomingText: const Color(0xffeaf8f3),
        incomingMeta: const Color(0xff8eb9ad),
        datePillBg: const Color(0xff051a16).withValues(alpha: .82),
        datePillText: const Color(0xffb5dbd0),
        danger: const Color(0xffff6b6b),
      );
    }
    return TgThemeColors(
      dark: false,
      wallpaperTop: const Color(0xffe3f1ec),
      wallpaperBottom: const Color(0xffd5e9e1),
      wallpaperPattern: forest.withValues(alpha: .055),
      panelBg: Colors.white,
      ownBubbleStart: const Color(0xffcff5e7),
      ownBubbleEnd: const Color(0xffbcecd9),
      ownText: midnight,
      ownMeta: const Color(0xff1b735c),
      incomingBubble: Colors.white,
      incomingBorder: const Color(0xffcfe3db),
      incomingText: midnight,
      incomingMeta: const Color(0xff607a71),
      datePillBg: midnight.withValues(alpha: .12),
      datePillText: midnight,
      danger: const Color(0xffcf3030),
    );
  }
}

bool isSupportTicketClosed(dynamic status) {
  final upper = status?.toString().trim().toUpperCase() ?? '';
  return upper == 'CLOSED' || upper == 'RESOLVED';
}

String supportStatusLabel(dynamic status) {
  final upper = status?.toString().trim().toUpperCase() ?? '';
  if (upper == 'CLOSED' || upper == 'RESOLVED') return 'Yopilgan';
  if (upper == 'IN_PROGRESS') return 'Jarayonda';
  return 'Ochiq';
}

String supportShortTime(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return '';
  final now = DateTime.now();
  final hhmm =
      '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  if (date.year == now.year && date.month == now.month && date.day == now.day) {
    return hhmm;
  }
  final yesterday = now.subtract(const Duration(days: 1));
  if (date.year == yesterday.year &&
      date.month == yesterday.month &&
      date.day == yesterday.day) {
    return 'Kecha';
  }
  final dd = date.day.toString().padLeft(2, '0');
  final mm = date.month.toString().padLeft(2, '0');
  return '$dd.$mm';
}

String supportClockTime(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return '';
  return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}

String supportDayKey(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return '';
  return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

String supportDayLabel(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return '';
  final now = DateTime.now();
  if (date.year == now.year && date.month == now.month && date.day == now.day) {
    return 'Bugun';
  }
  final yesterday = now.subtract(const Duration(days: 1));
  if (date.year == yesterday.year &&
      date.month == yesterday.month &&
      date.day == yesterday.day) {
    return 'Kecha';
  }
  final dd = date.day.toString().padLeft(2, '0');
  final mm = date.month.toString().padLeft(2, '0');
  return '$dd.$mm.${date.year}';
}

List<Color> supportAvatarGradient(String seed) {
  const palettes = [
    [Color(0xff109b7c), Color(0xff065c4a)],
    [Color(0xff0ea5e9), Color(0xff0369a1)],
    [Color(0xff8b5cf6), Color(0xff5b21b6)],
    [Color(0xfff59e0b), Color(0xffb45309)],
    [Color(0xffec4899), Color(0xff9d174d)],
  ];
  var hash = 0;
  for (final code in seed.codeUnits) {
    hash = (hash * 31 + code) & 0x7fffffff;
  }
  return palettes[hash % palettes.length];
}

class TgAvatar extends StatelessWidget {
  final String label;
  final double size;
  final bool closed;
  final bool showStatusDot;

  const TgAvatar({
    required this.label,
    this.size = 48,
    this.closed = false,
    this.showStatusDot = true,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final trimmed = label.trim();
    final letter = trimmed.isNotEmpty ? trimmed[0].toUpperCase() : 'S';
    final colors = supportAvatarGradient(trimmed);
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: size,
            height: size,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: colors,
              ),
              boxShadow: [
                BoxShadow(
                  color: colors.first.withValues(alpha: .28),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Text(
              letter,
              style: TextStyle(
                fontFamily: 'Manrope',
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: size * .4,
              ),
            ),
          ),
          if (showStatusDot)
            Positioned(
              right: -1,
              bottom: -1,
              child: Container(
                width: size * .32,
                height: size * .32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: closed
                      ? context.colors.muted
                      : const Color(0xff22c55e),
                  border: Border.all(color: context.colors.surface, width: 2),
                ),
                child: closed
                    ? Icon(
                        Icons.lock_rounded,
                        size: size * .18,
                        color: Colors.white,
                      )
                    : null,
              ),
            ),
        ],
      ),
    );
  }
}

class TgFolderTabs extends StatelessWidget {
  final String activeFolder;
  final int openCount;
  final int closedCount;
  final ValueChanged<String> onSelect;

  const TgFolderTabs({
    required this.activeFolder,
    required this.openCount,
    required this.closedCount,
    required this.onSelect,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.surface.withValues(alpha: .9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: _FolderTab(
              label: 'Ochiq',
              icon: Icons.chat_bubble_outline_rounded,
              count: openCount,
              selected: activeFolder == 'open',
              onTap: () => onSelect('open'),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: _FolderTab(
              label: 'Yopilgan',
              icon: Icons.archive_outlined,
              count: closedCount,
              selected: activeFolder == 'closed',
              onTap: () => onSelect('closed'),
            ),
          ),
        ],
      ),
    );
  }
}

class _FolderTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  const _FolderTab({
    required this.label,
    required this.icon,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final activeBg = dark ? neon : forest;
    final activeInk = dark ? abyss : Colors.white;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: selected ? activeBg : Colors.transparent,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: selected ? activeInk : context.colors.muted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'DMSans',
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: selected ? activeInk : context.colors.ink,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(999),
                color: selected
                    ? activeInk.withValues(alpha: .16)
                    : context.colors.soft,
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: selected ? activeInk : context.colors.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TgChatListTile extends StatelessWidget {
  final String title;
  final String preview;
  final String status;
  final String timeLabel;
  final VoidCallback onTap;

  const TgChatListTile({
    required this.title,
    required this.preview,
    required this.status,
    required this.timeLabel,
    required this.onTap,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final closed = isSupportTicketClosed(status);
    final statusText = supportStatusLabel(status);
    final c = context.colors;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: c.surface.withValues(alpha: .92),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: c.border),
          ),
          child: Row(
            children: [
              TgAvatar(label: title, closed: closed),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: conceptHeading(context, size: 15),
                          ),
                        ),
                        if (timeLabel.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Text(
                            timeLabel,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: c.muted,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            preview.isNotEmpty ? preview : 'Suhbatni ochish',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 13, color: c.muted),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            color: closed
                                ? c.muted.withValues(alpha: .14)
                                : c.soft,
                          ),
                          child: Text(
                            statusText,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: closed ? c.muted : c.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class TgWallpaperBackground extends StatelessWidget {
  final Widget child;
  const TgWallpaperBackground({required this.child, super.key});

  @override
  Widget build(BuildContext context) {
    final tg = TgThemeColors.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [tg.wallpaperTop, tg.wallpaperBottom],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          IgnorePointer(
            child: CustomPaint(
              painter: _TgWallpaperPainter(tg.wallpaperPattern),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class _TgWallpaperPainter extends CustomPainter {
  final Color color;
  _TgWallpaperPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    const step = 64.0;
    for (double y = 18; y < size.height + step; y += step) {
      for (double x = 18; x < size.width + step; x += step) {
        final offsetX = ((y ~/ step).isOdd) ? step * .45 : 0.0;
        final cx = x + offsetX;
        canvas.drawCircle(Offset(cx, y), 6, paint);
        canvas.drawArc(
          Rect.fromCircle(center: Offset(cx + 26, y + 22), radius: 7),
          0,
          math.pi * 1.4,
          false,
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _TgWallpaperPainter old) => old.color != color;
}

class TgDateSeparator extends StatelessWidget {
  final String label;
  const TgDateSeparator(this.label, {super.key});

  @override
  Widget build(BuildContext context) {
    final tg = TgThemeColors.of(context);
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: tg.datePillBg,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: context.colors.border.withValues(alpha: .5),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: tg.datePillText,
          ),
        ),
      ),
    );
  }
}

class TgMessageBubble extends StatelessWidget {
  final String text;
  final String? imageUrl;
  final String? author;
  final String time;
  final bool own;
  final bool isEdited;
  final bool canModify;
  final bool isDeleting;
  final VoidCallback? onOpenMenu;
  final VoidCallback? onPreviewImage;

  const TgMessageBubble({
    required this.text,
    required this.time,
    this.imageUrl,
    this.author,
    this.own = false,
    this.isEdited = false,
    this.canModify = false,
    this.isDeleting = false,
    this.onOpenMenu,
    this.onPreviewImage,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final tg = TgThemeColors.of(context);
    final bubble = Container(
      margin: const EdgeInsets.only(bottom: 8),
      constraints: BoxConstraints(
        maxWidth: MediaQuery.sizeOf(context).width * .78,
        minWidth: 96,
      ),
      decoration: BoxDecoration(
        color: own ? null : tg.incomingBubble,
        gradient: own
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [tg.ownBubbleStart, tg.ownBubbleEnd],
              )
            : null,
        border: own ? null : Border.all(color: tg.incomingBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: tg.dark ? .22 : .06),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(18),
          topRight: const Radius.circular(18),
          bottomLeft: Radius.circular(own ? 18 : 5),
          bottomRight: Radius.circular(own ? 5 : 18),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(own ? 18 : 5),
            bottomRight: Radius.circular(own ? 5 : 18),
          ),
          onLongPress: isDeleting ? null : onOpenMenu,
          onTap: canModify && !isDeleting ? onOpenMenu : null,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(13, 9, 12, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!own && author != null && author!.isNotEmpty) ...[
                  Text(
                    author!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: context.colors.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                if (imageUrl != null && imageUrl!.isNotEmpty) ...[
                  GestureDetector(
                    onTap: onPreviewImage,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 240),
                        child: _BubbleImage(imageUrl!),
                      ),
                    ),
                  ),
                  if (text.isNotEmpty && text != '📷 Rasm')
                    const SizedBox(height: 6),
                ],
                if (text.isNotEmpty &&
                    !(imageUrl != null &&
                        imageUrl!.isNotEmpty &&
                        text == '📷 Rasm'))
                  Text(
                    text,
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.42,
                      color: own ? tg.ownText : tg.incomingText,
                    ),
                  ),
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (isDeleting) ...[
                      SizedBox(
                        width: 11,
                        height: 11,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.6,
                          color: own ? tg.ownMeta : tg.incomingMeta,
                        ),
                      ),
                      const SizedBox(width: 5),
                    ],
                    if (isEdited) ...[
                      Text(
                        'tahrirlangan',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontStyle: FontStyle.italic,
                          color: own ? tg.ownMeta : tg.incomingMeta,
                        ),
                      ),
                      const SizedBox(width: 5),
                    ],
                    if (time.isNotEmpty)
                      Text(
                        time,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: own ? tg.ownMeta : tg.incomingMeta,
                        ),
                      ),
                    if (own) ...[
                      const SizedBox(width: 4),
                      Icon(Icons.done_all_rounded, size: 15, color: tg.ownMeta),
                    ],
                    if (canModify && !isDeleting) ...[
                      const SizedBox(width: 4),
                      Icon(
                        Icons.more_horiz_rounded,
                        size: 14,
                        color: tg.ownMeta.withValues(alpha: .85),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );

    return Reveal(
      offset: Offset(own ? .12 : -.12, .03),
      child: Align(
        alignment: own ? Alignment.centerRight : Alignment.centerLeft,
        child: Opacity(opacity: isDeleting ? .55 : 1, child: bubble),
      ),
    );
  }
}

class _BubbleImage extends StatelessWidget {
  final String url;
  const _BubbleImage(this.url);

  @override
  Widget build(BuildContext context) {
    if (url.startsWith('data:')) {
      try {
        final bytes = base64Decode(url.split(',').last);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        );
      } catch (_) {
        return const SizedBox.shrink();
      }
    }
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => const SizedBox.shrink(),
    );
  }
}

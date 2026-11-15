import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../concept_ui.dart';
import '../design.dart';
import '../widgets.dart';
import 'api.dart';

class InstalledAppVersion {
  final String version;
  final int buildNumber;

  const InstalledAppVersion(this.version, this.buildNumber);

  String get displayLabel =>
      version.isEmpty ? 'build $buildNumber' : 'v$version (build $buildNumber)';
}

class AppUpdateInfo {
  final String version;
  final int buildNumber;
  final String downloadUrl;
  final String title;
  final String message;
  final String? releaseNotes;
  final String? tag;

  const AppUpdateInfo({
    required this.version,
    required this.buildNumber,
    required this.downloadUrl,
    required this.title,
    required this.message,
    this.releaseNotes,
    this.tag,
  });

  static AppUpdateInfo? fromResponse(dynamic raw, int installedBuild) {
    if (raw is! Map) return null;
    if (raw['available'] != true) return null;
    final buildRaw = raw['build_number'];
    final remoteBuild = buildRaw is int
        ? buildRaw
        : int.tryParse(buildRaw?.toString() ?? '');
    if (remoteBuild == null || remoteBuild <= installedBuild) return null;

    final version = raw['version']?.toString().trim() ?? '';
    if (version.isEmpty) return null;

    final urlRaw = raw['download_url']?.toString().trim() ?? '';
    final uri = Uri.tryParse(urlRaw);
    if (uri == null || uri.scheme != 'https') return null;

    final title = raw['title']?.toString().trim() ?? '';
    final message = raw['message']?.toString().trim() ?? '';
    final notesRaw = raw['release_notes']?.toString().trim();

    return AppUpdateInfo(
      version: version,
      buildNumber: remoteBuild,
      downloadUrl: urlRaw,
      title: title.isNotEmpty ? title : 'Ilova yangilandi (v$version)',
      message: message.isNotEmpty ? message : 'Sihhat.uz ilovasining yangi versiyasi chiqdi. Eng so‘nggi versiyani yuklab oling.',
      releaseNotes: notesRaw != null && notesRaw.isNotEmpty ? notesRaw : null,
      tag: raw['tag']?.toString(),
    );
  }
}

class AppUpdateCheckResult {
  final InstalledAppVersion? installed;
  final AppUpdateInfo? update;

  const AppUpdateCheckResult({this.installed, this.update});
}

typedef InstalledVersionLoader = Future<InstalledAppVersion?> Function();
typedef UrlLauncherCallback = Future<bool> Function(Uri uri);

class AppUpdateService {
  static const MethodChannel _channel = MethodChannel(
    'uz.sihhat/notifications',
  );
  static const _dismissedBuildKey = 'update_dismissed_build';
  static const _dismissedAtKey = 'update_dismissed_at';

  static Future<InstalledAppVersion?> readInstalledVersion() async {
    try {
      final raw = await _channel.invokeMethod<dynamic>('getAppVersion');
      if (raw is! Map) return null;
      final version = raw['versionName']?.toString().trim() ?? '';
      final buildRaw = raw['buildNumber'];
      final buildNumber = buildRaw is int
          ? buildRaw
          : int.tryParse(buildRaw?.toString() ?? '');
      if (buildNumber == null || buildNumber <= 0) return null;
      Api.appBuildHeader = '$buildNumber';
      if (version.isNotEmpty) Api.appVersionHeader = version;
      return InstalledAppVersion(version, buildNumber);
    } catch (_) {
      return null;
    }
  }

  static Future<void> syncNativeConfig(String baseUrl) async {
    try {
      await _channel.invokeMethod<dynamic>('syncConfig', {'baseUrl': baseUrl});
    } catch (_) {}
  }

  static Future<AppUpdateCheckResult> checkForUpdate(
    Api api, {
    InstalledVersionLoader? readInstalled,
  }) async {
    final installed = await (readInstalled ?? readInstalledVersion)();
    if (installed == null || installed.buildNumber <= 0) {
      return AppUpdateCheckResult(installed: installed);
    }
    try {
      final response = await api.send(
        '/mobile/app-version?build=${installed.buildNumber}',
      );
      return AppUpdateCheckResult(
        installed: installed,
        update: AppUpdateInfo.fromResponse(response, installed.buildNumber),
      );
    } catch (_) {
      return AppUpdateCheckResult(installed: installed);
    }
  }

  static Future<bool> shouldShowPrompt(Api api, AppUpdateInfo update) async {
    try {
      final dismissedBuild = await api.store.read(_dismissedBuildKey);
      if (dismissedBuild != '${update.buildNumber}') return true;
      final rawAt = await api.store.read(_dismissedAtKey);
      final dismissedAt = rawAt == null ? null : DateTime.tryParse(rawAt);
      if (dismissedAt == null) return true;
      return DateTime.now().toUtc().difference(dismissedAt) >=
          const Duration(hours: 24);
    } catch (_) {
      return true;
    }
  }

  static Future<void> dismissPrompt(Api api, int buildNumber) async {
    try {
      await api.store.write(_dismissedBuildKey, '$buildNumber');
      await api.store.write(
        _dismissedAtKey,
        DateTime.now().toUtc().toIso8601String(),
      );
    } catch (_) {}
  }

  static Future<bool> launchDownload(
    BuildContext context,
    String rawUrl, {
    UrlLauncherCallback? launcher,
  }) async {
    final uri = Uri.tryParse(rawUrl.trim());
    if (uri == null || uri.scheme != 'https') {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Yuklab olish havolasi yaroqsiz.')),
        );
      }
      return false;
    }
    try {
      final ok = launcher != null
          ? await launcher(uri)
          : await launchUrl(uri, mode: LaunchMode.externalApplication) ||
                await launchUrl(uri, mode: LaunchMode.platformDefault);
      if (!ok && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Yuklab olish havolasini ochib bo‘lmadi.'),
          ),
        );
      }
      return ok;
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Yuklab olish havolasini ochib bo‘lmadi.'),
          ),
        );
      }
      return false;
    }
  }
}

Future<void> showAppUpdateDialog(
  BuildContext context,
  Api api,
  AppUpdateInfo update, {
  UrlLauncherCallback? launcher,
}) => showGlassDialog<void>(
  context: context,
  builder: (c) => AlertDialog(
    title: Column(
      children: [
        const IconTile('sparkles', size: 60, glow: true),
        const SizedBox(height: 16),
        Text(
          update.title,
          textAlign: TextAlign.center,
          style: conceptHeading(c, size: 22),
        ),
      ],
    ),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          update.message,
          textAlign: TextAlign.center,
          style: const TextStyle(height: 1.45),
        ),
        if (update.releaseNotes != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: c.colors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: c.colors.border),
            ),
            child: Text(
              update.releaseNotes!,
              style: TextStyle(
                color: c.colors.muted,
                fontSize: 12.5,
                height: 1.4,
              ),
            ),
          ),
        ],
      ],
    ),
    actions: [
      TextButton(
        onPressed: () {
          AppUpdateService.dismissPrompt(api, update.buildNumber);
          Navigator.pop(c);
        },
        child: const Text('Keyinroq'),
      ),
      FilledButton.icon(
        onPressed: () {
          Navigator.pop(c);
          AppUpdateService.launchDownload(
            context,
            update.downloadUrl,
            launcher: launcher,
          );
        },
        icon: const Icon(Icons.download_rounded, size: 18),
        label: const Text('Eng so‘nggi versiyani yuklash'),
      ),
    ],
  ),
);

class AppUpdateBanner extends StatelessWidget {
  final AppUpdateInfo update;
  final VoidCallback onDownload;

  const AppUpdateBanner({
    required this.update,
    required this.onDownload,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final c = context;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: c.colors.surface.withValues(alpha: .94),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: neon.withValues(alpha: .5)),
        boxShadow: [
          BoxShadow(
            color: neon.withValues(alpha: .1),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: c.colors.primary.withValues(alpha: .14),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(
              Icons.system_update_rounded,
              color: c.colors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Yangi versiya chiqdi (v${update.version})',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Eng so‘nggi versiyani yuklab oling',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: c.colors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: onDownload,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('Yuklash', style: TextStyle(fontSize: 12.5)),
          ),
        ],
      ),
    );
  }
}

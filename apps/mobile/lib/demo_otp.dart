import 'package:flutter/foundation.dart';

bool demoOtpAllowed(
  String baseUrl, {
  required bool enabled,
  bool debugMode = kDebugMode,
}) {
  if (!enabled) return false;
  if (debugMode) return true;
  final url = Uri.tryParse(baseUrl);
  return url != null &&
      url.scheme == 'https' &&
      url.host.isNotEmpty &&
      url.userInfo.isEmpty &&
      !url.hasQuery &&
      !url.hasFragment &&
      (url.path == '/demo-api' || url.path == '/api');
}

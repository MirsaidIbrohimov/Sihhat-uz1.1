import 'package:flutter/material.dart';

import 'app.dart';
import 'data/api.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    SihhatApp(
      api: Api(
        baseUrl: const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'https://sihhat-api.onrender.com',
        ),
      ),
      showDemoOtp: const bool.fromEnvironment('DEMO_OTP_ENABLED'),
    ),
  );
}

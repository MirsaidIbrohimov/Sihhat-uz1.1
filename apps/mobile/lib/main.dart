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
          defaultValue: 'http://10.0.2.2:4000',
        ),
      ),
      showDemoOtp: const bool.fromEnvironment('DEMO_OTP_ENABLED'),
    ),
  );
}

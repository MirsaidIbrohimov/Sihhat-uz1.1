import 'package:flutter_test/flutter_test.dart';
import 'package:sihhat_mobile/demo_otp.dart';

void main() {
  test('signed demo exposes OTP only on the isolated HTTPS demo API', () {
    expect(
      demoOtpAllowed(
        'https://sihhat.uz/demo-api',
        enabled: true,
        debugMode: false,
      ),
      isTrue,
    );
    for (final url in [
      'https://sihhat.uz/api',
      'http://sihhat.uz/demo-api',
      'https://sihhat.uz/demo-api?x=1',
      'https://user:pass@sihhat.uz/demo-api',
    ]) {
      expect(demoOtpAllowed(url, enabled: true, debugMode: false), isFalse);
    }
    expect(
      demoOtpAllowed(
        'https://sihhat.uz/demo-api',
        enabled: false,
        debugMode: false,
      ),
      isFalse,
    );
    expect(
      demoOtpAllowed('http://localhost:4000', enabled: true, debugMode: true),
      isTrue,
    );
  });
}

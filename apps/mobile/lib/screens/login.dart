import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../branding.dart';
import '../appearance.dart';

class LoginScreen extends StatefulWidget {
  final Api api;
  final VoidCallback? onAuthenticated;
  final bool showDemoOtp;
  const LoginScreen(
    this.api, {
    this.onAuthenticated,
    this.showDemoOtp = false,
    super.key,
  });
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final phone = TextEditingController(text: '+998'),
      code = TextEditingController();
  String? challenge, error, demoCode;
  bool busy = false;
  int wait = 0;
  Timer? timer;
  @override
  void dispose() {
    timer?.cancel();
    phone.dispose();
    code.dispose();
    super.dispose();
  }

  Future<void> request() async {
    if (!RegExp(r'^\+998\d{9}$').hasMatch(phone.text.trim())) {
      setState(() => error = 'Telefonni +998 bilan to‘liq kiriting.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final r = asJson(
        await widget.api.send(
          '/auth/customer/otp/request',
          method: 'POST',
          body: {'phone': phone.text.trim()},
        ),
      );
      if (!mounted) return;
      setState(() {
        challenge = r['challenge_id'];
        wait = r['resend_after'];
        code.clear();
        final preview = r['demo_code'];
        demoCode =
            kDebugMode &&
                widget.showDemoOtp &&
                preview is String &&
                RegExp(r'^\d{6}$').hasMatch(preview)
            ? preview
            : null;
      });
      timer?.cancel();
      timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (wait <= 1) t.cancel();
        if (mounted) setState(() => wait = (wait - 1).clamp(0, 3600));
      });
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> verify() async {
    if (!RegExp(r'^\d{6}$').hasMatch(code.text)) {
      setState(() => error = 'SMSdagi 6 raqamli kodni kiriting.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = asJson(
        await widget.api.send(
          '/auth/customer/otp/verify',
          method: 'POST',
          body: {'challenge_id': challenge, 'code': code.text},
        ),
      );
      await widget.api.tokens(result);
      if (mounted) {
        if (widget.onAuthenticated != null) {
          widget.onAuthenticated!();
        } else {
          Navigator.pop(context, true);
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(actions: const [AppearanceToggle()]),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(28),
        children: [
          const Align(
            alignment: Alignment.centerLeft,
            child: SihhatLogo(size: 112),
          ),
          const SizedBox(height: 25),
          Text(
            challenge == null
                ? 'Sihhat.uz ga xush kelibsiz'
                : 'SMS kodini kiriting',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: context.colors.ink,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            challenge == null
                ? 'Ilovadan foydalanish uchun telefon raqamingizni tasdiqlang. Yangi hisob tasdiqlashdan so‘ng yaratiladi.'
                : demoCode != null
                ? 'Telefon raqamingizni quyidagi demo kod bilan tasdiqlang.'
                : 'Tasdiqlash kodi ${phone.text} raqamiga yuborildi.',
            style: TextStyle(color: context.colors.muted, height: 1.7),
          ),
          const SizedBox(height: 28),
          TextField(
            controller: phone,
            enabled: challenge == null && !busy,
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            decoration: const InputDecoration(
              labelText: 'Telefon raqami',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) {
              if (challenge == null && !busy) request();
            },
          ),
          if (challenge != null) ...[
            const SizedBox(height: 18),
            TextField(
              controller: code,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(6),
              ],
              decoration: const InputDecoration(
                labelText: 'SMS kodi',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) {
                if (!busy) verify();
              },
            ),
          ],
          if (demoCode != null) ...[
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SelectableText(
                      'Demo SMS kodi: $demoCode',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 20,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Sinov rejimi. Telefoningizga SMS yuborilmaydi. Ushbu kod bilan ilovaga kirishingiz mumkin.',
                    ),
                    TextButton(
                      onPressed: busy ? null : () => code.text = demoCode!,
                      child: const Text('Demo koddan foydalanish'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (error != null) ErrorView(error!),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: busy
                ? null
                : challenge == null
                ? request
                : verify,
            child: Text(
              busy
                  ? 'Tekshirilmoqda…'
                  : challenge == null
                  ? 'Kod yuborish'
                  : 'Tasdiqlash',
            ),
          ),
          if (challenge != null)
            TextButton(
              onPressed: busy || wait > 0 ? null : request,
              child: Text(
                wait > 0
                    ? 'Qayta yuborish: $wait soniya'
                    : 'Kodni qayta yuborish',
              ),
            ),
          if (challenge != null)
            TextButton.icon(
              onPressed: busy
                  ? null
                  : () {
                      timer?.cancel();
                      setState(() {
                        challenge = null;
                        code.clear();
                        error = null;
                        demoCode = null;
                        wait = 0;
                      });
                    },
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Telefon raqamini tuzatish'),
            ),
          const SizedBox(height: 20),
          Text(
            'Telefon raqamingiz hisobga kirish va bron bo‘yicha aloqa uchun ishlatiladi.',
            style: TextStyle(fontSize: 12, color: context.colors.muted),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}

Future<bool> ensureLogin(BuildContext context, Api api) async {
  if (api.signedIn) return true;
  return await Navigator.push<bool>(
        context,
        MaterialPageRoute(builder: (_) => LoginScreen(api)),
      ) ??
      false;
}

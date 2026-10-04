import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../branding.dart';
import '../appearance.dart';

class LoginScreen extends StatefulWidget {
  final Api api;
  const LoginScreen(this.api, {super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final phone = TextEditingController(text: '+998'),
      code = TextEditingController();
  String? challenge, error;
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
      if (mounted) Navigator.pop(context, true);
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
                ? 'Bron yaratish va saqlangan sanatoriyalarni ko‘rish uchun telefon raqamingizni tasdiqlang.'
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

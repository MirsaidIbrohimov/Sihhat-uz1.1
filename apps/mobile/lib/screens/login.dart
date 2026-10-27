import 'dart:async';

import 'package:flutter/material.dart';

import '../concept_ui.dart';
import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../appearance.dart';
import '../branding.dart';
import '../demo_otp.dart';

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
  final email = TextEditingController(), code = TextEditingController();
  String? challenge, error, demoCode, emailError;
  static const emailFormatError =
      'To‘g‘ri elektron pochta manzilini kiriting (masalan, foydalanuvchi@mail.uz).';
  bool busy = false;
  int wait = 0;
  Timer? timer;

  @override
  void dispose() {
    timer?.cancel();
    email.dispose();
    code.dispose();
    super.dispose();
  }

  bool _isValidEmail(String text) {
    return RegExp(
      r'^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$',
    ).hasMatch(text.trim());
  }

  Future<void> request() async {
    final em = email.text.trim().toLowerCase();
    if (!_isValidEmail(em)) {
      setState(() => emailError = emailFormatError);
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
      emailError = null;
    });
    try {
      final r = asJson(
        await widget.api.send(
          '/auth/customer/otp/request',
          method: 'POST',
          body: {'email': em},
        ),
      );
      if (!mounted) return;
      setState(() {
        challenge = r['challenge_id'];
        wait = r['resend_after'];
        code.clear();
        final preview = r['demo_code'];
        demoCode =
            demoOtpAllowed(widget.api.baseUrl, enabled: widget.showDemoOtp) &&
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
      setState(() => error = 'Pochtaga yuborilgan 6 xonali kodni kiriting.');
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
  Widget build(BuildContext context) => ConceptScope(
    child: Builder(
      builder: (c) => Scaffold(
        appBar: AppBar(
          centerTitle: challenge != null,
          title: Text(
            challenge == null ? 'Sihhat uz' : 'Tasdiqlash',
            style: conceptHeading(c, size: challenge == null ? 26 : 20),
          ),
          leading: Navigator.canPop(context)
              ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  tooltip: 'Orqaga',
                  onPressed: () => Navigator.pop(context, false),
                )
              : null,
          actions: const [ConceptAppearanceToggle(), SizedBox(width: 12)],
        ),
        bottomNavigationBar: Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(c).bottom),
          child: ConceptDock(
            label: busy
                ? 'Tekshirilmoqda…'
                : challenge == null
                ? 'Tasdiqlash kodini yuborish'
                : 'Tasdiqlash',
            onPressed: busy
                ? null
                : challenge == null
                ? request
                : verify,
          ),
        ),
        body: SafeArea(
          top: false,
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                children: [
                  if (error != null) ErrorView(error!),
                  if (challenge == null) ...[
                    const Center(child: SihhatLogo(size: 172)),
                    const SizedBox(height: 20),
                    Text(
                      'Xush kelibsiz',
                      textAlign: TextAlign.center,
                      style: conceptHeading(c, size: 34),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Dam olish va sihatgohlarni rejalashtirish shu yerdan boshlanadi.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: c.colors.muted,
                        fontSize: 17,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 28),
                  ] else ...[
                    const SizedBox(height: 22),
                    const Center(child: IconTile('mail', size: 100)),
                    const SizedBox(height: 24),
                    Text(
                      demoCode == null
                          ? 'Tasdiqlash kodi'
                          : 'Demo kodni kiriting',
                      textAlign: TextAlign.center,
                      style: conceptHeading(c, size: 28),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      demoCode == null
                          ? '6 xonali tasdiqlash kodi elektron pochtangizga yuborildi:'
                          : 'Elektron pochtangizni demo kod bilan tasdiqlang:',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.colors.muted, fontSize: 16),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      email.text.trim().toLowerCase(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 17,
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  if (challenge == null)
                    TextField(
                      controller: email,
                      enabled: !busy,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      textInputAction: TextInputAction.done,
                      decoration: InputDecoration(
                        labelText: 'Elektron pochta (Email)',
                        hintText: 'foydalanuvchi@mail.uz',
                        helperText: 'Tasdiqlash kodi shu pochtaga yuboriladi',
                        errorText: emailError,
                        errorMaxLines: 2,
                        prefixIcon: const Padding(
                          padding: EdgeInsets.all(14),
                          child: Icon(Icons.email_outlined),
                        ),
                      ),
                      onChanged: (value) => setState(() {
                        emailError = _isValidEmail(value) ? null : emailError;
                      }),
                      onSubmitted: (_) {
                        if (!busy) request();
                      },
                    )
                  else
                    OtpField(
                      controller: code,
                      enabled: !busy,
                      submitted: () {
                        if (!busy) verify();
                      },
                    ),
                  if (challenge == null &&
                      demoOtpAllowed(
                        widget.api.baseUrl,
                        enabled: widget.showDemoOtp,
                      )) ...[
                    const SizedBox(height: 16),
                    const ConceptCard(
                      child: Text(
                        'Demo rejim. Xat pochtaga yuborilmaydi; tasdiqlash kodi shu oynada ko‘rsatiladi.',
                      ),
                    ),
                  ],
                  if (demoCode != null) ...[
                    const SizedBox(height: 18),
                    ConceptCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(
                            'Demo tasdiqlash kodi: $demoCode',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 20,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Sinov rejimi. Pochtangizga xat yuborilmadi.',
                          ),
                          TextButton(
                            onPressed: busy
                                ? null
                                : () => code.text = demoCode!,
                            child: const Text('Demo koddan foydalanish'),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (challenge != null) ...[
                    const SizedBox(height: 22),
                    TextButton(
                      onPressed: busy || wait > 0 ? null : request,
                      child: Text(
                        wait > 0
                            ? 'Qayta yuborish: $wait soniya'
                            : 'Kodni qayta yuborish',
                      ),
                    ),
                    TextButton(
                      onPressed: busy
                          ? null
                          : () {
                              timer?.cancel();
                              setState(() {
                                challenge = null;
                                code.clear();
                                error = null;
                                emailError = null;
                                demoCode = null;
                                wait = 0;
                              });
                            },
                      child: const Text('Email manzilini tuzatish'),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const SizedBox(height: 20),
                  ConceptRow(
                    challenge == null ? 'shield-check' : 'info',
                    challenge == null
                        ? 'Elektron pochtangiz hisobga xavfsiz kirish va bron tafsilotlari uchun ishlatiladi.'
                        : demoCode == null
                        ? 'Kod kelishi 1-2 daqiqa olishi mumkin. Spam papkasini ham tekshirib ko‘ring.'
                        : 'Demo koddan faqat sinov uchun foydalaning.',
                  ),
                  if (challenge == null) ...[
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton.icon(
                        onPressed: busy
                            ? null
                            : () {
                                if (Navigator.canPop(context)) {
                                  Navigator.pop(context, false);
                                } else if (widget.onAuthenticated != null) {
                                  widget.onAuthenticated!();
                                }
                              },
                        icon: const Icon(Icons.explore_outlined, size: 20),
                        label: const Text(
                          'Ilovani ko‘rish (Mehmon sifatida)',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
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

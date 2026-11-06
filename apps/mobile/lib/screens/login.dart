import 'dart:async';

import 'package:flutter/material.dart';

import '../concept_ui.dart';
import '../motion.dart';
import '../neon.dart';
import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../appearance.dart';
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
      builder: (c) => GlassBackdrop(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            centerTitle: challenge != null,
            title: challenge == null
                ? null
                : Text('Tasdiqlash', style: conceptHeading(c, size: 20)),
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
                      const SizedBox(height: 8),
                      const Center(
                        child: FloatY(
                          child: PulseGlow(
                            child: NeonRing(
                              size: 92,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  color: abyss,
                                  shape: BoxShape.circle,
                                ),
                                child: Center(child: NeonHeartLogo(size: 50)),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Reveal(
                        child: Text.rich(
                          TextSpan(
                            children: [
                              const TextSpan(text: 'Sihhat'),
                              TextSpan(
                                text: '.uz',
                                style: TextStyle(color: c.colors.primary),
                              ),
                            ],
                          ),
                          textAlign: TextAlign.center,
                          style: conceptHeading(c, size: 32),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Reveal(
                        index: 1,
                        child: Text(
                          'Sog‘lom jamiyat — baxtli kelajak',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: c.colors.primary,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Reveal(
                        index: 2,
                        child: Row(
                          children: [
                            for (final (icon, label) in const [
                              (Icons.travel_explore_rounded, 'Sanatoriyalar'),
                              (Icons.auto_awesome_rounded, 'AI maslahat'),
                              (Icons.event_available_rounded, 'Onlayn bron'),
                            ])
                              Expanded(
                                child: Column(
                                  children: [
                                    GlyphTile(icon, size: 44),
                                    const SizedBox(height: 8),
                                    Text(
                                      label,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: c.colors.ink,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      Reveal(
                        index: 3,
                        child: Text(
                          'Xush kelibsiz',
                          style: conceptHeading(c, size: 22),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Davom etish uchun elektron pochtangizni kiriting.',
                        style: TextStyle(color: c.colors.muted, fontSize: 13),
                      ),
                      const SizedBox(height: 16),
                    ] else ...[
                      const SizedBox(height: 22),
                      const Center(
                        child: FloatY(
                          child: PulseGlow(
                            borderRadius: BorderRadius.all(Radius.circular(30)),
                            child: IconTile('mail', size: 100),
                          ),
                        ),
                      ),
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
                      Reveal(
                        index: 2,
                        child: TextField(
                          controller: email,
                          enabled: !busy,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          textInputAction: TextInputAction.done,
                          decoration: InputDecoration(
                            labelText: 'Elektron pochta (Email)',
                            hintText: 'foydalanuvchi@mail.uz',
                            helperText:
                                'Tasdiqlash kodi shu pochtaga yuboriladi',
                            errorText: emailError,
                            errorMaxLines: 2,
                            prefixIcon: Padding(
                              padding: const EdgeInsets.all(14),
                              child: SihhatIcon(
                                'mail',
                                color: c.colors.primary,
                              ),
                            ),
                          ),
                          onChanged: (value) => setState(() {
                            emailError = _isValidEmail(value)
                                ? null
                                : emailError;
                          }),
                          onSubmitted: (_) {
                            if (!busy) request();
                          },
                        ),
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
                  ],
                ),
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

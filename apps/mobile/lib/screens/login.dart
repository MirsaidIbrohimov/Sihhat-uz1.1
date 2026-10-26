import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../concept_ui.dart';

import '../data/api.dart';
import '../widgets.dart';
import '../design.dart';
import '../appearance.dart';
import '../branding.dart';
import '../demo_otp.dart';

class _UzbekPhoneFormatter extends TextInputFormatter {
  String digits(String value) => value
      .replaceFirst(RegExp(r'^\s*\+998'), '')
      .replaceAll(RegExp(r'\D'), '');

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final number = digits(newValue.text);
    final cursor = newValue.selection.extentOffset;
    return TextEditingValue(
      text: number,
      selection: TextSelection.collapsed(
        offset: cursor < 0
            ? number.length
            : digits(newValue.text.substring(0, cursor)).length
                  .clamp(0, number.length),
      ),
    );
  }
}

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
  final phone = TextEditingController(), code = TextEditingController();
  String? challenge, error, demoCode, phoneError;
  static const phoneLengthError = '+998 dan keyin aynan 9 ta raqam kiriting.';
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

  Future<void> _openTelegramBot() async {
    final uri = Uri.parse('https://t.me/sihhat_support_bot');
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      if (mounted) {
        setState(() => error = 'Telegram ilovasi ochilmadi. @sihhat_support_bot manziliga kiring.');
      }
    }
  }

  Future<void> request() async {
    if (!RegExp(r'^\d{9}$').hasMatch(phone.text)) {
      setState(() => phoneError = phoneLengthError);
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
      phoneError = null;
    });
    try {
      final r = asJson(
        await widget.api.send(
          '/auth/customer/otp/request',
          method: 'POST',
          body: {'phone': '+998${phone.text}'},
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
                ? 'Kod yuborish'
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
                      'Dam olishni rejalashtirish shu yerdan boshlanadi.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: c.colors.muted,
                        fontSize: 17,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),
                    ConceptCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xff229ed9),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.send_rounded, color: Colors.white, size: 22),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Telegram orqali tezkor kirish',
                                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'SMS kutmasdan, 1-bosishda kiring',
                                      style: TextStyle(color: c.colors.muted, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xff229ed9),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.telegram, size: 22),
                            label: const Text(
                              'Telegram botni ochish (@sihhat_support_bot)',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            onPressed: busy ? null : _openTelegramBot,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(child: Divider(color: c.colors.border)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(
                            'yoki telefon raqam orqali',
                            style: TextStyle(color: c.colors.muted, fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                        Expanded(child: Divider(color: c.colors.border)),
                      ],
                    ),
                    const SizedBox(height: 20),
                  ] else ...[
                    const SizedBox(height: 22),
                    const Center(child: IconTile('message-square', size: 110)),
                    const SizedBox(height: 28),
                    Text(
                      demoCode == null
                          ? 'SMS kodini kiriting'
                          : 'Demo kodni kiriting',
                      textAlign: TextAlign.center,
                      style: conceptHeading(c, size: 28),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      demoCode == null
                          ? 'Kod telefon raqamingizga yuborildi.'
                          : 'Telefon raqamingizni demo kod bilan tasdiqlang.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.colors.muted, fontSize: 16),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      '+998${phone.text}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 17,
                      ),
                    ),
                    const SizedBox(height: 14),
                    GestureDetector(
                      onTap: _openTelegramBot,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xff229ed9).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xff229ed9).withValues(alpha: 0.25)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.telegram, color: Color(0xff229ed9), size: 18),
                            SizedBox(width: 8),
                            Text(
                              'SMS kelmadimi? @sihhat_support_bot orqali oling',
                              style: TextStyle(color: Color(0xff229ed9), fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  if (challenge == null)
                    TextField(
                      controller: phone,
                      enabled: !busy,
                      keyboardType: TextInputType.phone,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      inputFormatters: [_UzbekPhoneFormatter()],
                      textInputAction: TextInputAction.done,
                      decoration: InputDecoration(
                        labelText: 'Telefon raqami',
                        prefixText: '+998 ',
                        hintText: '90 123 45 67',
                        helperText: '9 ta raqam kiriting',
                        errorText: phoneError,
                        errorMaxLines: 2,
                        prefixIcon: const Padding(
                          padding: EdgeInsets.all(14),
                          child: SihhatIcon('phone'),
                        ),
                      ),
                      onChanged: (value) => setState(() {
                        phoneError = value.length == 9
                            ? null
                            : phoneLengthError;
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
                        'Demo rejim. SMS yuborilmaydi; kod shu oynada chiqadi. Sinov raqamidan foydalaning.',
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
                            'Demo SMS kodi: $demoCode',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 20,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Sinov rejimi. Telefoningizga SMS yuborilmaydi.',
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
                                phoneError = null;
                                demoCode = null;
                                wait = 0;
                              });
                            },
                      child: const Text('Telefon raqamini tuzatish'),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const SizedBox(height: 20),
                  ConceptRow(
                    challenge == null ? 'shield-check' : 'info',
                    challenge == null
                        ? 'Telefon raqamingiz hisobga kirish va bron bo‘yicha aloqa uchun ishlatiladi.'
                        : demoCode == null
                        ? 'Kod kelishi biroz vaqt olishi mumkin.'
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
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
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

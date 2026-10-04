import 'package:flutter/material.dart';

class SihhatLogo extends StatelessWidget {
  final double size;
  const SihhatLogo({this.size = 48, super.key});

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(size * .22),
    child: Image.asset(
      'assets/branding/sihhat-logo.jpg',
      width: size,
      height: size,
      fit: BoxFit.contain,
      semanticLabel: 'Sihhat uz logosi',
    ),
  );
}

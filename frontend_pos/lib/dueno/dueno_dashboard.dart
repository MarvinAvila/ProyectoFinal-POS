import 'package:flutter/material.dart';

class DuenoDashboard extends StatelessWidget {
  const DuenoDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard Dueño')),
      body: const Center(child: Text('Pantalla Dueño')),
    );
  }
}

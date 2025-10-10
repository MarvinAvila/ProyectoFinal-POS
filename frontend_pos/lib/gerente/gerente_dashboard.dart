import 'package:flutter/material.dart';

class GerenteDashboard extends StatelessWidget {
  const GerenteDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard Gerente')),
      body: const Center(child: Text('Pantalla Gerente')),
    );
  }
}

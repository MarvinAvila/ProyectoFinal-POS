import 'package:flutter/material.dart';

class EmpleadoDashboardScreen extends StatelessWidget {
  const EmpleadoDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard Empleado')),
      body: const Center(child: Text('Bienvenido Empleado')),
    );
  }
}

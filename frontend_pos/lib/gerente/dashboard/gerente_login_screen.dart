// lib/gerente/auth/gerente_login_screen.dart
import 'package:flutter/material.dart';
import 'package:frontend_pos/core/http.dart'; // ✅ para ApiClient.setToken
import 'package:frontend_pos/auth/login_form.dart'; // ✅ formulario reutilizable
import 'package:frontend_pos/gerente/dashboard/gerente_dashboard.dart'; // ✅ pantalla destino

class GerenteLoginScreen extends StatelessWidget {
  const GerenteLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login Gerente')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: LoginForm(
          rol: 'gerente',
          onLoginSuccess: (token) async {
            // ✅ guarda el token para futuras peticiones
            await ApiClient.setToken(token);

            // 👉 navega al dashboard del gerente
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const GerenteDashboard()),
            );
          },
        ),
      ),
    );
  }
}

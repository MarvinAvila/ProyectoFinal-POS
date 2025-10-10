import 'package:flutter/material.dart';
import 'package:frontend_pos/admin/dashboard/dashboard_screen.dart';
import 'package:frontend_pos/auth/login_form.dart';
import 'package:frontend_pos/core/http.dart'; // ✅ importa para usar ApiClient

class AdminLoginScreen extends StatelessWidget {
  const AdminLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login Administrador')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: LoginForm(
          rol: 'admin',
          onLoginSuccess: (token) async {
            // ✅ Limpia y guarda el nuevo token
            await ApiClient.setToken(token);

            // Luego navega al dashboard
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const AdminDashboardScreen()),
            );
          },
        ),
      ),
    );
  }
}

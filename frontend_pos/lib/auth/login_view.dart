// lib/auth/views/login_view.dart
import 'package:flutter/material.dart';
import 'package:frontend_pos/core/http.dart'; // ✅ para setToken
import 'login_form.dart'; // Asegúrate de que el path sea correcto

class LoginView extends StatelessWidget {
  const LoginView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.storefront, size: 100, color: Colors.orange),
              const SizedBox(height: 20),
              const Text(
                'Sistema Punto de Venta',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 40),

              // ✅ Pasamos el token recibido correctamente
              LoginForm(
                rol: 'admin',
                onLoginSuccess: (token) async {
                  // 🔑 Guarda el token limpio en FlutterSecureStorage
                  await ApiClient.setToken(token);

                  // 🚀 Luego redirige al dashboard del rol correspondiente
                  Navigator.pushReplacementNamed(context, '/admin/dashboard');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

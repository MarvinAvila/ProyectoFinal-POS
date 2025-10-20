import 'package:flutter/material.dart';

// ✅ Pantallas de autenticación
import 'package:frontend_pos/auth/home_login_screen.dart';
import 'package:frontend_pos/auth/login_screen.dart';

// ✅ Dashboards
import 'package:frontend_pos/admin/dashboard/dashboard_screen.dart';
import 'package:frontend_pos/gerente/dashboard/gerente_dashboard.dart';
import 'package:frontend_pos/dueno/dueno_dashboard.dart';
import 'package:frontend_pos/empleado/empleado_dashboard_screen.dart';
import 'package:frontend_pos/admin/productos/products_screen.dart';
import 'package:frontend_pos/admin/productos/product_form_screen.dart';

// ✅ Pantallas adicionales
import 'package:frontend_pos/empleado/ventas/ventas_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'POS Roles App',
      debugShowCheckedModeBanner: false,
      // ✅ Pantalla inicial ahora es la selección de rol
      initialRoute: '/',
      routes: {
        '/': (context) => const HomeLoginScreen(),

        // ✅ Si quieres entrar directo a login de admin (opcional):
        '/login/admin': (context) => const LoginScreen(role: 'admin'),
        '/login/gerente': (context) => const LoginScreen(role: 'gerente'),
        '/cajero/empleado': (context) => const LoginScreen(role: 'empleado'),

        // ✅ Dashboards
        '/admin/dashboard': (context) => const AdminDashboardScreen(),
        '/gerente/dashboard': (context) => const GerenteDashboard(),
        '/dueno/dashboard': (context) => const DuenoDashboard(),
        '/cajero/dashboard': (context) => const EmpleadoDashboardScreen(),

        // ✅ Módulo de productos (CRUD)
        '/admin/productos': (context) => const ProductsScreen(),
        '/admin/productos/form': (context) => const ProductFormScreen(),
      },
    );
  }
}

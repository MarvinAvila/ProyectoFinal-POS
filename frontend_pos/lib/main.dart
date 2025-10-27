import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// ✅ Controladores
import 'package:frontend_pos/empleado/carrito/cart_controller.dart';

// ✅ Pantallas de autenticación
import 'package:frontend_pos/auth/home_login_screen.dart';
import 'package:frontend_pos/auth/login_screen.dart';

// ✅ Dashboards
import 'package:frontend_pos/admin/dashboard/dashboard_screen.dart';
import 'package:frontend_pos/gerente/dashboard/gerente_dashboard.dart';
import 'package:frontend_pos/dueno/dueno_dashboard.dart';
import 'package:frontend_pos/empleado/dashboard/empleado_dashboard_screen.dart';
import 'package:frontend_pos/admin/productos/products_screen.dart';
import 'package:frontend_pos/admin/productos/product_form_screen.dart';

// ✅ Pantallas adicionales
import 'package:frontend_pos/empleado/ventas/ventas_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CartController()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KioskoGo',
      debugShowCheckedModeBanner: false,

      // ✅ IR DIRECTAMENTE AL HOME LOGIN
      // El splash nativo se muestra automáticamente al inicio
      home: const HomeLoginScreen(),

      routes: {
        '/login/admin': (context) => const LoginScreen(role: 'admin'),
        '/login/gerente': (context) => const LoginScreen(role: 'gerente'),
        '/login/dueno': (context) => const LoginScreen(role: 'dueno'),
        '/login/cajero': (context) => const LoginScreen(role: 'cajero'),
        '/admin/dashboard': (context) => const AdminDashboardScreen(),
        '/gerente/dashboard': (context) => const GerenteDashboard(),
        '/dueno/dashboard': (context) => const DuenoDashboard(),
        '/cajero/dashboard': (context) => const EmpleadoDashboardScreen(),
        '/admin/productos': (context) => const ProductsScreen(),
        '/admin/productos/form': (context) => const ProductFormScreen(),
        '/cajero/ventas': (context) => const VentasScreen(),
      },
    );
  }
}
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'shell/app_shell.dart';
import 'auth/login_screen.dart';
import 'productos/products_screen.dart';
import 'carrito/cart_screen.dart';
import 'reportes/reportes_screen.dart';
import 'dashboard/dashboard_screen.dart';
import 'categorias/categories_screen.dart';
import 'alertas/alerts_screen.dart';
import 'carrito/cart_controller.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PosApp());
}

class PosApp extends StatelessWidget {
  const PosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CartController()..init()),
      ],
      child: MaterialApp(
        title: 'POS',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorSchemeSeed: Colors.deepPurple,
          useMaterial3: true,
        ),
        // Puedes usar home: const AppShell(), o rutas:
        initialRoute: '/',
        routes: {
          '/': (_) => const AppShell(),
          '/login': (_) => const LoginScreen(),
          '/dashboard': (_) => const DashboardScreen(),
          '/productos': (_) => const ProductsScreen(),
          '/carrito': (_) => const CartScreen(),
          '/reportes': (_) => const ReportesScreen(),
          '/categorias': (_) => const CategoriesScreen(),
          '/alertas': (_) => const AlertsScreen(),
        },
      ),
    );
  }
}

// lib/shell/app_shell.dart
import 'package:flutter/material.dart';

// Páginas principales
import '../dashboard/dashboard_screen.dart';
import '../productos/products_screen.dart';
import '../carrito/cart_screen.dart';
import '../reportes/reportes_screen.dart';

// Secundarias (se abren vía push)
import '../categorias/categories_screen.dart';
import '../alertas/alerts_screen.dart';

/// Contenedor principal de la app (post-login).
/// - Barra de navegación inferior con 4 tabs.
/// - IndexedStack para preservar estado de cada pestaña.
/// - Menú "Más" para acceder a pantallas secundarias.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  // Pantallas de cada pestaña (mantienen estado con IndexedStack)
  final _pages = const <Widget>[
    DashboardScreen(),
    ProductsScreen(),
    CartScreen(),
    ReportesScreen(),
  ];

  final _titles = const <String>[
    'Dashboard',
    'Productos',
    'Carrito',
    'Reportes',
  ];

  void _go(int i) => setState(() => _index = i);

  void _openCategorias() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const CategoriesScreen()));
  }

  void _openAlertas() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const AlertsScreen()));
  }

  @override
  Widget build(BuildContext context) {
    // Importante: las páginas internas usan su propio Scaffold y AppBar.
    // Aquí solo controlamos la barra de navegación inferior y preservamos estado.
    return Scaffold(
      // Título contextual arriba (opcional). Si prefieres solo las barras internas,
      // deja el appBar en null.
      appBar: AppBar(
        title: Text(_titles[_index]),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Más',
            onSelected: (v) {
              switch (v) {
                case 'categorias':
                  _openCategorias();
                  break;
                case 'alertas':
                  _openAlertas();
                  break;
              }
            },
            itemBuilder:
                (context) => const [
                  PopupMenuItem(value: 'categorias', child: Text('Categorías')),
                  PopupMenuItem(value: 'alertas', child: Text('Alertas')),
                ],
          ),
        ],
      ),
      body: SafeArea(
        top: false, // dejamos que cada pantalla maneje su AppBar
        child: IndexedStack(index: _index, children: _pages),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _go,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Productos',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_cart_outlined),
            selectedIcon: Icon(Icons.shopping_cart),
            label: 'Carrito',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'Reportes',
          ),
        ],
      ),
    );
  }
}

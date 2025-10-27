import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:frontend_pos/admin/categorias/category_screen.dart';
import 'package:frontend_pos/admin/productos/products_screen.dart';
import 'package:frontend_pos/admin/proveedores/proveedores_screen.dart';
import 'package:frontend_pos/alertas/alerts_screen.dart';
import 'package:frontend_pos/admin/ventas/ventas_screen.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'dashboard_repository.dart';
import 'package:frontend_pos/admin/usuarios/users_screen.dart';
import 'package:frontend_pos/chatbot/screens/chatbot_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final repo = DashboardRepository();
  late Future<DashboardData> dashboardFuture;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() {
      dashboardFuture = repo.fetchDashboard();
    });
  }

  void _onItemTapped(int index) async {
    setState(() => _currentIndex = index);

    switch (index) {
      case 0:
        await _loadDashboard();
        break;
      case 1:
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ProductsScreen()),
        ).then((_) => _loadDashboard());
        break;
      case 2:
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const VentasScreen()),
        ).then((_) => _loadDashboard());
        break;
      case 3:
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const CategoriesScreen()),
        ).then((_) => _loadDashboard());
        break;
      case 4:
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const AlertsScreen()),
        ).then((_) => _loadDashboard());
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 700;
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');

    return Scaffold(
      extendBody: true,
      body: Container(
        // 🌌 Fondo futurista tipo ArgusVPN con gradiente azul-neón
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0A0E21), // azul noche base
              Color(0xFF0F172A), // azul marino profundo
              Color(0xFF1E293B), // gris azulado
            ],
          ),
        ),
        child: Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topRight,
              radius: 1.4,
              colors: [
                Color(0xFF1E3A8A), // azul intenso
                Color.fromARGB(255, 9, 24, 66), // azul brillante neón
                Color.fromARGB(255, 4, 26, 85), // violeta moderno
                Colors.transparent,
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                // 🪞 AppBar translúcido con toque de brillo
                ClipRRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: AppBar(
                      title: const Text('Panel de Administrador'),
                      backgroundColor: Colors.white.withOpacity(0.05),
                      elevation: 0,
                      foregroundColor: Colors.white,
                      actions: [
                        IconButton(
                          tooltip: 'Cerrar sesión',
                          icon: const Icon(Icons.logout),
                          onPressed: () async {
                            await ApiClient.setToken(null);
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Sesión cerrada correctamente'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                            Navigator.pushReplacementNamed(
                              context,
                              '/admin/login',
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),

                // 🌆 CONTENIDO PRINCIPAL
                Expanded(
                  child: FutureBuilder<DashboardData>(
                    future: dashboardFuture,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      } else if (snapshot.hasError) {
                        return Center(
                          child: Text(
                            'Error: ${snapshot.error}',
                            style: const TextStyle(color: Colors.redAccent),
                          ),
                        );
                      }

                      final data = snapshot.data!;

                      return RefreshIndicator(
                        onRefresh: _loadDashboard,
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 500),
                          child: SingleChildScrollView(
                            key: ValueKey(_currentIndex),
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 16,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildWelcomePanel(context, isMobile),
                                const SizedBox(height: 18),
                                _buildStatsOverview(context, data, currency),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),

      // 💬 FAB Chatbot (azul neón moderno)
      floatingActionButton: FloatingActionButton(
        heroTag: 'chatbot_button_admin',
        backgroundColor: const Color.fromARGB(255, 154, 68, 220),
        elevation: 8,
        child: const Icon(Icons.chat_bubble_outline, color: Colors.white),
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.white,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            builder: (_) => const SizedBox(height: 600, child: ChatbotScreen()),
          );
        },
      ),

      // 🌈 Bottom Navigation Bar glassmorphism con tonos eléctricos
      bottomNavigationBar: ClipRRect(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            height: 90,
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.85),
              border: Border(
                top: BorderSide(color: Colors.white.withOpacity(0.1), width: 1),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(
                    icon: Icons.home_rounded,
                    label: "Inicio",
                    isSelected: _currentIndex == 0,
                    onTap: () => _onItemTapped(0),
                  ),
                  _buildNavItem(
                    icon: Icons.shopping_bag_rounded,
                    label: "Productos",
                    isSelected: _currentIndex == 1,
                    onTap: () => _onItemTapped(1),
                  ),
                  _buildCenterButton(onTap: () => _onItemTapped(2)),
                  _buildNavItem(
                    icon: Icons.category_rounded,
                    label: "Categorías",
                    isSelected: _currentIndex == 3,
                    onTap: () => _onItemTapped(3),
                  ),
                  _buildNavItem(
                    icon: Icons.warning_amber_rounded,
                    label: "Alertas",
                    isSelected: _currentIndex == 4,
                    onTap: () => _onItemTapped(4),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // 🌟 PANEL DE BIENVENIDA
  Widget _buildWelcomePanel(BuildContext context, bool isMobile) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(isMobile ? 16 : 24),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withOpacity(0.5),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: Colors.white.withOpacity(0.1),
              width: 1.2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'Bienvenido, Administrador 👋',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF60A5FA), // azul suave brillante
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Administra tus ventas, productos y reportes en un solo lugar.',
                style: TextStyle(fontSize: 16, color: Color(0xFFCBD5E1)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 📊 PANEL DE ESTADÍSTICAS
  Widget _buildStatsOverview(
    BuildContext context,
    DashboardData data,
    NumberFormat currency,
  ) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF111827).withOpacity(0.7),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: Colors.white.withOpacity(0.1),
              width: 1.2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Resumen general',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF3B82F6),
                ),
              ),
              const SizedBox(height: 12),
              _buildStatRow('Ventas del Día', currency.format(data.ventasHoy)),
              _buildStatRow('Ventas del Mes', currency.format(data.ventasMes)),
              _buildStatRow('Productos', '${data.totalProductos}'),
              _buildStatRow('Categorías', '${data.totalCategorias}'),
              _buildStatRow('Proveedores', '${data.totalProveedores}'),
              _buildStatRow('Usuarios', '${data.totalUsuarios}'),
              _buildStatRow('Alertas Pendientes', '${data.alertasPendientes}'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatRow(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, color: Color(0xFFCBD5E1)),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color.fromARGB(255, 222, 232, 245),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color:
                isSelected ? const Color(0xFF60A5FA) : const Color(0xFF64748B),
            size: isSelected ? 32 : 28,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color:
                  isSelected
                      ? const Color(0xFF60A5FA)
                      : const Color(0xFF94A3B8),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCenterButton({required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.point_of_sale_rounded, color: Color(0xFFCBD5E1), size: 32),
          SizedBox(height: 4),
          Text(
            "Ventas",
            style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
          ),
        ],
      ),
    );
  }
}

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

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final repo = DashboardRepository();
  late Future<DashboardData> dashboardFuture;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  // 🔄 Nueva función para recargar datos del dashboard
  Future<void> _loadDashboard() async {
    setState(() {
      dashboardFuture = repo.fetchDashboard();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 700;
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');

    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FA),
      appBar: AppBar(
        title: const Text('Panel de Administrador'),
        backgroundColor: const Color(0xFF5D3A9B),
        foregroundColor: Colors.white,
        elevation: 0,
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
              Navigator.pushReplacementNamed(context, '/admin/login');
            },
          ),
        ],
      ),

      // 🟪 Contenido principal
      body: FutureBuilder<DashboardData>(
        future: dashboardFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(
              child: Text(
                'Error: ${snapshot.error}',
                style: const TextStyle(color: Colors.red),
              ),
            );
          }

          final data = snapshot.data!;

          return RefreshIndicator(
            onRefresh: _loadDashboard, // permite hacer pull-to-refresh también
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildWelcomePanel(context, isMobile),
                  const SizedBox(height: 24),

                  // 🟩 TARJETAS PRINCIPALES
                  GridView.count(
                    crossAxisCount: isMobile ? 1 : 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildCard(
                        title: 'Ventas del Día',
                        value: currency.format(data.ventasHoy),
                        icon: Icons.attach_money,
                        color1: const Color(0xFFFFD6E8),
                        color2: const Color(0xFFD1C4E9),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const VentasScreen(),
                            ),
                          ).then(
                            (_) => _loadDashboard(),
                          ); // ✅ se actualiza al volver
                        },
                      ),
                      _buildCard(
                        title: 'Ventas',
                        value: currency.format(data.ventasMes),
                        icon: Icons.show_chart,
                        color1: const Color(0xFFB3E5FC),
                        color2: const Color(0xFF81D4FA),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const VentasScreen(),
                            ),
                          ).then(
                            (_) => _loadDashboard(),
                          ); // ✅ se actualiza al volver
                        },
                      ),
                      _buildCard(
                        title: 'Productos',
                        value: '${data.totalProductos}',
                        icon: Icons.shopping_bag,
                        color1: const Color(0xFFFFF59D),
                        color2: const Color(0xFFFFCCBC),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const ProductsScreen(),
                            ),
                          ).then(
                            (_) => _loadDashboard(),
                          ); // ✅ se actualiza al volver
                        },
                      ),
                      _buildCard(
                        title: 'Categorías',
                        value: '${data.totalCategorias}',
                        icon: Icons.category,
                        color1: const Color(0xFFD7CCC8),
                        color2: const Color(0xFFBCAAA4),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const CategoriesScreen(),
                            ),
                          ).then((_) => _loadDashboard()); // ✅
                        },
                      ),
                      _buildCard(
                        title: 'Proveedores',
                        value: '${data.totalProveedores}',
                        icon: Icons.local_shipping,
                        color1: const Color(0xFFC8E6C9),
                        color2: const Color(0xFFA5D6A7),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const ProveedoresScreen(),
                            ),
                          ).then(
                            (_) => _loadDashboard(),
                          ); // ✅ actualiza al volver
                        },
                      ),
                      _buildCard(
                        title: 'Usuarios',
                        value: '${data.totalUsuarios}',
                        icon: Icons.people_alt,
                        color1: const Color(0xFFE1BEE7),
                        color2: const Color(0xFFCE93D8),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const UsersScreen(),
                            ),
                          ).then((_) => _loadDashboard()); // ✅
                        },
                      ),
                      _buildCard(
                        title: 'Alertas Pendientes',
                        value: '${data.alertasPendientes}',
                        icon: Icons.warning_amber_rounded,
                        color1: const Color(0xFFFFF59D),
                        color2: const Color(0xFFFFCC80),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const AlertsScreen(),
                            ),
                          ).then((_) => _loadDashboard()); // ✅
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // 🌟 PANEL DE BIENVENIDA
  Widget _buildWelcomePanel(BuildContext context, bool isMobile) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isMobile ? 16 : 24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFFE1BEE7), Color(0xFFD1C4E9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.purple.shade100.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(3, 5),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: isMobile ? -10 : 20,
            bottom: isMobile ? -10 : 10,
            child: Opacity(
              opacity: 0.1,
              child: Icon(
                Icons.dashboard_rounded,
                size: isMobile ? 100 : 160,
                color: Colors.deepPurple.shade900,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bienvenida, Administrador 👋',
                style: TextStyle(
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF4A148C),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Administra tus ventas, productos y reportes en un solo lugar.',
                style: TextStyle(
                  fontSize: isMobile ? 14 : 16,
                  color: Colors.deepPurple.shade700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 🧱 TARJETA REUTILIZABLE
  Widget _buildCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color1,
    required Color color2,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color1, color2],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: color2.withOpacity(0.4),
              blurRadius: 10,
              offset: const Offset(3, 6),
            ),
          ],
        ),
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 38, color: const Color(0xFF5D3A9B)),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF5D3A9B),
              ),
            ),
            const Spacer(),
            Text(
              value,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Color(0xFF4A148C),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

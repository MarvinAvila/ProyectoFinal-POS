import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart'; // ✅ Import para usar ApiClient
import 'dashboard_repository.dart';

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
    dashboardFuture = repo.fetchDashboard();
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');

    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FA),
      appBar: AppBar(
        title: const Text('Panel de Administrador'),
        backgroundColor: const Color(0xFF5D3A9B),
        foregroundColor: Colors.white,
        elevation: 0,

        // ✅ Botón de logout (nuevo)
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              // 🔐 Limpia el token guardado
              await ApiClient.setToken(null);

              if (!mounted) return;

              // 🔔 Confirmación visual
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Sesión cerrada correctamente'),
                  duration: Duration(seconds: 2),
                ),
              );

              // 🔄 Redirige al login del admin
              Navigator.pushReplacementNamed(context, '/admin/login');
            },
          ),
        ],
      ),

      // 💼 Mantiene tu lógica actual sin tocar nada
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
          return Padding(
            padding: const EdgeInsets.all(16),
            child: GridView.count(
              crossAxisCount: isMobile ? 1 : 2,
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              children: [
                _buildCard(
                  title: 'Ventas del Día',
                  value: currency.format(data.ventasHoy),
                  icon: Icons.attach_money,
                  color1: const Color(0xFFFFD6E8),
                  color2: const Color(0xFFD1C4E9),
                  onTap: () {},
                ),
                _buildCard(
                  title: 'Ventas del Mes',
                  value: currency.format(data.ventasMes),
                  icon: Icons.show_chart,
                  color1: const Color(0xFFB3E5FC),
                  color2: const Color(0xFF81D4FA),
                  onTap: () {},
                ),
                _buildCard(
                  title: 'Productos',
                  value: '${data.totalProductos}',
                  icon: Icons.shopping_bag,
                  color1: const Color(0xFFFFF59D),
                  color2: const Color(0xFFFFCCBC),
                  onTap: () {},
                ),
                _buildCard(
                  title: 'Categorías',
                  value: '${data.totalCategorias}',
                  icon: Icons.category,
                  color1: const Color(0xFFD7CCC8),
                  color2: const Color(0xFFBCAAA4),
                  onTap: () {},
                ),
                _buildCard(
                  title: 'Proveedores',
                  value: '${data.totalProveedores}',
                  icon: Icons.local_shipping,
                  color1: const Color(0xFFC8E6C9),
                  color2: const Color(0xFFA5D6A7),
                  onTap: () {},
                ),
                _buildCard(
                  title: 'Usuarios',
                  value: '${data.totalUsuarios}',
                  icon: Icons.people_alt,
                  color1: const Color(0xFFE1BEE7),
                  color2: const Color(0xFFCE93D8),
                  onTap: () {},
                ),
                _buildCard(
                  title: 'Alertas Pendientes',
                  value: '${data.alertasPendientes}',
                  icon: Icons.warning_amber_rounded,
                  color1: const Color(0xFFFFF59D),
                  color2: const Color(0xFFFFCC80),
                  onTap: () {},
                ),
              ],
            ),
          );
        },
      ),
    );
  }

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
        duration: const Duration(milliseconds: 300),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color1, color2],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: color2.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(2, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 40, color: const Color(0xFF5D3A9B)),
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
                color: Color(0xFF5D3A9B),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

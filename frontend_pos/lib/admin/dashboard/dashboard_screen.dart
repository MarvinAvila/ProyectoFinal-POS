import 'package:flutter/material.dart';
import 'package:frontend_pos/admin/productos/products_screen.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'dashboard_repository.dart';
import 'widgets/dashboard_chart.dart'; // ✅ Importamos la gráfica real

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
          final chartData =
              data.ventasUltimaSemana; // ✅ Datos reales del backend

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
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
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true, // pantalla completa
                          useSafeArea: true,
                          builder: (_) => const ProductsScreen(),
                        );
                      },
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

                /*  const SizedBox(height: 24),
                // 📈 GRÁFICA DE VENTAS REALES
                if (chartData.isNotEmpty)
                  DashboardChart(
                    title: 'Tendencia de Ventas (últimos días)',
                    data: chartData,
                    color: Colors.deepPurple,
                  )
                else
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'No hay datos de ventas recientes para mostrar en la gráfica.',
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                  ),*/

                /*const SizedBox(height: 24),
                // ⚠️ SECCIÓN DE ALERTAS (por implementar)
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 3,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Alertas Pendientes',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF5D3A9B),
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Aquí se mostrarán las alertas del sistema.',
                          style: TextStyle(color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                ),*/
              ],
            ),
          );
        },
      ),
    );
  }

  // 🧱 Tarjeta reutilizable
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

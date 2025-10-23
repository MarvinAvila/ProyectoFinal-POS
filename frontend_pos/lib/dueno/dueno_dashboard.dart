import 'package:flutter/material.dart';
import 'package:frontend_pos/dueno/dashboard/iva_recaudado_screen.dart';
import 'package:frontend_pos/dueno/dashboard/promedio_venta_screen.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/dueno/dashboard/dueno_repository.dart'; // ✅ ruta completa
import 'package:frontend_pos/alertas/alerts_screen.dart';
import 'package:frontend_pos/admin/ventas/ventas_screen.dart';
import 'package:frontend_pos/gerente/ventas/top_productos_screen.dart';
import 'package:frontend_pos/dueno/dashboard/crecimiento_mensual_chart.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:frontend_pos/chatbot/screens/chatbot_screen.dart'; // 💬 Chatbot importado

class DuenoDashboard extends StatefulWidget {
  const DuenoDashboard({super.key});

  @override
  State<DuenoDashboard> createState() => _DuenoDashboardState();
}

class _DuenoDashboardState extends State<DuenoDashboard> {
  final repo = DuenoDashboardRepository();
  late Future<DuenoDashboardData> dashboardFuture;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      setState(() => _isLoading = true);

      // Primero obtenemos los datos
      final data = await repo.fetchDashboard();

      // Luego actualizamos el estado
      setState(() {
        dashboardFuture = Future.value(data);
        _isLoading = false;
      });
    } catch (error) {
      setState(() {
        _isLoading = false;
      });
      print('Error loading dashboard: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 700;
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');

    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FA),
      appBar: AppBar(
        title: const Text('Panel del Dueño'),
        backgroundColor: const Color(0xFF4A148C),
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
              Navigator.pushReplacementNamed(context, '/login/dueno');
            },
          ),
        ],
      ),

      body: FutureBuilder<DuenoDashboardData>(
        future: dashboardFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Error: ${snapshot.error}',
                style: const TextStyle(color: Colors.red),
              ),
            );
          }

          final data = snapshot.data!;

          return RefreshIndicator(
            onRefresh: _loadDashboard,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildWelcomePanel(context, isMobile),
                  const SizedBox(height: 24),

                  // 🟪 TARJETAS PRINCIPALES DEL DUEÑO
                  GridView.count(
                    crossAxisCount: isMobile ? 1 : 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildCard(
                        title: 'Ingresos Totales',
                        value: currency.format(data.ingresosTotales),
                        icon: Icons.account_balance_wallet_outlined,
                        color1: const Color(0xFFFFD6E8),
                        color2: const Color(0xFFE1BEE7),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const VentasScreen(),
                            ),
                          ).then((_) => _loadDashboard());
                        },
                      ),
                      _buildCard(
                        title: 'IVA Recaudado',
                        value: currency.format(data.ivaRecaudado),
                        icon: Icons.receipt_long_outlined,
                        color1: const Color(0xFFC8E6C9),
                        color2: const Color(0xFFA5D6A7),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const IvaRecaudadoScreen(),
                            ),
                          ).then((_) => _loadDashboard());
                        },
                      ),
                      _buildCard(
                        title: 'Promedio de Venta',
                        value: currency.format(data.promedioVenta),
                        icon: Icons.trending_up,
                        color1: const Color(0xFFB3E5FC),
                        color2: const Color(0xFF81D4FA),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const PromedioVentaScreen(),
                            ),
                          ).then((_) => _loadDashboard());
                        },
                      ),
                      _buildCard(
                        title: 'Alertas Activas',
                        value: '${data.alertasActivas}',
                        icon: Icons.warning_amber_rounded,
                        color1: const Color(0xFFFFF59D),
                        color2: const Color(0xFFFFCC80),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const AlertsScreen(),
                            ),
                          ).then((_) => _loadDashboard());
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
                  _buildSectionTitle('Crecimiento Mensual'),
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    height: 260,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.purple.shade100.withOpacity(0.3),
                          blurRadius: 6,
                          offset: const Offset(2, 3),
                        ),
                      ],
                    ),
                    child: CrecimientoMensualChart(datos: data.crecimiento),
                  ),

                  const SizedBox(height: 24),
                  _buildSectionTitle('Productos más Rentables'),
                  _buildRentablesPreview(context, data.productosRentables),

                  const SizedBox(height: 24),
                  _buildSectionTitle('Ventas por Empleado'),
                  _buildPlaceholder(
                    '👩‍💼 ${data.ventasPorEmpleado.length} empleados',
                  ),

                  const SizedBox(height: 24),
                  _buildSectionTitle('Distribución de Inventario'),
                  data.distribucionInventario.isEmpty
                      ? _buildPlaceholder('🥧 Sin datos de inventario')
                      : _buildDistribucionInventario(
                        context,
                        data.distribucionInventario,
                      ),
                ],
              ),
            ),
          );
        },
      ),

      // 💬 Chatbot flotante agregado sin alterar la lógica existente
      floatingActionButton: FloatingActionButton(
        heroTag: 'chatbot_dueno',
        backgroundColor: const Color(0xFF6A1B9A),
        tooltip: 'Abrir Chatbot',
        elevation: 6,
        child: const Icon(Icons.chat, color: Colors.white),
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.white,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            builder:
                (_) => const SizedBox(
                  height: 600,
                  child: ChatbotScreen(), // ✅ Chatbot modal
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
          colors: [Color(0xFFD1C4E9), Color(0xFFB39DDB)],
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
                Icons.analytics_outlined,
                size: isMobile ? 100 : 160,
                color: Colors.deepPurple.shade900,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bienvenido, Dueño 👑',
                style: TextStyle(
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF4A148C),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Visualiza ingresos, rentabilidad y desempeño general del negocio.',
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
            Icon(icon, size: 38, color: const Color(0xFF4A148C)),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF4A148C),
              ),
            ),
            const Spacer(),
            Text(
              value,
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: Color(0xFF311B92),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 🔹 Título de secciones
  Widget _buildSectionTitle(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Color(0xFF4A148C),
      ),
    );
  }

  // 🔸 Placeholder temporal para gráficas
  Widget _buildPlaceholder(String text) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      height: 160,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.purple.shade100.withOpacity(0.3),
            blurRadius: 6,
            offset: const Offset(2, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(color: Colors.black54, fontSize: 14),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  Widget _buildRentablesPreview(BuildContext context, List productos) {
    if (productos.isEmpty) {
      return Container(
        margin: const EdgeInsets.only(top: 12),
        height: 160,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.purple.shade100.withOpacity(0.3),
              blurRadius: 6,
              offset: const Offset(2, 3),
            ),
          ],
        ),
        child: const Center(
          child: Text(
            '🏆 0 productos analizados',
            style: TextStyle(color: Colors.black54),
          ),
        ),
      );
    }

    final top = productos.take(3).toList();

    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/dueno/productos_rentables');
      },
      child: Container(
        margin: const EdgeInsets.only(top: 12),
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.purple.shade100.withOpacity(0.3),
              blurRadius: 6,
              offset: const Offset(2, 3),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            for (final p in top)
              ListTile(
                leading: const Icon(
                  Icons.emoji_events,
                  color: Color(0xFF6A1B9A),
                ),
                title: Text(
                  p.nombre ?? 'Sin nombre',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF4A148C),
                  ),
                ),
                trailing: Text(
                  '+\$${p.ganancia.toStringAsFixed(2)}',
                  style: const TextStyle(color: Colors.green),
                ),
              ),
            const Divider(),
            Text(
              'Ver todos los productos (${productos.length})',
              style: const TextStyle(
                color: Color(0xFF4A148C),
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDistribucionInventario(
    BuildContext context,
    List distribucionInventario,
  ) {
    final totalValor = distribucionInventario.fold<double>(
      0,
      (sum, e) => sum + e.valorInventario,
    );

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.purple.shade100.withOpacity(0.3),
            blurRadius: 6,
            offset: const Offset(2, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            height: 220,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 45,
                sections:
                    distribucionInventario
                        .map(
                          (c) => PieChartSectionData(
                            title: c.categoria,
                            value: c.valorInventario,
                            color:
                                Colors.primaries[distribucionInventario.indexOf(
                                      c,
                                    ) %
                                    Colors.primaries.length],
                            radius: 80,
                            titleStyle: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        )
                        .toList(),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '🥐 ${distribucionInventario.length} categorías analizadas\n💰 Valor total: \$${totalValor.toStringAsFixed(2)}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, color: Colors.black54),
          ),
        ],
      ),
    );
  }
}

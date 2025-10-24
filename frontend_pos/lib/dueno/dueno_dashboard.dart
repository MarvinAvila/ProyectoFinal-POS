import 'package:flutter/material.dart';
import 'package:frontend_pos/dueno/dashboard/iva_recaudado_screen.dart';
import 'package:frontend_pos/dueno/dashboard/promedio_venta_screen.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/dueno/dashboard/dueno_repository.dart';
import 'package:frontend_pos/alertas/alerts_screen.dart';
import 'package:frontend_pos/admin/ventas/ventas_screen.dart';
import 'package:frontend_pos/gerente/ventas/top_productos_screen.dart';
import 'package:frontend_pos/dueno/dashboard/crecimiento_mensual_chart.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:frontend_pos/chatbot/screens/chatbot_screen.dart';

class DuenoDashboard extends StatefulWidget {
  const DuenoDashboard({super.key});

  @override
  State<DuenoDashboard> createState() => _DuenoDashboardState();
}

class _DuenoDashboardState extends State<DuenoDashboard> {
  final repo = DuenoDashboardRepository();
  DuenoDashboardData? _dashboardData; // ✅ Cambiar late Future por nullable
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final data = await repo.fetchDashboard();

      setState(() {
        _dashboardData = data;
        _isLoading = false;
      });
    } catch (error) {
      setState(() {
        _isLoading = false;
        _error = error.toString();
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
      ),

      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Error: $_error',
                      style: const TextStyle(color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _loadDashboard,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              )
              : RefreshIndicator(
                onRefresh: _loadDashboard,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildWelcomePanel(context, isMobile),
                      const SizedBox(height: 24),

                      // 🟦 MENÚ HORIZONTAL DEL DUEÑO
                      Container(
                        margin: const EdgeInsets.only(top: 8, bottom: 20),
                        height: 60,
                        decoration: BoxDecoration(
                          color: const Color(0xFF311B92),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.deepPurple.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          children: [
                            _buildTopButton(
                              context,
                              icon: Icons.receipt_long_outlined,
                              label: 'Ventas',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const VentasScreen(),
                                  ),
                                ).then((_) => _loadDashboard());
                              },
                            ),
                            _buildTopButton(
                              context,
                              icon: Icons.account_balance_wallet_outlined,
                              label: 'IVA',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const IvaRecaudadoScreen(),
                                  ),
                                ).then((_) => _loadDashboard());
                              },
                            ),
                            _buildTopButton(
                              context,
                              icon: Icons.trending_up,
                              label: 'Promedio',
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const PromedioVentaScreen(),
                                  ),
                                ).then((_) => _loadDashboard());
                              },
                            ),
                            _buildTopButton(
                              context,
                              icon: Icons.warning_amber_rounded,
                              label: 'Alertas',
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
                      ),

                      const SizedBox(height: 24),
                      _buildSectionTitle('Crecimiento Mensual'),
                      Container(
                        margin: const EdgeInsets.only(top: 12),
                        height: 350,
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
                        child: CrecimientoMensualChart(
                          datos: _dashboardData!.crecimiento,
                        ),
                      ),

                      const SizedBox(height: 24),
                      _buildSectionTitle('Productos más Rentables'),
                      _buildRentablesPreview(
                        context,
                        _dashboardData!.productosRentables,
                      ),

                      const SizedBox(height: 24),
                      _buildSectionTitle('Distribución de Inventario'),
                      _dashboardData!.distribucionInventario.isEmpty
                          ? _buildPlaceholder('🥧 Sin datos de inventario')
                          : _buildDistribucionInventario(
                            context,
                            _dashboardData!.distribucionInventario,
                          ),
                    ],
                  ),
                ),
              ),

      // 💬 Chatbot flotante
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
            builder: (_) => const SizedBox(height: 600, child: ChatbotScreen()),
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

  // 🔹 Botón del menú horizontal
  Widget _buildTopButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30),
          boxShadow: [
            BoxShadow(
              color: Colors.purple.shade100.withOpacity(0.3),
              blurRadius: 6,
              offset: const Offset(2, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF4A148C), size: 22),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Color(0xFF4A148C),
                fontSize: 15,
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

            // const Divider(),
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
            height: 320, // un poco más alto para respirar
            child: PieChart(
              PieChartData(
                sectionsSpace: 3, // separación entre porciones
                centerSpaceRadius: 60, // centro más pequeño
                startDegreeOffset: -90, // empieza arriba (más simétrico)
                sections:
                    distribucionInventario.map((c) {
                      final porcentaje = (c.valorInventario / totalValor) * 100;

                      return PieChartSectionData(
                        title:
                            porcentaje < 8
                                ? '' // 🔹 Oculta texto en porciones pequeñas
                                : '${c.categoria}\n${porcentaje.toStringAsFixed(1)}%',
                        value: c.valorInventario,
                        color:
                            Colors.accents[distribucionInventario.indexOf(c) %
                                Colors.accents.length],
                        radius: 100,
                        titleStyle: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      );
                    }).toList(),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // 🔹 Leyenda personalizada
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 12,
            runSpacing: 6,
            children:
                distribucionInventario.map((c) {
                  final color =
                      Colors.accents[distribucionInventario.indexOf(c) %
                          Colors.accents.length];
                  final porcentaje = (c.valorInventario / totalValor * 100)
                      .toStringAsFixed(1);
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        '${c.categoria} ($porcentaje%)',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  );
                }).toList(),
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

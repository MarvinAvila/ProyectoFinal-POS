import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:frontend_pos/dueno/dashboard/iva_recaudado_screen.dart';
import 'package:frontend_pos/dueno/dashboard/promedio_venta_screen.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/dueno/dashboard/dueno_repository.dart';
import 'package:frontend_pos/alertas/alerts_screen.dart';
import 'package:frontend_pos/admin/ventas/ventas_screen.dart';
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
  DuenoDashboardData? _dashboardData;
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
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.2,
          colors: [Color(0xFF0A0E21), Color(0xFF1A237E)],
        ),
      ),
      child: Scaffold(
        backgroundColor: const Color.fromARGB(0, 247, 241, 241),
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: ClipRRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: AppBar(
                title: const Text('Panel del Dueño'),
                centerTitle: true,
                backgroundColor: Colors.white.withOpacity(0.1),
                elevation: 0,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
          ),
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
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildWelcomePanel(isMobile),
                        const SizedBox(height: 24),
                        _buildTopBar(context),
                        const SizedBox(height: 24),
                        _buildSectionTitle('Crecimiento Mensual'),
                        const SizedBox(height: 12),
                        _buildChartSection(),
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

        floatingActionButton: FloatingActionButton(
          heroTag: 'chatbot_dueno',
          backgroundColor: const Color(0xFF00B0FF),
          child: const Icon(Icons.chat_bubble_outline, color: Colors.white),
          onPressed: () {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.white,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder:
                  (_) => const SizedBox(height: 600, child: ChatbotScreen()),
            );
          },
        ),
      ),
    );
  }

  Widget _buildWelcomePanel(bool isMobile) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(isMobile ? 18 : 28),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bienvenido, Dueño 👑',
                style: TextStyle(
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: FontWeight.bold,
                  color: Colors.lightBlueAccent.shade100,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Visualiza ingresos, rentabilidad y desempeño general del negocio.',
                style: TextStyle(color: Colors.white70, fontSize: 16),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _topButton(context, Icons.receipt_long_outlined, 'Ventas', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const VentasScreen()),
            ).then((_) => _loadDashboard());
          }),
          _topButton(context, Icons.account_balance_wallet_outlined, 'IVA', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const IvaRecaudadoScreen()),
            ).then((_) => _loadDashboard());
          }),
          _topButton(context, Icons.trending_up_rounded, 'Promedio', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PromedioVentaScreen()),
            ).then((_) => _loadDashboard());
          }),
          _topButton(context, Icons.warning_amber_rounded, 'Alertas', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AlertsScreen()),
            ).then((_) => _loadDashboard());
          }),
        ],
      ),
    );
  }

  Widget _topButton(
    BuildContext context,
    IconData icon,
    String label,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: Colors.white24),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.lightBlueAccent.shade100, size: 22),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white70,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
        fontSize: 18,
      ),
    );
  }

  Widget _buildChartSection() {
    return Container(
      height: 340,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: CrecimientoMensualChart(datos: _dashboardData!.crecimiento),
    );
  }

  Widget _buildPlaceholder(String text) {
    return Container(
      height: 140,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Text(text, style: const TextStyle(color: Colors.white60)),
    );
  }

  Widget _buildRentablesPreview(BuildContext context, List productos) {
    if (productos.isEmpty)
      return _buildPlaceholder('🏆 Sin productos rentables');

    final top = productos.take(3).toList();
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        children:
            top.map((p) {
              return ListTile(
                leading: const Icon(
                  Icons.emoji_events,
                  color: Colors.lightBlueAccent,
                ),
                title: Text(
                  p.nombre ?? 'Sin nombre',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                trailing: Text(
                  '+\$${p.ganancia.toStringAsFixed(2)}',
                  style: const TextStyle(color: Colors.greenAccent),
                ),
              );
            }).toList(),
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
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
        boxShadow: [
          BoxShadow(
            color: Colors.blueAccent.withOpacity(0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // 🎯 Pie Chart
          SizedBox(
            height: 320,
            child: Stack(
              alignment: Alignment.center,
              children: [
                PieChart(
                  PieChartData(
                    startDegreeOffset: -90,
                    centerSpaceRadius: 70,
                    sectionsSpace: 3,
                    borderData: FlBorderData(show: false),
                    sections:
                        distribucionInventario.map((c) {
                          final porcentaje =
                              (c.valorInventario / totalValor) * 100;
                          final mostrarTexto =
                              porcentaje > 4; // evita saturación

                          return PieChartSectionData(
                            value: c.valorInventario,
                            title:
                                mostrarTexto
                                    ? '${c.categoria}\n${porcentaje.toStringAsFixed(1)}%'
                                    : '',
                            radius: 110,
                            color:
                                Colors.primaries[distribucionInventario.indexOf(
                                      c,
                                    ) %
                                    Colors.primaries.length],
                            titleStyle: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          );
                        }).toList(),
                  ),
                ),

                // 💎 centro difuminado tipo glass
                ClipRRect(
                  borderRadius: BorderRadius.circular(100),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withOpacity(0.2),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          'Total\n\$${totalValor.toStringAsFixed(0)}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 📊 Leyenda visual
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 10,
            runSpacing: 6,
            children:
                distribucionInventario.map((c) {
                  final color =
                      Colors.primaries[distribucionInventario.indexOf(c) %
                          Colors.primaries.length];
                  final porcentaje = (c.valorInventario / totalValor * 100)
                      .toStringAsFixed(1);
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    child: Row(
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
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
          ),

          const SizedBox(height: 16),
          Text(
            '💰 Valor total del inventario: \$${totalValor.toStringAsFixed(2)}',
            style: const TextStyle(
              color: Colors.white60,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:frontend_pos/gerente/ventas/ventas_dia_screen.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'gerente_repository.dart';
import 'package:frontend_pos/admin/ventas/ventas_screen.dart';
import 'package:frontend_pos/alertas/alerts_screen.dart';
import 'package:frontend_pos/gerente/ventas/top_productos_screen.dart';
import 'package:frontend_pos/chatbot/screens/chatbot_screen.dart';

class GerenteDashboard extends StatefulWidget {
  const GerenteDashboard({super.key});

  @override
  State<GerenteDashboard> createState() => _GerenteDashboardScreenState();
}

class _GerenteDashboardScreenState extends State<GerenteDashboard> {
  final repo = GerenteDashboardRepository();
  GerenteDashboardData? _dashboardData; // ✅ Cambiar late Future por nullable
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
        title: const Text('Panel de Gerente'),
        backgroundColor: const Color(0xFF5D3A9B),
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
                            value: currency.format(_dashboardData!.ventasHoy),
                            icon: Icons.attach_money,
                            color1: const Color(0xFFFFD6E8),
                            color2: const Color(0xFFD1C4E9),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const VentasDiaScreen(),
                                ),
                              ).then((_) => _loadDashboard());
                            },
                          ),
                          _buildCard(
                            title: 'Ventas',
                            value: currency.format(_dashboardData!.ventasMes),
                            icon: Icons.show_chart,
                            color1: const Color(0xFFB3E5FC),
                            color2: const Color(0xFF81D4FA),
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
                            title: 'Top Productos',
                            value: '${_dashboardData!.topProductos.length}',
                            icon: Icons.leaderboard,
                            color1: const Color(0xFFFFF59D),
                            color2: const Color(0xFFFFCC80),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const TopProductosScreen(),
                                ),
                              ).then((_) => _loadDashboard());
                            },
                          ),
                          _buildCard(
                            title: 'Alertas Pendientes',
                            value: '${_dashboardData!.alertasPendientes}',
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
                    ],
                  ),
                ),
              ),

      // 💬 Chatbot flotante
      floatingActionButton: FloatingActionButton(
        heroTag: 'chatbot_button_gerente',
        backgroundColor: Colors.teal,
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
                'Bienvenido, Gerente 👋',
                style: TextStyle(
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF4A148C),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Supervisa ventas, alertas y desempeño en un solo lugar.',
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

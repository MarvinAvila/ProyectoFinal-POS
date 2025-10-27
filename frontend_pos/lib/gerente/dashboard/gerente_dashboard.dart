import 'dart:ui';
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
  GerenteDashboardData? _dashboardData;
  bool _isLoading = true;
  String? _error;
  int _currentIndex = 0;

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

  void _onItemTapped(int index) async {
    setState(() => _currentIndex = index);

    switch (index) {
      case 0:
        await _loadDashboard();
        break;
      case 1:
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const VentasDiaScreen()),
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
          MaterialPageRoute(builder: (_) => const TopProductosScreen()),
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
        // 🌌 Fondo degradado azul con efecto radial tipo neón
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0A0E21), Color(0xFF0F172A), Color(0xFF1E293B)],
          ),
        ),
        child: Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topRight,
              radius: 1.4,
              colors: [
                Color(0xFF1E3A8A),
                Color.fromARGB(255, 9, 24, 66),
                Color.fromARGB(255, 4, 26, 85),
                Colors.transparent,
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                // 🧊 AppBar glass con blur y botón de regreso
                ClipRRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: AppBar(
                      leading: IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                      title: const Text('Panel de Gerente'),
                      backgroundColor: Colors.white.withOpacity(0.05),
                      elevation: 0,
                      foregroundColor: Colors.white,
                      actions: const [SizedBox(width: 48)],
                    ),
                  ),
                ),

                // 🌆 CONTENIDO PRINCIPAL
                Expanded(
                  child:
                      _isLoading
                          ? const Center(
                            child: CircularProgressIndicator(
                              color: Colors.white,
                            ),
                          )
                          : _error != null
                          ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Error: $_error',
                                  style: const TextStyle(
                                    color: Colors.redAccent,
                                  ),
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
                                horizontal: 20,
                                vertical: 16,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildWelcomePanel(context, isMobile),
                                  const SizedBox(height: 18),
                                  _buildStatsOverview(
                                    context,
                                    _dashboardData!,
                                    currency,
                                  ),
                                ],
                              ),
                            ),
                          ),
                ),
              ],
            ),
          ),
        ),
      ),

      // 💬 FAB Chatbot flotante
      floatingActionButton: FloatingActionButton(
        heroTag: 'chatbot_button_gerente',
        backgroundColor: const Color.fromARGB(
          255,
          154,
          68,
          220,
        ), // tono violeta-neón
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

      // 🌈 Bottom Navigation Bar glass estilo Admin
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
                    icon: Icons.calendar_today_rounded,
                    label: "Ventas Día",
                    isSelected: _currentIndex == 1,
                    onTap: () => _onItemTapped(1),
                  ),
                  _buildCenterButton(onTap: () => _onItemTapped(2)),
                  _buildNavItem(
                    icon: Icons.leaderboard_rounded,
                    label: "Top Productos",
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
                'Bienvenido, Gerente 👋',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF60A5FA),
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Supervisa ventas, alertas y desempeño en un solo lugar.',
                style: TextStyle(fontSize: 16, color: Color(0xFFCBD5E1)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 📈 BLOQUE “RESUMEN GENERAL”
  Widget _buildStatsOverview(
    BuildContext context,
    GerenteDashboardData data,
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
              _buildStatRow(
                'Ventas del Día',
                currency.format(data.ventasHoy),
                icon: Icons.attach_money,
                onTap: () => _onItemTapped(1),
              ),
              _buildStatRow(
                'Ventas del Mes',
                currency.format(data.ventasMes),
                icon: Icons.show_chart,
                onTap: () => _onItemTapped(2),
              ),
              _buildStatRow(
                'Top Productos',
                '${data.topProductos.length}',
                icon: Icons.leaderboard,
                onTap: () => _onItemTapped(3),
              ),
              _buildStatRow(
                'Alertas Pendientes',
                '${data.alertasPendientes}',
                icon: Icons.warning_amber_rounded,
                onTap: () => _onItemTapped(4),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatRow(
    String title,
    String value, {
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFF60A5FA), size: 22),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Color(0xFFCBD5E1),
                  ),
                ),
              ],
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFFE2E8F0),
              ),
            ),
          ],
        ),
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
            "Ventas Mes",
            style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
          ),
        ],
      ),
    );
  }
}

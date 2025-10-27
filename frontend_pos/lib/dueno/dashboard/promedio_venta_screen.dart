import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'dart:ui';

class PromedioVentaScreen extends StatefulWidget {
  const PromedioVentaScreen({super.key});

  @override
  State<PromedioVentaScreen> createState() => _PromedioVentaScreenState();
}

class _PromedioVentaScreenState extends State<PromedioVentaScreen> {
  final api = ApiClient();
  bool loading = true;
  String? error;
  List ventas = [];

  @override
  void initState() {
    super.initState();
    _fetchPromedioVenta();
  }

  Future<void> _fetchPromedioVenta() async {
    try {
      // ✅ Petición simplificada. ApiClient añade el token automáticamente.
      final res = await api.get('/dashboard/resumen');

      setState(() {
        ventas = asList(asMap(res)['ventas_recientes']);
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  double _calcularPromedio() {
    if (ventas.isEmpty) return 0.0;
    double total = 0;
    for (final v in ventas) {
      total +=
          (v['total'] is num)
              ? v['total']
              : double.tryParse('${v['total'] ?? 0}') ?? 0.0;
    }
    return total / ventas.length;
  }

  @override
  Widget build(BuildContext context) {
    final mx = NumberFormat.simpleCurrency(locale: 'es_MX');
    final df = DateFormat('yyyy-MM-dd HH:mm');

    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.2,
          colors: [
            Color(0xFF0A0E21), // azul profundo
            Color(0xFF1A237E), // azul neón oscuro
          ],
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: ClipRRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: AppBar(
                title: const Text('Promedio de Venta'),
                centerTitle: true,
                elevation: 0,
                backgroundColor: Colors.white.withOpacity(0.08),
                foregroundColor: Colors.white,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
          ),
        ),
        body:
            loading
                ? const Center(
                  child: CircularProgressIndicator(color: Colors.cyanAccent),
                )
                : error != null
                ? Center(
                  child: Text(
                    'Error: $error',
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                )
                : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // 💰 Card Promedio
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.1),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blueAccent.withOpacity(0.2),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Promedio General de Venta',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            mx.format(_calcularPromedio()),
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.cyanAccent,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),
                    const Text(
                      'Detalle de Ventas',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (ventas.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(
                          child: Text(
                            'No hay ventas registradas.',
                            style: TextStyle(color: Colors.white60),
                          ),
                        ),
                      )
                    else
                      ...ventas.map(
                        (v) => Container(
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.07),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.1),
                            ),
                          ),
                          child: ListTile(
                            leading: const Icon(
                              Icons.show_chart,
                              color: Colors.cyanAccent,
                            ),
                            title: Text(
                              mx.format(v['total'] ?? 0),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            subtitle: Text(
                              '${v['forma_pago'] ?? 'N/A'}  •  ${v['fecha'] != null ? df.format(DateTime.parse(v['fecha'])) : 'Sin fecha'}',
                              style: const TextStyle(color: Colors.white70),
                            ),
                            trailing: Text(
                              '#${v['id_venta'] ?? ''}',
                              style: const TextStyle(color: Colors.white54),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
      ),
    );
  }
}

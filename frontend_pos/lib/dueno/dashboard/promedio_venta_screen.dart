import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/auth/auth_service.dart';

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
      final token = AuthService.token;

      final res = await api.get(
        '/dashboard/resumen',
        headers: {
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty)
            'Authorization': 'Bearer $token',
        },
      );

      setState(() {
        ventas = res['ventas_recientes'] ?? [];
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Promedio de Venta'),
        backgroundColor: const Color(0xFF4A148C),
        foregroundColor: Colors.white,
      ),
      backgroundColor: const Color(0xFFF5F0FA),
      body:
          loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
              ? Center(child: Text('Error: $error'))
              : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // 💰 Card de Promedio
                  Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 3,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Promedio General de Venta',
                            style: TextStyle(
                              color: Color(0xFF4A148C),
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            mx.format(_calcularPromedio()),
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF311B92),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  const Text(
                    'Detalle de Ventas',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF4A148C),
                    ),
                  ),
                  const SizedBox(height: 8),

                  if (ventas.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('No hay ventas registradas.')),
                    )
                  else
                    ...ventas.map(
                      (v) => Card(
                        margin: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ListTile(
                          leading: const Icon(
                            Icons.show_chart,
                            color: Color(0xFF4A148C),
                          ),
                          title: Text(mx.format(v['total'] ?? 0)),
                          subtitle: Text(
                            '${v['forma_pago'] ?? 'N/A'}  •  ${v['fecha'] != null ? df.format(DateTime.parse(v['fecha'])) : 'Sin fecha'}',
                          ),
                          trailing: Text('#${v['id_venta'] ?? ''}'),
                        ),
                      ),
                    ),
                ],
              ),
    );
  }
}

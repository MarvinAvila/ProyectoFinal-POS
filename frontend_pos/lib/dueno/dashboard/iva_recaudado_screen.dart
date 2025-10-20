import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/auth/auth_service.dart'; // 👈 Asegúrate de importar esto arriba

class IvaRecaudadoScreen extends StatefulWidget {
  const IvaRecaudadoScreen({super.key});

  @override
  State<IvaRecaudadoScreen> createState() => _IvaRecaudadoScreenState();
}

class _IvaRecaudadoScreenState extends State<IvaRecaudadoScreen> {
  final api = ApiClient();
  bool loading = true;
  String? error;
  List ventas = [];

  @override
  void initState() {
    super.initState();
    _fetchIvaRecaudado();
  }

  Future<void> _fetchIvaRecaudado() async {
    try {
      // 🟣 Obtenemos el token actual
      final token = AuthService.token;

      final res = await api.get(
        '/dashboard/resumen',
        headers: {
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty)
            'Authorization': 'Bearer $token',
        },
      );

      final ventasRecientes = res['ventas_recientes'] ?? [];

      setState(() {
        ventas = ventasRecientes;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final mx = NumberFormat.simpleCurrency(locale: 'es_MX');

    return Scaffold(
      appBar: AppBar(
        title: const Text('IVA Recaudado'),
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
                  // 🧾 Total IVA general
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
                            'Total IVA Recaudado',
                            style: TextStyle(
                              color: Color(0xFF4A148C),
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            mx.format(_calcularTotalIva()),
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
                    'Detalle de Ventas con IVA',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF4A148C),
                    ),
                  ),
                  const SizedBox(height: 8),

                  if (ventas.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No hay ventas registradas con IVA.'),
                      ),
                    )
                  else
                    ...ventas.map((v) => _buildVentaCard(v, mx)),
                ],
              ),
    );
  }

  double _calcularTotalIva() {
    double total = 0;
    for (final v in ventas) {
      total +=
          (v['iva'] is num)
              ? v['iva']
              : double.tryParse('${v['iva'] ?? 0}') ?? 0;
    }
    return total;
  }

  Widget _buildVentaCard(Map v, NumberFormat mx) {
    final fecha =
        v['fecha'] != null
            ? DateFormat('yyyy-MM-dd HH:mm').format(DateTime.parse(v['fecha']))
            : 'Sin fecha';
    final iva =
        (v['iva'] is num) ? v['iva'] : double.tryParse('${v['iva'] ?? 0}') ?? 0;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: const Icon(Icons.receipt_long, color: Color(0xFF4A148C)),
        title: Text(mx.format(iva)),
        subtitle: Text('${v['forma_pago'] ?? 'N/A'}  •  $fecha'),
        trailing: Text('#${v['id_venta'] ?? ''}'),
      ),
    );
  }
}

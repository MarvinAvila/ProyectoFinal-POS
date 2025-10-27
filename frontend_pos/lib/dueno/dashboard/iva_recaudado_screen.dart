import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'dart:ui';

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
      // ✅ Petición simplificada. ApiClient añade el token automáticamente.
      final res = await api.get('/dashboard/resumen');
      // ✅ Usamos los helpers para parsear la respuesta de forma segura.
      final ventasRecientes = asList(asMap(res)['ventas_recientes']);

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
                title: const Text('IVA Recaudado'),
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
                    // 🧾 Total IVA general
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
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Total IVA Recaudado',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            mx.format(_calcularTotalIva()),
                            style: const TextStyle(
                              fontSize: 30,
                              fontWeight: FontWeight.bold,
                              color: Colors.cyanAccent,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),
                    const Text(
                      'Detalle de Ventas con IVA',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),

                    if (ventas.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(
                          child: Text(
                            'No hay ventas registradas con IVA.',
                            style: TextStyle(color: Colors.white60),
                          ),
                        ),
                      )
                    else
                      ...ventas.map((v) => _buildVentaCard(v, mx)),
                  ],
                ),
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

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: ListTile(
        leading: const Icon(Icons.receipt_long, color: Colors.cyanAccent),
        title: Text(
          mx.format(iva),
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Text(
          '${v['forma_pago'] ?? 'N/A'}  •  $fecha',
          style: const TextStyle(color: Colors.white70),
        ),
        trailing: Text(
          '#${v['id_venta'] ?? ''}',
          style: const TextStyle(color: Colors.white54),
        ),
      ),
    );
  }
}

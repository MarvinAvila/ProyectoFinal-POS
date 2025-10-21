import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/widgets.dart'; // tu AppLoader, EmptyView

class VentasDiaScreen extends StatefulWidget {
  const VentasDiaScreen({super.key});

  @override
  State<VentasDiaScreen> createState() => _VentasDiaScreenState();
}

class _VentasDiaScreenState extends State<VentasDiaScreen> {
  final api = ApiClient();
  bool cargando = true;
  List<dynamic> ventas = [];
  double totalDia = 0.0;

  @override
  void initState() {
    super.initState();
    _cargarVentasDelDia();
  }

  Future<void> _cargarVentasDelDia() async {
    try {
      setState(() => cargando = true);
      // ✅ Petición simplificada. ApiClient maneja URL y token.
      final response = await api.get('/ventas/dia');

      // ✅ Usamos los helpers para parsear la respuesta de forma segura.
      final data = asMap(response);
      ventas = asList(data['ventas']);

      totalDia =
          (data['ingresos_totales'] is num)
              ? data['ingresos_totales'].toDouble()
              : double.tryParse('${data['ingresos_totales'] ?? 0}') ?? 0.0;
    } catch (e) {
      debugPrint('Error cargando ventas del día: $e');
    } finally {
      setState(() => cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ventas del Día'),
        backgroundColor: Colors.deepPurple,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar',
            onPressed: _cargarVentasDelDia,
          ),
        ],
      ),
      backgroundColor: const Color(0xFFF3E5F5),
      body:
          cargando
              ? const AppLoader()
              : ventas.isEmpty
              ? const EmptyView(message: 'No hay ventas registradas hoy.')
              : RefreshIndicator(
                onRefresh: _cargarVentasDelDia,
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: ventas.length + 1,
                  itemBuilder: (context, index) {
                    if (index == ventas.length) {
                      // Último elemento: resumen total
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text(
                            'Total del día: ${currency.format(totalDia)}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.deepPurple,
                            ),
                          ),
                        ),
                      );
                    }

                    final v = ventas[index];
                    final fecha = v['fecha'] ?? '';
                    final hora = fecha.toString().substring(11, 16);
                    final usuario = v['usuario_nombre'] ?? '—';
                    final formaPago = v['forma_pago'] ?? 'efectivo';
                    final total =
                        (v['total'] is num)
                            ? v['total'].toDouble()
                            : double.tryParse('${v['total'] ?? 0}') ?? 0.0;

                    return Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 3,
                      margin: const EdgeInsets.symmetric(
                        vertical: 8,
                        horizontal: 6,
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.deepPurple.shade100,
                          child: Text(
                            '${index + 1}',
                            style: const TextStyle(
                              color: Colors.deepPurple,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        title: Text(
                          'Venta #${v['id_venta'] ?? ''}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.deepPurple,
                          ),
                        ),
                        subtitle: Text(
                          'Hora: $hora\nUsuario: $usuario\nPago: ${formaPago.toUpperCase()}',
                          style: const TextStyle(fontSize: 13),
                        ),
                        trailing: Text(
                          currency.format(total),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.deepPurple,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
    );
  }
}

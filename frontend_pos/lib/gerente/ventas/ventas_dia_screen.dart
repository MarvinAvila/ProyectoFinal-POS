import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/widgets.dart'; // tu AppLoader, EmptyView
import 'dart:ui';

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
                title: const Text('Ventas del Día'),
                centerTitle: true,
                elevation: 0,
                backgroundColor: Colors.white.withOpacity(0.08),
                foregroundColor: Colors.white,
                actions: [
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.cyanAccent),
                    tooltip: 'Actualizar',
                    onPressed: _cargarVentasDelDia,
                  ),
                ],
              ),
            ),
          ),
        ),
        body:
            cargando
                ? const AppLoader()
                : ventas.isEmpty
                ? const EmptyView(message: 'No hay ventas registradas hoy.')
                : RefreshIndicator(
                  onRefresh: _cargarVentasDelDia,
                  color: Colors.cyanAccent,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: ventas.length + 1,
                    itemBuilder: (context, index) {
                      if (index == ventas.length) {
                        // Resumen total
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          child: Center(
                            child: Text(
                              'Total del día: ${currency.format(totalDia)}',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.cyanAccent,
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

                      return Container(
                        margin: const EdgeInsets.symmetric(
                          vertical: 8,
                          horizontal: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.07),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.1),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.blueAccent.withOpacity(0.2),
                              blurRadius: 6,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.cyanAccent.withOpacity(
                              0.15,
                            ),
                            child: Text(
                              '${index + 1}',
                              style: const TextStyle(
                                color: Colors.cyanAccent,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          title: Text(
                            'Venta #${v['id_venta'] ?? ''}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          subtitle: Text(
                            'Hora: $hora\nUsuario: $usuario\nPago: ${formaPago.toUpperCase()}',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                          trailing: Text(
                            currency.format(total),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.greenAccent,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
      ),
    );
  }
}

// lib/admin/ventas/ventas_screen.dart
import 'package:flutter/material.dart';
import 'package:frontend_pos/admin/ventas/venta_controller.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class VentasScreen extends StatelessWidget {
  const VentasScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => VentasController()..init(),
      child: const _VentasView(),
    );
  }
}

class _VentasView extends StatelessWidget {
  const _VentasView();

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<VentasController>();
    final mx = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    final df = DateFormat('yyyy-MM-dd HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ventas'),
        backgroundColor: const Color(0xFF5D3A9B),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: ctrl.loading ? null : () => ctrl.init(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      backgroundColor: const Color(0xFFF5F0FA),
      body:
          ctrl.loading
              ? const Center(child: CircularProgressIndicator())
              : ctrl.error != null
              ? Center(child: Text(ctrl.error!))
              : ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  // Card de total
                  Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 3,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.trending_up,
                            color: Color(0xFF4A148C),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'Ventas totales (histórico)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF4A148C),
                              ),
                            ),
                          ),
                          Text(
                            mx.format(ctrl.ingresosTotales),
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 8),
                  Text(
                    'Listado de ventas (${ctrl.ventas.length})',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF4A148C),
                    ),
                  ),

                  const SizedBox(height: 6),
                  if (ctrl.ventas.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(
                          child: Text('No hay ventas registradas.'),
                        ),
                      ),
                    )
                  else
                    ...ctrl.ventas.map(
                      (v) => Card(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 2,
                        child: ListTile(
                          leading: const CircleAvatar(
                            child: Icon(Icons.receipt_long),
                          ),
                          title: Text(
                            mx.format(v.total),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF4A148C),
                            ),
                          ),
                          subtitle: Text(
                            [
                              // fecha (tolerante a null)
                              v.fecha != null
                                  ? df.format(v.fecha!)
                                  : 'Sin fecha',
                              '•',
                              v.formaPago,
                              // opcional: muestra el id de usuario si existe
                              if (v.idUsuario != null)
                                '• Usuario #${v.idUsuario}',
                            ].join('  '),
                          ),

                          trailing: Text('#${v.idVenta}'),
                          onTap: () {
                            // Aquí luego navegas al detalle de venta
                          },
                        ),
                      ),
                    ),
                  const SizedBox(height: 12),

                  // Paginación simple
                  if (ctrl.pages > 1)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          onPressed:
                              ctrl.page > 1 && !ctrl.loading
                                  ? () =>
                                      ctrl.fetchAll(pageOverride: ctrl.page - 1)
                                  : null,
                          icon: const Icon(Icons.chevron_left),
                        ),
                        Text('Página ${ctrl.page} de ${ctrl.pages}'),
                        IconButton(
                          onPressed:
                              ctrl.page < ctrl.pages && !ctrl.loading
                                  ? () =>
                                      ctrl.fetchAll(pageOverride: ctrl.page + 1)
                                  : null,
                          icon: const Icon(Icons.chevron_right),
                        ),
                      ],
                    ),
                ],
              ),
    );
  }
}

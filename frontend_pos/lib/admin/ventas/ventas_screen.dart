// lib/admin/ventas/ventas_screen.dart
import 'package:flutter/material.dart';
import 'package:frontend_pos/admin/ventas/venta_controller.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'dart:ui';

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

    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.2,
          colors: [
            Color(0xFF0A0E21), // Azul profundo
            Color(0xFF1A237E), // Azul neón oscuro
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
                title: const Text('Ventas'),
                centerTitle: true,
                elevation: 0,
                backgroundColor: Colors.white.withOpacity(0.08),
                foregroundColor: Colors.white,
                actions: [
                  IconButton(
                    onPressed: ctrl.loading ? null : () => ctrl.init(),
                    icon: const Icon(Icons.refresh, color: Colors.cyanAccent),
                    tooltip: 'Actualizar',
                  ),
                ],
              ),
            ),
          ),
        ),
        body:
            ctrl.loading
                ? const Center(
                  child: CircularProgressIndicator(color: Colors.cyanAccent),
                )
                : ctrl.error != null
                ? Center(
                  child: Text(
                    ctrl.error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                )
                : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // 💰 Card de total
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.07),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.1),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blueAccent.withOpacity(0.25),
                            blurRadius: 6,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.trending_up,
                            color: Colors.cyanAccent,
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'Ventas totales (histórico)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          Text(
                            mx.format(ctrl.ingresosTotales),
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Colors.greenAccent,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),
                    Text(
                      'Listado de ventas (${ctrl.ventas.length})',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        fontSize: 16,
                      ),
                    ),

                    const SizedBox(height: 8),
                    if (ctrl.ventas.isEmpty)
                      Container(
                        margin: const EdgeInsets.symmetric(vertical: 16),
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.07),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.1),
                          ),
                        ),
                        child: const Center(
                          child: Text(
                            'No hay ventas registradas.',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ),
                      )
                    else
                      ...ctrl.ventas.map(
                        (v) => Container(
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.1),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.blueAccent.withOpacity(0.2),
                                blurRadius: 5,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Colors.cyanAccent.withOpacity(
                                0.15,
                              ),
                              child: const Icon(
                                Icons.receipt_long,
                                color: Colors.cyanAccent,
                              ),
                            ),
                            title: Text(
                              mx.format(v.total),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            subtitle: Text(
                              [
                                v.fecha != null
                                    ? df.format(v.fecha!)
                                    : 'Sin fecha',
                                '•',
                                v.formaPago,
                                if (v.idUsuario != null)
                                  '• Usuario #${v.idUsuario}',
                              ].join('  '),
                              style: const TextStyle(color: Colors.white70),
                            ),
                            trailing: Text(
                              '#${v.idVenta}',
                              style: const TextStyle(color: Colors.white54),
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),

                    // 🔹 Paginación simple
                    if (ctrl.pages > 1)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            onPressed:
                                ctrl.page > 1 && !ctrl.loading
                                    ? () => ctrl.fetchAll(
                                      pageOverride: ctrl.page - 1,
                                    )
                                    : null,
                            icon: const Icon(
                              Icons.chevron_left,
                              color: Colors.cyanAccent,
                            ),
                          ),
                          Text(
                            'Página ${ctrl.page} de ${ctrl.pages}',
                            style: const TextStyle(color: Colors.white),
                          ),
                          IconButton(
                            onPressed:
                                ctrl.page < ctrl.pages && !ctrl.loading
                                    ? () => ctrl.fetchAll(
                                      pageOverride: ctrl.page + 1,
                                    )
                                    : null,
                            icon: const Icon(
                              Icons.chevron_right,
                              color: Colors.cyanAccent,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
      ),
    );
  }
}

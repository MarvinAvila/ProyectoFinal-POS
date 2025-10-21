import 'package:flutter/material.dart';
import 'package:frontend_pos/admin/ventas/ventas_repository.dart';
import 'package:frontend_pos/core/http.dart'; // ✅ Importar para usar 'asMap'
import 'package:frontend_pos/core/widgets.dart';
import 'package:intl/intl.dart';

class VentasScreen extends StatefulWidget {
  const VentasScreen({super.key});

  @override
  State<VentasScreen> createState() => _VentasScreenState();
}

class _VentasScreenState extends State<VentasScreen> {
  final _repo = VentasRepository();
  late Future<List<dynamic>> _ventasFuture;

  @override
  void initState() {
    super.initState();
    _loadVentas();
  }

  void _loadVentas() {
    setState(() {
      // ✅ Llama al repositorio para obtener la lista de ventas.
      _ventasFuture = _repo.listar();
    });
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    final dateTime = DateFormat('dd/MM/yyyy HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial de Ventas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadVentas,
          ),
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _ventasFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const AppLoader(text: 'Cargando ventas...');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Error al cargar ventas: ${snapshot.error}',
              onRetry: _loadVentas,
            );
          }

          final ventas = snapshot.data ?? [];

          if (ventas.isEmpty) {
            return const EmptyView(message: 'No se han registrado ventas.');
          }

          return RefreshIndicator(
            onRefresh: () async => _loadVentas(),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: ventas.length,
              itemBuilder: (context, index) {
                final venta = asMap(ventas[index]);
                final fechaVenta = venta['fecha'] != null
                    ? dateTime.format(DateTime.parse(venta['fecha']))
                    : 'Sin fecha';

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text('${venta['id_venta'] ?? ''}'),
                    ),
                    title: Text(
                      currency.format(venta['total'] ?? 0),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      '${venta['forma_pago'] ?? 'N/A'} • $fechaVenta',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // Opcional: Navegar a una pantalla de detalle de la venta.
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

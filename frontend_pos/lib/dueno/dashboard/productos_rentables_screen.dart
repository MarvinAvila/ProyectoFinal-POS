import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/auth/auth_service.dart';

class ProductosRentablesScreen extends StatefulWidget {
  const ProductosRentablesScreen({super.key});

  @override
  State<ProductosRentablesScreen> createState() =>
      _ProductosRentablesScreenState();
}

class _ProductosRentablesScreenState extends State<ProductosRentablesScreen> {
  final api = ApiClient();
  bool loading = true;
  String? error;
  List productos = [];

  @override
  void initState() {
    super.initState();
    _fetchProductosRentables();
  }

  Future<void> _fetchProductosRentables() async {
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
        productos = res['productos_populares'] ?? [];
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
        title: const Text('Productos más Rentables'),
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
                  // 🏆 Card principal
                  Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 3,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.emoji_events,
                            color: Color(0xFF4A148C),
                            size: 30,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Top ${productos.length} productos más rentables',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF4A148C),
                                fontSize: 18,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  const Text(
                    'Ranking de Rentabilidad',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF4A148C),
                    ),
                  ),
                  const SizedBox(height: 8),

                  if (productos.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          '🏆 0 productos analizados',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ),
                    )
                  else
                    ...productos.map((p) {
                      final nombre = p['nombre'] ?? 'Sin nombre';
                      final precioCompra = (p['precio_compra'] ?? 0).toDouble();
                      final precioVenta = (p['precio_venta'] ?? 0).toDouble();
                      final ganancia = precioVenta - precioCompra;

                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 2,
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFFEDE7F6),
                            child: Icon(
                              Icons.trending_up,
                              color: Color(0xFF4A148C),
                            ),
                          ),
                          title: Text(
                            nombre,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF4A148C),
                            ),
                          ),
                          subtitle: Text(
                            'Compra: ${mx.format(precioCompra)}  •  Venta: ${mx.format(precioVenta)}',
                          ),
                          trailing: Text(
                            '+${mx.format(ganancia)}',
                            style: const TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      );
                    }),
                ],
              ),
    );
  }
}

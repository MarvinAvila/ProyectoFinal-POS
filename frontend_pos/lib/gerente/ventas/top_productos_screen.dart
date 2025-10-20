import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:frontend_pos/core/http.dart'; // tu cliente HTTP

class TopProductosScreen extends StatefulWidget {
  const TopProductosScreen({super.key});

  @override
  State<TopProductosScreen> createState() => _TopProductosScreenState();
}

class _TopProductosScreenState extends State<TopProductosScreen> {
  bool loading = true;
  String? error;
  List<dynamic> productos = [];

  @override
  void initState() {
    super.initState();
    _fetchTopProductos();
  }

  Future<void> _fetchTopProductos() async {
    try {
      final api = ApiClient();
      final data = await api.get('/ventas/top-productos');

      setState(() {
        productos = data; // el "data" ya viene limpio del backend
        loading = false;
      });
    } on ApiError catch (e) {
      setState(() {
        error = 'Error ${e.status}: ${e.message}';
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Error de conexión: $e';
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FA),
      appBar: AppBar(
        title: const Text('Top Productos'),
        backgroundColor: const Color(0xFF5D3A9B),
        foregroundColor: Colors.white,
      ),
      body:
          loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
              ? Center(
                child: Text(error!, style: const TextStyle(color: Colors.red)),
              )
              : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: productos.length,
                separatorBuilder:
                    (_, __) => Divider(color: Colors.purple.shade100),
                itemBuilder: (context, i) {
                  final p = productos[i];
                  return Card(
                    elevation: 3,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ListTile(
                      leading: CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.purple.shade100,
                        child: Text(
                          '${i + 1}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF4A148C),
                          ),
                        ),
                      ),
                      title: Text(
                        p['producto'],
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      subtitle: Text(
                        'Unidades vendidas: ${p['unidades_vendidas']}',
                        style: const TextStyle(color: Colors.black54),
                      ),
                      trailing: Text(
                        '\$${p['total_vendido']}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF4A148C),
                        ),
                      ),
                    ),
                  );
                },
              ),
    );
  }
}

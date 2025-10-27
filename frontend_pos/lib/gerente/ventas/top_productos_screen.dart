import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:frontend_pos/core/http.dart'; // tu cliente HTTP
import 'dart:ui';

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
                title: const Text('Top Productos'),
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
                    error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                )
                : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: productos.length,
                  separatorBuilder:
                      (_, __) => Divider(
                        color: Colors.white.withOpacity(0.15),
                        thickness: 0.8,
                      ),
                  itemBuilder: (context, i) {
                    final p = productos[i];
                    return Container(
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
                          radius: 22,
                          backgroundColor: Colors.cyanAccent.withOpacity(0.15),
                          child: Text(
                            '${i + 1}',
                            style: const TextStyle(
                              color: Colors.cyanAccent,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        title: Text(
                          p['producto'],
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.white,
                          ),
                        ),
                        subtitle: Text(
                          'Unidades vendidas: ${p['unidades_vendidas']}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                        trailing: Text(
                          '\$${p['total_vendido']}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.greenAccent,
                            fontSize: 15,
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

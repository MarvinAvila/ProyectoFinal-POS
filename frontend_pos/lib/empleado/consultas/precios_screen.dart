import 'package:flutter/material.dart';
import 'package:frontend_pos/admin/productos/product_model.dart';
import 'package:frontend_pos/admin/productos/product_repository.dart';
import 'package:frontend_pos/core/widgets.dart';
import 'package:intl/intl.dart';

class PreciosScreen extends StatefulWidget {
  const PreciosScreen({super.key});

  @override
  State<PreciosScreen> createState() => _PreciosScreenState();
}

class _PreciosScreenState extends State<PreciosScreen> {
  final _repo = ProductRepository();
  final _searchCtrl = TextEditingController();
  List<Product> _productos = [];
  bool _loading = false;
  String? _error;

  Future<void> _buscar() async {
    final query = _searchCtrl.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final page = await _repo.list(search: query, limit: 50);
      setState(() => _productos = page.items);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      appBar: AppBar(title: const Text('Consulta de Precios')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchCtrl,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                labelText: 'Buscar por nombre o código',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: _buscar,
                ),
              ),
              onSubmitted: (_) => _buscar(),
            ),
          ),
          Expanded(
            child: _buildResults(currency),
          ),
        ],
      ),
    );
  }

  Widget _buildResults(NumberFormat currency) {
    if (_loading) {
      return const AppLoader(text: 'Buscando...');
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _buscar);
    }
    if (_productos.isEmpty && _searchCtrl.text.isNotEmpty) {
      return const EmptyView(message: 'No se encontraron productos');
    }
    if (_productos.isEmpty) {
      return const EmptyView(
        message: 'Escribe para buscar un producto',
        icon: Icons.search_off,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: _productos.length,
      itemBuilder: (context, index) {
        final p = _productos[index];
        return Card(
          margin: const EdgeInsets.symmetric(vertical: 6),
          child: ListTile(
            title: Text(p.nombre),
            subtitle: Text('Código: ${p.codigoBarra}'),
            trailing: Text(
              currency.format(p.precioVenta),
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        );
      },
    );
  }
}
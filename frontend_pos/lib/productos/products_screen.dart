// lib/productos/products_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import 'product_repository.dart';
import 'product_model.dart';
import '../carrito/cart_controller.dart';
import 'package:frontend_pos/core/widgets.dart'; // AppLoader, EmptyView, ErrorView

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final repo = ProductRepository();
  final _search = TextEditingController();
  final _scroll = ScrollController();

  final _items = <Product>[];
  bool _loading = false;
  bool _end = false;
  int _page = 1;
  static const _limit = 20;
  String? _q;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.dispose();
    _search.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_end || _loading) return;
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 320) {
      _load();
    }
  }

  Future<void> _load({bool reset = false}) async {
    if (_loading) return;
    setState(() => _loading = true);

    try {
      final nextPage = reset ? 1 : _page + 1;
      final page = await repo.list(page: nextPage, limit: _limit, search: _q);

      setState(() {
        if (reset) _items.clear();
        _items.addAll(page.items);
        _page = page.page;
        _end = _items.length >= page.total;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refresh() async => _load(reset: true);

  void _onSearch(String? text) {
    _q = (text ?? '').trim().isEmpty ? null : text!.trim();
    _load(reset: true);
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      appBar: AppBar(title: const Text('Productos')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            // 🔁 Reemplazo de SearchInput por TextField equivalente
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Buscar por nombre o código...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon:
                    (_search.text.isEmpty)
                        ? null
                        : IconButton(
                          tooltip: 'Limpiar',
                          onPressed: () {
                            _search.clear();
                            _onSearch(null);
                            setState(() {}); // refrescar suffixIcon
                          },
                          icon: const Icon(Icons.clear),
                        ),
                border: const OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}), // para refrescar el suffixIcon
              onSubmitted: _onSearch,
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child:
                  _items.isEmpty && _loading
                      ? const AppLoader(text: 'Cargando productos...')
                      : _items.isEmpty
                      ? const EmptyView(message: 'No hay productos')
                      : ListView.separated(
                        controller: _scroll,
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                        itemCount: _items.length + (_end ? 0 : 1),
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          if (index >= _items.length) {
                            return const Padding(
                              padding: EdgeInsets.all(16),
                              child: Center(child: CircularProgressIndicator()),
                            );
                          }
                          final p = _items[index];
                          return Card(
                            child: ListTile(
                              leading: _ProductAvatar(product: p),
                              title: Text(
                                p.nombre,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Text(
                                'Código: ${p.codigoBarra} · ${p.unidad}\n'
                                'Stock: ${p.stock.toStringAsFixed(2)}',
                                maxLines: 2,
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    currency.format(p.precioVenta),
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (p.bajoStock)
                                        const _Tag(text: 'Bajo stock'),
                                      if (p.caducaPronto) ...[
                                        const SizedBox(width: 6),
                                        const _Tag(text: 'Caduca pronto'),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                              onTap: () => _showDetails(p, currency),
                              onLongPress: () => _addToCart(p),
                            ),
                          );
                        },
                      ),
            ),
          ),
        ],
      ),
      floatingActionButton:
          _loading
              ? const SizedBox.shrink()
              : FloatingActionButton.extended(
                onPressed: () => _load(),
                label: const Text('Más'),
                icon: const Icon(Icons.download),
              ),
    );
  }

  void _addToCart(Product p) {
    // Si no existe el Provider, no truena.
    try {
      final cart = context.read<CartController>();
      cart.addProduct(id: p.id, nombre: p.nombre, precio: p.precioVenta);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Agregado: ${p.nombre}')));
    } catch (_) {
      // Provider no encontrado: ignoramos silenciosamente.
    }
  }

  void _showDetails(Product p, NumberFormat currency) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _ProductAvatar(product: p, size: 48),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      p.nombre,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  Text(
                    currency.format(p.precioVenta),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _InfoRow(label: 'Código de barras', value: p.codigoBarra),
              _InfoRow(label: 'Unidad', value: p.unidad),
              _InfoRow(label: 'Stock', value: p.stock.toStringAsFixed(2)),
              if (p.fechaCaducidad != null)
                _InfoRow(
                  label: 'Caducidad',
                  value: DateFormat('yyyy-MM-dd').format(p.fechaCaducidad!),
                ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _addToCart(p);
                  },
                  icon: const Icon(Icons.add_shopping_cart),
                  label: const Text('Agregar al carrito'),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final styleLabel = Theme.of(context).textTheme.bodySmall?.copyWith(
      color: Theme.of(context).colorScheme.outline,
    );
    final styleValue = Theme.of(
      context,
    ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: styleLabel)),
          Text(value, style: styleValue),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;
  const _Tag({required this.text});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.errorContainer;
    final fg = Theme.of(context).colorScheme.onErrorContainer;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text, style: TextStyle(color: fg, fontSize: 11)),
    );
  }
}

class _ProductAvatar extends StatelessWidget {
  final Product product;
  final double size;
  const _ProductAvatar({required this.product, this.size = 40});

  @override
  Widget build(BuildContext context) {
    final initial =
        product.nombre.isNotEmpty ? product.nombre[0].toUpperCase() : '?';
    return CircleAvatar(radius: size / 2, child: Text(initial));
    // Si más adelante agregas imágenes, puedes reemplazar por Image.network/base64.
  }
}

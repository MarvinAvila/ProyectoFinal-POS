import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'product_repository.dart';
import 'product_model.dart';
import '../../empleado/carrito/cart_controller.dart';
import 'package:frontend_pos/core/widgets.dart'; // AppLoader, EmptyView
import 'add_product_screen.dart'; // 👈 importa tu pantalla para agregar productos

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
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
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
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5FF), // fondo pastel suave
      appBar: AppBar(
        title: const Text('Productos'),
        backgroundColor: const Color(0xFF6A1B9A), // morado POS admin
        elevation: 0,
        centerTitle: true,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Buscar por nombre o código...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF6A1B9A)),
                suffixIcon:
                    _search.text.isEmpty
                        ? null
                        : IconButton(
                          tooltip: 'Limpiar',
                          onPressed: () {
                            _search.clear();
                            _onSearch(null);
                            setState(() {});
                          },
                          icon: const Icon(
                            Icons.clear,
                            color: Color(0xFF6A1B9A),
                          ),
                        ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(
                  vertical: 0,
                  horizontal: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(
                    color: Color(0xFFB39DDB),
                    width: 1.2,
                  ),
                ),
              ),
              onChanged: (_) => setState(() {}),
              onSubmitted: _onSearch,
            ),
          ),

          // 📱 Responsive Layout
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child:
                  _loading && _items.isEmpty
                      ? const AppLoader(text: 'Cargando productos...')
                      : _items.isEmpty
                      ? const EmptyView(message: 'No hay productos')
                      : LayoutBuilder(
                        builder: (context, constraints) {
                          // 📱 móvil -> lista | 🖥️ escritorio -> grid
                          final crossAxisCount =
                              constraints.maxWidth > 1000
                                  ? 4
                                  : constraints.maxWidth > 700
                                  ? 2
                                  : 1;
                          return GridView.builder(
                            controller: _scroll,
                            padding: const EdgeInsets.all(12),
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: crossAxisCount,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                  childAspectRatio:
                                      isMobile ? 2.0 : 1.7, // adaptable
                                ),
                            itemCount: _items.length + (_end ? 0 : 1),
                            itemBuilder: (context, index) {
                              if (index >= _items.length) {
                                return const Center(
                                  child: CircularProgressIndicator(),
                                );
                              }
                              final p = _items[index];
                              return _ProductCard(
                                product: p,
                                currency: currency,
                                onTap: () => _showDetails(p, currency),
                              );
                            },
                          );
                        },
                      ),
            ),
          ),
        ],
      ),

      // 👇 FAB: Agregar producto
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF6A1B9A),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text(
          "Agregar producto",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AddProductScreen()),
          );
          // 🔁 Si se guardó correctamente, recarga la lista
          if (result == true) _refresh();
        },
      ),
    );
  }

  void _showDetails(Product p, NumberFormat currency) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F5FF),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
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
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF4A148C),
                      ),
                    ),
                  ),
                  Text(
                    currency.format(p.precioVenta),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF6A1B9A),
                      fontSize: 16,
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
            ],
          ),
        );
      },
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final NumberFormat currency;
  final VoidCallback onTap;

  const _ProductCard({
    required this.product,
    required this.currency,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final repo = ProductRepository();
    final bool bajoStock = product.stock <= 5;
    final bool caducaPronto =
        product.fechaCaducidad != null &&
        product.fechaCaducidad!.difference(DateTime.now()).inDays <= 7;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.purple.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 🔹 Encabezado
            Row(
              children: [
                _ProductAvatar(product: product),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    product.nombre,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF4A148C),
                      fontSize: 16,
                    ),
                  ),
                ),
                Text(
                  currency.format(product.precioVenta),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF6A1B9A),
                    fontSize: 15,
                  ),
                ),

                // 🟣 Menú contextual (Editar / Eliminar)
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, color: Color(0xFF4A148C)),
                  onSelected: (value) async {
                    if (value == 'edit') {
                      // ✏️ Editar producto
                      final actualizado = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AddProductScreen(product: product),
                        ),
                      );
                      if (actualizado == true) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              '✅ Producto actualizado correctamente',
                            ),
                          ),
                        );
                        // Refresca lista
                        final parent =
                            context
                                .findAncestorStateOfType<
                                  _ProductsScreenState
                                >();
                        parent?._refresh();
                      }
                    } else if (value == 'delete') {
                      // 🗑️ Confirmar eliminación
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder:
                            (_) => AlertDialog(
                              title: const Text('Eliminar producto'),
                              content: Text(
                                '¿Deseas eliminar "${product.nombre}" permanentemente?',
                              ),
                              actions: [
                                TextButton(
                                  onPressed:
                                      () => Navigator.pop(context, false),
                                  child: const Text('Cancelar'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text(
                                    'Eliminar',
                                    style: TextStyle(color: Colors.red),
                                  ),
                                ),
                              ],
                            ),
                      );

                      if (confirm == true) {
                        try {
                          await repo.delete(product.idProducto);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('🗑️ Producto eliminado'),
                            ),
                          );
                          final parent =
                              context
                                  .findAncestorStateOfType<
                                    _ProductsScreenState
                                  >();
                          parent?._refresh();
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('❌ Error al eliminar: $e')),
                          );
                        }
                      }
                    }
                  },
                  itemBuilder:
                      (_) => const [
                        PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, color: Colors.deepPurple),
                              SizedBox(width: 8),
                              Text('Editar'),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Eliminar'),
                            ],
                          ),
                        ),
                      ],
                ),
              ],
            ),

            const SizedBox(height: 8),

            // 🔹 Info básica
            Text(
              'Código: ${product.codigoBarra} · ${product.unidad}\nStock: ${product.stock.toStringAsFixed(2)}',
              style: const TextStyle(color: Colors.black54, fontSize: 12.5),
            ),

            const Spacer(),

            // 🔹 Etiquetas de estado
            Row(
              children: [
                if (bajoStock)
                  const _Tag(
                    text: 'Bajo stock',
                    color: Colors.orangeAccent,
                    icon: Icons.warning_amber_rounded,
                  ),
                if (caducaPronto) const SizedBox(width: 4),
                if (caducaPronto)
                  const _Tag(
                    text: 'Caduca pronto',
                    color: Colors.redAccent,
                    icon: Icons.timer_outlined,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: Color(0xFF4A148C),
              fontSize: 13.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;
  final Color? color;
  final IconData? icon;
  const _Tag({required this.text, this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    final bg = color ?? Colors.purpleAccent;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: bg.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) Icon(icon, size: 13, color: bg.withOpacity(0.9)),
          if (icon != null) const SizedBox(width: 3),
          Text(
            text,
            style: TextStyle(
              color: bg.withOpacity(0.9),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
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
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: const Color(0xFFD1C4E9),
      child: Text(
        initial,
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 16,
          color: Color(0xFF4A148C),
        ),
      ),
    );
  }
}

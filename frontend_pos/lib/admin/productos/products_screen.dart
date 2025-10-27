import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'product_repository.dart';
import 'product_model.dart';
import '../../empleado/carrito/cart_controller.dart';
import 'package:frontend_pos/core/widgets.dart';
import 'add_product_screen.dart';
import 'dart:ui';

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

    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.3,
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
                title: const Text('Productos'),
                centerTitle: true,
                elevation: 0,
                backgroundColor: Colors.white.withOpacity(0.08),
                foregroundColor: Colors.white,
              ),
            ),
          ),
        ),
        body: Column(
          children: [
            // 🔍 Barra de búsqueda con estilo glass
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blueAccent.withOpacity(0.2),
                      blurRadius: 6,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _search,
                  textInputAction: TextInputAction.search,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Buscar por nombre o código...',
                    hintStyle: const TextStyle(color: Colors.white70),
                    prefixIcon: const Icon(
                      Icons.search,
                      color: Colors.cyanAccent,
                    ),
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
                                color: Colors.cyanAccent,
                              ),
                            ),
                    filled: true,
                    fillColor: Colors.transparent,
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: 0,
                      horizontal: 12,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: (_) => setState(() {}),
                  onSubmitted: _onSearch,
                ),
              ),
            ),

            // 📦 Lista o grid
            Expanded(
              child: RefreshIndicator(
                onRefresh: _refresh,
                color: Colors.cyanAccent,
                child:
                    _loading && _items.isEmpty
                        ? const AppLoader(text: 'Cargando productos...')
                        : _items.isEmpty
                        ? const EmptyView(message: 'No hay productos')
                        : LayoutBuilder(
                          builder: (context, constraints) {
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
                                    childAspectRatio: isMobile ? 1.2 : 1.4,
                                  ),
                              itemCount: _items.length + (_end ? 0 : 1),
                              itemBuilder: (context, index) {
                                if (index >= _items.length) {
                                  return const Center(
                                    child: CircularProgressIndicator(
                                      color: Colors.cyanAccent,
                                    ),
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

        // 🧊 FAB translúcido
        floatingActionButton: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
            child: FloatingActionButton.extended(
              backgroundColor: Colors.white.withOpacity(0.08),
              icon: const Icon(Icons.add, color: Colors.cyanAccent),
              label: const Text(
                "Agregar producto",
                style: TextStyle(
                  color: Colors.cyanAccent,
                  fontWeight: FontWeight.w600,
                ),
              ),
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AddProductScreen()),
                );
                if (result == true) _refresh();
              },
            ),
          ),
        ),
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
        return SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 🆕 IMAGEN PRINCIPAL DEL PRODUCTO
                if (p.imagen != null && p.imagen!.isNotEmpty)
                  Center(
                    child: Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(
                          p.imagen!,
                          fit: BoxFit.cover,
                          errorBuilder:
                              (context, error, stackTrace) => const Icon(
                                Icons.image_not_supported,
                                size: 50,
                              ),
                        ),
                      ),
                    ),
                  )
                else
                  Center(
                    child: Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1C4E9),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.inventory_2_outlined,
                        size: 50,
                        color: Color(0xFF4A148C),
                      ),
                    ),
                  ),

                const SizedBox(height: 16),

                // 🆕 INFORMACIÓN PRINCIPAL
                Row(
                  children: [
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
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // 🆕 CÓDIGO DE BARRAS VISUAL
                _BarcodeSection(product: p),

                const SizedBox(height: 16),

                // 🆕 INFORMACIÓN DETALLADA
                _InfoSection(product: p, currency: currency),
              ],
            ),
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
            // 🔹 Encabezado - ACTUALIZADO para mostrar imagen
            Row(
              children: [
                // 🆕 MOSTRAR IMAGEN DEL PRODUCTO en lugar del avatar
                _ProductImage(product: product, size: 48),
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
                if (caducaPronto) const SizedBox(width: 6),
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

// 🆕 WIDGET PARA MOSTRAR IMAGEN DEL PRODUCTO (en lista)
class _ProductImage extends StatelessWidget {
  final Product product;
  final double size;

  const _ProductImage({required this.product, this.size = 40});

  @override
  Widget build(BuildContext context) {
    // Si tiene imagen desde Cloudinary, mostrarla
    if (product.imagen != null && product.imagen!.isNotEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            product.imagen!,
            fit: BoxFit.cover,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  value:
                      loadingProgress.expectedTotalBytes != null
                          ? loadingProgress.cumulativeBytesLoaded /
                              loadingProgress.expectedTotalBytes!
                          : null,
                ),
              );
            },
            errorBuilder:
                (context, error, stackTrace) =>
                    _ProductAvatar(product: product, size: size),
          ),
        ),
      );
    }

    // Si no tiene imagen, mostrar avatar con inicial
    return _ProductAvatar(product: product, size: size);
  }
}

// 🆕 WIDGET PARA SECCIÓN DE CÓDIGOS (con URLs reales de Cloudinary)
class _BarcodeSection extends StatelessWidget {
  final Product product;

  const _BarcodeSection({required this.product});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Códigos del Producto',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Color(0xFF4A148C),
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 12),

        // 📷 IMAGEN DEL CÓDIGO DE BARRAS (desde Cloudinary)
        if (product.codigoBarrasUrl != null &&
            product.codigoBarrasUrl!.isNotEmpty)
          Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Código de Barras:',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade400),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Image.network(
                          product.codigoBarrasUrl!,
                          width: 200,
                          height: 80,
                          fit: BoxFit.contain,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return Container(
                              width: 200,
                              height: 80,
                              alignment: Alignment.center,
                              child: CircularProgressIndicator(
                                value:
                                    loadingProgress.expectedTotalBytes != null
                                        ? loadingProgress
                                                .cumulativeBytesLoaded /
                                            loadingProgress.expectedTotalBytes!
                                        : null,
                              ),
                            );
                          },
                          errorBuilder:
                              (context, error, stackTrace) => Column(
                                children: [
                                  const Icon(
                                    Icons.barcode_reader,
                                    size: 40,
                                    color: Colors.grey,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Error cargando código de barras',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Texto numérico del código de barras
                    Center(
                      child: Text(
                        product.codigoBarra,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF4A148C),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),

        // 🔳 CÓDIGO QR (desde Cloudinary)
        if (product.codigoQrUrl != null && product.codigoQrUrl!.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Código QR:',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade400),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Image.network(
                      product.codigoQrUrl!,
                      width: 120,
                      height: 120,
                      fit: BoxFit.contain,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Container(
                          width: 120,
                          height: 120,
                          alignment: Alignment.center,
                          child: CircularProgressIndicator(
                            value:
                                loadingProgress.expectedTotalBytes != null
                                    ? loadingProgress.cumulativeBytesLoaded /
                                        loadingProgress.expectedTotalBytes!
                                    : null,
                          ),
                        );
                      },
                      errorBuilder:
                          (context, error, stackTrace) => Column(
                            children: [
                              const Icon(
                                Icons.qr_code_2,
                                size: 60,
                                color: Colors.grey,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Error cargando QR',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                    ),
                  ),
                ),
              ],
            ),
          )
        else if (product.codigoBarrasUrl == null)
          // Mensaje si no hay códigos generados
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: const Column(
              children: [
                Icon(Icons.qr_code_2, size: 40, color: Colors.grey),
                SizedBox(height: 8),
                Text(
                  'Códigos no generados',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                SizedBox(height: 4),
                Text(
                  'Los códigos se generan automáticamente al crear el producto',
                  style: TextStyle(color: Colors.grey, fontSize: 10),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// 🆕 WIDGET PARA INFORMACIÓN DETALLADA
class _InfoSection extends StatelessWidget {
  final Product product;
  final NumberFormat currency;

  const _InfoSection({required this.product, required this.currency});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Información del Producto',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Color(0xFF4A148C),
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 8),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Column(
            children: [
              _InfoRow(
                label: 'Precio de compra',
                value: currency.format(product.precioCompra),
              ),
              _InfoRow(label: 'Unidad', value: product.unidad),
              _InfoRow(label: 'Stock', value: product.stock.toStringAsFixed(2)),
              if (product.idCategoria != null)
                _InfoRow(
                  label: 'Categoría ID',
                  value: product.idCategoria.toString(),
                ),
              if (product.idProveedor != null)
                _InfoRow(
                  label: 'Proveedor ID',
                  value: product.idProveedor.toString(),
                ),
              if (product.fechaCaducidad != null)
                _InfoRow(
                  label: 'Fecha de caducidad',
                  value: DateFormat(
                    'yyyy-MM-dd',
                  ).format(product.fechaCaducidad!),
                ),
            ],
          ),
        ),
      ],
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

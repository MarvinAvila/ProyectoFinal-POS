import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/admin/productos/product_model.dart';
import 'package:frontend_pos/admin/productos/product_repository.dart';
import 'package:frontend_pos/empleado/carrito/cart_controller.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/chatbot/screens/chatbot_screen.dart'; // 💬 Chatbot importado

class EmpleadoDashboardScreen extends StatefulWidget {
  const EmpleadoDashboardScreen({super.key});

  @override
  State<EmpleadoDashboardScreen> createState() =>
      _EmpleadoDashboardScreenState();
}

class _EmpleadoDashboardScreenState extends State<EmpleadoDashboardScreen> {
  final _productRepo = ProductRepository();
  List<Product> productos = [];
  bool cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarProductos();
  }

  Future<void> _cargarProductos() async {
    try {
      final page = await _productRepo.list(
        limit: 100,
      ); // usa tu paginación real
      setState(() {
        productos = page.items;
        cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => cargando = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error al cargar productos: $e')));
    }
  }

  // ✅ La lógica de agregar al carrito ahora la maneja el CartController
  void _agregarAlCarrito(BuildContext context, Product p) {
    final cart = context.read<CartController>();
    // Convertimos el Product a ProductLite para el carrito
    cart.addProductLite(ProductLite.fromProduct(p));
  }

  Future<void> _finalizarVenta(BuildContext context) async {
    final cart = context.read<CartController>();
    if (cart.lines.isEmpty || cart.loading) return;

    try {
      // ✅ Llamamos al método checkout del controlador del carrito.
      final result = await cart.checkout(formaPago: 'efectivo');

      if (!mounted) return;

      if (result != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Venta registrada con éxito'),
            backgroundColor: Colors.green,
          ),
        );
        // Si es un modal sheet, lo cerramos
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: ${cart.error ?? 'Desconocido'}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } on ApiError catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('❌ Error: ${e.message}')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 800;
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');
    final cart = context.watch<CartController>();

    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FB),
      appBar: AppBar(
        title: const Text('Punto de Venta'),
        backgroundColor: Colors.deepPurple,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarProductos,
          ),
        ],
      ),
      body:
          cargando
              ? const Center(child: CircularProgressIndicator())
              : Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 🟢 SECCIÓN PRODUCTOS
                  Expanded(
                    flex: isMobile ? 1 : 3,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: GridView.builder(
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: isMobile ? 2 : 4,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 0.8,
                        ),
                        itemCount: productos.length,
                        itemBuilder: (context, i) {
                          final p = productos[i];
                          return _buildCardProducto(context, p, currency);
                        },
                      ),
                    ),
                  ),

                  // 🟣 SECCIÓN CARRITO (oculta en pantallas pequeñas)
                  if (!isMobile)
                    Expanded(flex: 1, child: _buildCarrito(context, currency)),
                ],
              ),

      // 💬 Chatbot flotante + 🟠 Carrito flotante móvil
      floatingActionButton: Stack(
        children: [
          if (isMobile && cart.lines.isNotEmpty)
            Positioned(
              bottom: 80,
              right: 16,
              child: FloatingActionButton.extended(
                onPressed: () => _mostrarCarritoMovil(context),
                backgroundColor: Colors.deepPurple,
                icon: const Icon(Icons.shopping_cart),
                label: Text(currency.format(cart.total)),
              ),
            ),
          Positioned(
            bottom: 16,
            left: 24,
            child: FloatingActionButton(
              heroTag: 'chatbot_empleado',
              backgroundColor: Colors.deepPurple,
              tooltip: 'Abrir Chatbot',
              elevation: 6,
              child: const Icon(Icons.chat, color: Colors.white),
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.white,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                  ),
                  builder:
                      (_) => const SizedBox(
                        height: 600,
                        child: ChatbotScreen(), // ✅ Chatbot modal
                      ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // 🧃 Tarjeta individual de producto
  Widget _buildCardProducto(
    BuildContext context,
    Product p,
    NumberFormat currency,
  ) {
    final enCarrito = context.watch<CartController>().lines.any(
      (line) => line.product.id == p.idProducto,
    );
    return GestureDetector(
      onTap: () => _agregarAlCarrito(context, p),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.purple.withAlpha(25), // Reemplazo de withOpacity
              blurRadius: 6,
              offset: const Offset(2, 3),
            ),
          ],
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Expanded(
              child:
                  p.imagen != null && p.imagen!.isNotEmpty
                      ? Image.network(p.imagen!, fit: BoxFit.contain)
                      : const Icon(
                        Icons.image_not_supported,
                        size: 60,
                        color: Colors.grey,
                      ),
            ),
            const SizedBox(height: 6),
            Text(
              p.nombre,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.bold),
              maxLines: 2,
            ),
            Text(
              currency.format(p.precioVenta),
              style: const TextStyle(
                color: Colors.deepPurple,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            ElevatedButton.icon(
              onPressed: () => _agregarAlCarrito(context, p),
              icon: const Icon(Icons.add_shopping_cart),
              label: Text(enCarrito ? 'Agregar +' : 'Agregar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.deepPurple,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 36),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 🛒 Panel lateral del carrito
  Widget _buildCarrito(BuildContext context, NumberFormat currency) {
    final cart = context.watch<CartController>();

    if (cart.lines.isEmpty) {
      return const Center(
        child: Text(
          '🛍️ Carrito vacío',
          style: TextStyle(color: Colors.black54),
        ),
      );
    }

    return Container(
      color: const Color(0xFFFDFBFF),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🛒 Carrito',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const Divider(),
          Expanded(
            child: ListView.builder(
              itemCount: cart.lines.length,
              itemBuilder: (context, i) {
                final line = cart.lines[i];
                final p = line.product;
                return ListTile(
                  leading:
                      p.imagen != null && p.imagen!.isNotEmpty
                          ? Image.network(p.imagen!, width: 40)
                          : const Icon(Icons.image, color: Colors.grey),
                  title: Text(p.nombre),
                  subtitle: Text(currency.format(line.price)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        onPressed: () => cart.decrement(i),
                      ),
                      Text('${line.qty.toInt()}'),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () => cart.increment(i),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const Divider(),
          // Aquí podrías agregar Subtotal, IVA y Total si quieres más detalle
          Text('Subtotal: ${currency.format(cart.itemsSubtotal)}'),
          Text('IVA (16%): ${currency.format(cart.iva)}'),
          Text(
            'Total: ${currency.format(cart.total)}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: cart.loading ? null : () => _finalizarVenta(context),
            icon: const Icon(Icons.check_circle),
            label:
                cart.loading
                    ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                    : const Text('Finalizar venta'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              minimumSize: const Size(double.infinity, 40),
            ),
          ),
        ],
      ),
    );
  }

  // 💬 Carrito emergente en móvil
  void _mostrarCarritoMovil(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      builder:
          (_) => SafeArea(
            child: FractionallySizedBox(
              heightFactor: 0.9,
              child: _buildCarrito(
                context,
                NumberFormat.simpleCurrency(locale: 'es_MX'),
              ),
            ),
          ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/empleado/carrito/cart_controller.dart';
import 'package:frontend_pos/empleado/carrito/cart_screen.dart';
import 'package:frontend_pos/empleado/producto/producto_model.dart';
import 'package:frontend_pos/empleado/producto/producto_repository.dart';

class EmpleadoDashboardScreen extends StatefulWidget {
  const EmpleadoDashboardScreen({super.key});

  @override
  State<EmpleadoDashboardScreen> createState() =>
      _EmpleadoDashboardScreenState();
}

class _EmpleadoDashboardScreenState extends State<EmpleadoDashboardScreen> {
  final repo = ProductoRepository();
  List<Producto> productos = [];
  bool cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarProductos();
  }

  Future<void> _cargarProductos() async {
    try {
      final page = await repo.list(limit: 100);
      setState(() {
        productos = page.items;
        cargando = false;
      });
    } catch (e) {
      setState(() => cargando = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error al cargar productos: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartController>();
    final isMobile = MediaQuery.of(context).size.width < 800;
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');

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
          Stack(
            alignment: Alignment.topRight,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined),
                tooltip: 'Ver carrito',
                onPressed: () {
                  // 🔹 En móvil: mostrar modal
                  if (isMobile) {
                    _mostrarCarritoMovil(context, currency, cart);
                  } else {
                    // 🔹 En escritorio: navegar a pantalla completa CartScreen
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CartScreen()),
                    );
                  }
                },
              ),
              if (cart.cantidadTotal > 0)
                CircleAvatar(
                  radius: 9,
                  backgroundColor: Colors.orange,
                  child: Text(
                    '${cart.cantidadTotal}',
                    style: const TextStyle(fontSize: 10, color: Colors.white),
                  ),
                ),
            ],
          ),
        ],
      ),
      body:
          cargando
              ? const Center(child: CircularProgressIndicator())
              : Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 🟢 Productos
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
                          return _buildCardProducto(p, cart, currency);
                        },
                      ),
                    ),
                  ),

                  // 🟣 Carrito lateral (solo escritorio/tablet)
                  if (!isMobile)
                    Expanded(
                      flex: 1,
                      child: Container(
                        color: Colors.white,
                        child: const CartScreen(),
                      ),
                    ),
                ],
              ),

      // 🟠 FAB flotante para móviles
      floatingActionButton:
          isMobile && cart.items.isNotEmpty
              ? FloatingActionButton.extended(
                onPressed:
                    () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CartScreen()),
                    ),
                backgroundColor: Colors.deepPurple,
                icon: const Icon(Icons.shopping_cart),
                label: Text('${currency.format(cart.total)}'),
              )
              : null,
    );
  }

  // 🧃 Tarjeta de producto
  Widget _buildCardProducto(
    Producto p,
    CartController cart,
    NumberFormat currency,
  ) {
    final enCarrito = cart.items.containsKey(p.idProducto);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.purple.withOpacity(0.1),
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
                p.imagen != null
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
            onPressed: () => cart.agregar(p),
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
    );
  }

  // 💬 Carrito emergente en móvil
  void _mostrarCarritoMovil(
    BuildContext context,
    NumberFormat currency,
    CartController cart,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      builder:
          (_) => SafeArea(
            child: FractionallySizedBox(
              heightFactor: 0.9,
              child: CartScreen(), // 👈 ahora usa directamente CartScreen
            ),
          ),
    );
  }
}

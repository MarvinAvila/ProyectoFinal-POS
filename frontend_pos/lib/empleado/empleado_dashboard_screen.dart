import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'producto/producto_model.dart';
import 'producto/producto_repository.dart';

class EmpleadoDashboardScreen extends StatefulWidget {
  const EmpleadoDashboardScreen({super.key});

  @override
  State<EmpleadoDashboardScreen> createState() =>
      _EmpleadoDashboardScreenState();
}

class _EmpleadoDashboardScreenState extends State<EmpleadoDashboardScreen> {
  final repo = ProductoRepository();
  List<Producto> productos = [];
  final Map<int, int> carrito = {}; // idProducto -> cantidad
  bool cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarProductos();
  }

  Future<void> _cargarProductos() async {
    try {
      final page = await repo.list(limit: 100); // usa tu paginación real
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

  void _agregarAlCarrito(Producto p) {
    setState(() {
      carrito[p.idProducto] = (carrito[p.idProducto] ?? 0) + 1;
    });
  }

  void _removerDelCarrito(Producto p) {
    setState(() {
      if (carrito[p.idProducto] != null) {
        carrito[p.idProducto] = carrito[p.idProducto]! - 1;
        if (carrito[p.idProducto]! <= 0) carrito.remove(p.idProducto);
      }
    });
  }

  double get totalCarrito {
    double total = 0;
    for (final id in carrito.keys) {
      final producto = productos.firstWhere((p) => p.idProducto == id);
      total += (producto.precioFinal * carrito[id]!);
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
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
                          return _buildCardProducto(p, currency);
                        },
                      ),
                    ),
                  ),

                  // 🟣 SECCIÓN CARRITO (oculta en pantallas pequeñas)
                  if (!isMobile)
                    Expanded(flex: 1, child: _buildCarrito(currency)),
                ],
              ),

      // 🟠 Carrito flotante para móviles
      floatingActionButton:
          isMobile && carrito.isNotEmpty
              ? FloatingActionButton.extended(
                onPressed: () => _mostrarCarritoMovil(context, currency),
                backgroundColor: Colors.deepPurple,
                icon: const Icon(Icons.shopping_cart),
                label: Text('${currency.format(totalCarrito)}'),
              )
              : null,
    );
  }

  // 🧃 Tarjeta individual de producto
  Widget _buildCardProducto(Producto p, NumberFormat currency) {
    final enCarrito = carrito.containsKey(p.idProducto);
    return GestureDetector(
      onTap: () => _agregarAlCarrito(p),
      child: Container(
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
              currency.format(p.precioFinal),
              style: const TextStyle(
                color: Colors.deepPurple,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (p.enOferta == true)
              Text(
                'Oferta ${p.porcentajeDescuento?.toStringAsFixed(0)}%',
                style: const TextStyle(color: Colors.red, fontSize: 12),
              ),
            const SizedBox(height: 4),
            ElevatedButton.icon(
              onPressed: () => _agregarAlCarrito(p),
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
  Widget _buildCarrito(NumberFormat currency) {
    if (carrito.isEmpty) {
      return const Center(
        child: Text(
          '🛍️ Carrito vacío',
          style: TextStyle(color: Colors.black54),
        ),
      );
    }

    final productosCarrito =
        carrito.keys
            .map((id) => productos.firstWhere((p) => p.idProducto == id))
            .toList();

    return Container(
      color: Colors.white,
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
              itemCount: productosCarrito.length,
              itemBuilder: (context, i) {
                final p = productosCarrito[i];
                final cantidad = carrito[p.idProducto]!;
                return ListTile(
                  leading:
                      p.imagen != null
                          ? Image.network(p.imagen!, width: 40)
                          : const Icon(Icons.image, color: Colors.grey),
                  title: Text(p.nombre),
                  subtitle: Text(currency.format(p.precioFinal)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        onPressed: () => _removerDelCarrito(p),
                      ),
                      Text('$cantidad'),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () => _agregarAlCarrito(p),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const Divider(),
          Text(
            'Total: ${currency.format(totalCarrito)}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Venta registrada (demo)')),
              );
              setState(() => carrito.clear());
            },
            icon: const Icon(Icons.check_circle),
            label: const Text('Finalizar venta'),
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
  void _mostrarCarritoMovil(BuildContext context, NumberFormat currency) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      builder:
          (_) => SafeArea(
            child: FractionallySizedBox(
              heightFactor: 0.9,
              child: _buildCarrito(currency),
            ),
          ),
    );
  }
}

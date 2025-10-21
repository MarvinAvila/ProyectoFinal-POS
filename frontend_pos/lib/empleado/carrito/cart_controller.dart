// lib/carrito/cart_controller.dart
import 'package:flutter/foundation.dart';
import '../producto/producto_model.dart';

/// 🛒 Controlador del carrito de compras (con persistencia temporal)
class CartController extends ChangeNotifier {
  final Map<int, CartItem> _items = {}; // idProducto -> CartItem

  Map<int, CartItem> get items => _items;

  /// Total acumulado
  double get total => _items.values.fold(0, (sum, e) => sum + e.total);

  /// Número total de productos en carrito
  int get cantidadTotal => _items.values.fold(0, (sum, e) => sum + e.cantidad);

  /// Agregar producto (si ya existe, suma cantidad)
  void agregar(Producto p) {
    if (_items.containsKey(p.idProducto)) {
      _items[p.idProducto]!.cantidad++;
    } else {
      _items[p.idProducto] = CartItem(producto: p, cantidad: 1);
    }
    notifyListeners();
  }

  /// Disminuir cantidad o eliminar si llega a 0
  void quitar(Producto p) {
    if (!_items.containsKey(p.idProducto)) return;
    if (_items[p.idProducto]!.cantidad > 1) {
      _items[p.idProducto]!.cantidad--;
    } else {
      _items.remove(p.idProducto);
    }
    notifyListeners();
  }

  /// Eliminar producto completamente
  void eliminar(Producto p) {
    _items.remove(p.idProducto);
    notifyListeners();
  }

  /// Vaciar carrito
  void limpiar() {
    _items.clear();
    notifyListeners();
  }
}

/// 🧃 Representación de un producto dentro del carrito
class CartItem {
  final Producto producto;
  int cantidad;

  CartItem({required this.producto, this.cantidad = 1});

  double get total => producto.precioVenta * cantidad;
}

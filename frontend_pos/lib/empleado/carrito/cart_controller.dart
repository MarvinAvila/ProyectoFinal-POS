// lib/carrito/cart_controller.dart
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/admin/productos/product_model.dart';
import 'package:frontend_pos/admin/productos/product_repository.dart';
import 'package:frontend_pos/admin/ventas/ventas_repository.dart';

/// ====== MODELOS ======

class ProductLite {
  final int id;
  final String nombre;
  final String? codigoBarra;
  final double precioVenta;
  final double stock;
  final String? unidad;
  final String? imagen;

  ProductLite({
    required this.id,
    required this.nombre,
    required this.precioVenta,
    required this.stock,
    this.codigoBarra,
    this.unidad,
    this.imagen,
  });

  // ✅ Constructor de fábrica para crear ProductLite desde un Product completo.
  // Esto es clave para la integración con EmpleadoDashboardScreen.
  factory ProductLite.fromProduct(Product p) {
    return ProductLite(
      id: p.idProducto,
      nombre: p.nombre,
      precioVenta: p.precioVenta,
      stock: p.stock,
      codigoBarra: p.codigoBarra,
      unidad: p.unidad,
      imagen: p.imagen,
    );
  }

  factory ProductLite.fromJson(Map<String, dynamic> j) {
    double parseNum(dynamic x) {
      if (x is num) return x.toDouble();
      return double.tryParse('${x ?? ''}') ?? 0.0;
    }

    return ProductLite(
      id:
          j['id_producto'] is int
              ? j['id_producto']
              : int.tryParse('${j['id'] ?? j['productoId'] ?? 0}') ?? 0,
      nombre: (j['nombre'] ?? j['name'] ?? '').toString(),
      codigoBarra:
          (j['codigo_barra'] ?? j['barcode'] ?? j['codigo'] ?? '') as String?,
      precioVenta: parseNum(
        j['precio_venta'] ?? j['precioVenta'] ?? j['price'] ?? 0,
      ),
      stock: parseNum(j['stock'] ?? j['existencia'] ?? 0),
      unidad: j['unidad']?.toString(),
      imagen: j['imagen']?.toString(),
    );
  }
}

class CartLine {
  final ProductLite product;
  final double qty;
  final double price; // precio unitario cobrado

  CartLine({required this.product, required this.qty, required this.price});

  double get subtotal => (qty * price);

  CartLine copyWith({double? qty, double? price}) => CartLine(
    product: product,
    qty: qty ?? this.qty,
    price: price ?? this.price,
  );
}

/// ====== CONTROLLER ======

class CartController extends ChangeNotifier {
  // ✅ Usar los repositorios centralizados
  final _productRepo = ProductRepository();
  final _ventasRepo = VentasRepository();

  final List<CartLine> _lines = [];
  String? _error;
  bool _loading = false;

  /// IVA configurable (16% MX por defecto)
  double ivaRate = 0.16;

  List<CartLine> get lines => List.unmodifiable(_lines);
  bool get loading => _loading;
  String? get error => _error;

  double get itemsSubtotal => _lines.fold(0.0, (p, e) => p + e.subtotal);

  double get iva => (itemsSubtotal * ivaRate);
  double get total => itemsSubtotal + iva;

  Future<void> init() async {}

  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Vacía el carrito por completo
  void clear() {
    _lines.clear();
    notifyListeners();
  }

  /// === Agregar cuando ya tienes un ProductLite (ej. por barcode o buscador)
  void addProductLite(ProductLite p, {double qty = 1, double? price}) {
    final idx = _lines.indexWhere((e) => e.product.id == p.id);
    if (idx >= 0) {
      final cur = _lines[idx];
      _lines[idx] = cur.copyWith(qty: cur.qty + qty);
    } else {
      _lines.add(CartLine(product: p, qty: qty, price: price ?? p.precioVenta));
    }
    notifyListeners();
  }

  /// === Agregar con campos sueltos (compatible con products_screen.dart)
  void addProduct({
    required int id,
    required String nombre,
    required double precio,
    double qty = 1,
  }) {
    final idx = _lines.indexWhere((e) => e.product.id == id);
    if (idx >= 0) {
      final cur = _lines[idx];
      _lines[idx] = cur.copyWith(qty: cur.qty + qty, price: precio);
    } else {
      final lite = ProductLite(
        id: id,
        nombre: nombre,
        precioVenta: precio,
        stock: 0,
      );
      _lines.add(CartLine(product: lite, qty: qty, price: precio));
    }
    notifyListeners();
  }

  void increment(int index) {
    final cur = _lines[index];
    _lines[index] = cur.copyWith(qty: cur.qty + 1);
    notifyListeners();
  }

  void decrement(int index) {
    final cur = _lines[index];
    final newQty = (cur.qty - 1);
    if (newQty <= 0) {
      _lines.removeAt(index);
    } else {
      _lines[index] = cur.copyWith(qty: newQty);
    }
    notifyListeners();
  }

  void removeAt(int index) {
    _lines.removeAt(index);
    notifyListeners();
  }

  void setQty(int index, double qty) {
    if (qty <= 0) return;
    final cur = _lines[index];
    _lines[index] = cur.copyWith(qty: qty);
    notifyListeners();
  }

  /// Buscar por texto para autocompletar
  Future<List<ProductLite>> searchProducts(String query) async {
    if (query.isEmpty) return [];

    try {
      final page = await _productRepo.list(search: query, limit: 20);

      // Convertir Product a ProductLite usando el factory method
      return page.items
          .map((product) => ProductLite.fromProduct(product))
          .toList();
    } catch (e) {
      print('Error buscando productos: $e');
      return [];
    }
  }

  // ✅ AGREGAR PRODUCTO DIRECTAMENTE DESDE EL BUSCADOR
  Future<bool> addProductManual(ProductLite product, {int quantity = 1}) async {
    try {
      addProductLite(product, qty: quantity.toDouble());
      return true;
    } catch (e) {
      _error = 'Error agregando producto: $e';
      notifyListeners();
      return false;
    }
  }

  /// Intentar agregar por código de barras
  Future<bool> addByBarcode(String code) async {
    try {
      final p = await _productRepo.byBarcode(code);
      if (p == null) return false; // No se encontró el producto
      addProductLite(
        ProductLite.fromProduct(p),
      ); // ✅ Convertir Product a ProductLite
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Finaliza la venta
  Future<Map<String, dynamic>?> checkout({
    required String formaPago,
    required int idUsuario, // ✅ Ahora es requerido
  }) async {
    if (_lines.isEmpty) return null;

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      // ✅ PREPARAR PAYLOAD EXACTO como espera el backend
      print('🔍 Verificando ID usuario: $idUsuario');
      print('🔍 Tipo de ID: ${idUsuario.runtimeType}');
      final payload = {
        'id_usuario': idUsuario, // ✅ Este debe ser 4, no 1
        'forma_pago': formaPago,
        'detalles':
            _lines
                .map(
                  (line) => {
                    'id_producto': line.product.id,
                    'cantidad': line.qty,
                    'precio_unitario': line.price,
                  },
                )
                .toList(),
      };

      print('🛒 [CartController] Enviando venta:');
      print('   ID Usuario: $idUsuario');
      print('   Forma pago: $formaPago');
      print('   Detalles: ${payload['detalles']}');

      print('🛒 [CartController] Enviando venta con usuario ID: $idUsuario');
      print('📦 Payload completo: $payload');
      // ✅ ENVIAR VENTA AL BACKEND usando el nuevo método
      final response = await _ventasRepo.createVenta(payload);

      // ✅ VERIFICAR RESPUESTA EXITOSA
      if (response['success'] == true) {
        // ✅ LIMPIAR CARRITO SI TODO SALE BIEN
        _lines.clear();

        print(
          '✅ [CartController] Venta creada exitosamente: ${response['data']?['id_venta']}',
        );
        return response;
      } else {
        _error = response['message'] ?? 'Error desconocido del servidor';
        return null;
      }
    } on ApiError catch (e) {
      _error = 'Error al crear venta: ${e.message}';
      print('❌ [CartController] Error en checkout: ${e.message}');
      return null;
    } catch (e) {
      _error = 'Error inesperado: $e';
      print('❌ [CartController] Error inesperado: $e');
      return null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}

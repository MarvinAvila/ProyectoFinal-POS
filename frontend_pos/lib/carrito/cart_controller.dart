// lib/carrito/cart_controller.dart
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Base de la API desde --dart-define
const String _kApiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'http://localhost:3000',
);

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

  factory ProductLite.fromJson(Map<String, dynamic> j) {
    double _num(dynamic x) {
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
      precioVenta: _num(
        j['precio_venta'] ?? j['precioVenta'] ?? j['price'] ?? 0,
      ),
      stock: _num(j['stock'] ?? j['existencia'] ?? 0),
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

/// ====== API ======

class _CartApi {
  final Dio _dio;
  static const _storage = FlutterSecureStorage();

  _CartApi._(this._dio);

  static Future<_CartApi> create() async {
    final dio = Dio(
      BaseOptions(
        baseUrl: '$_kApiBase/api',
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) async {
          final token = await _storage.read(key: 'token');
          if (token != null && token.isNotEmpty) {
            o.headers['Authorization'] = 'Bearer $token';
          }
          return h.next(o);
        },
      ),
    );

    return _CartApi._(dio);
  }

  /// Busca por texto (nombre/código).
  Future<List<ProductLite>> searchProducts(String query) async {
    if (query.trim().isEmpty) return [];
    // Ajusta "query" por "q" si tu backend lo requiere.
    final res = await _dio.get('/productos', queryParameters: {'query': query});
    final data = res.data;

    List items;
    if (data is Map && data['data'] is List) {
      items = data['data'];
    } else if (data is List) {
      items = data;
    } else {
      items = [];
    }
    return items
        .map((e) => ProductLite.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Intenta obtener por barcode con varios fallbacks comunes.
  Future<ProductLite?> byBarcode(String code) async {
    // 1) /productos?codigo=xxx
    try {
      final res = await _dio.get(
        '/productos',
        queryParameters: {'codigo': code},
      );
      final data = res.data;
      if (data is List && data.isNotEmpty) {
        return ProductLite.fromJson(Map<String, dynamic>.from(data.first));
      }
      if (data is Map &&
          data['data'] is List &&
          (data['data'] as List).isNotEmpty) {
        return ProductLite.fromJson(
          Map<String, dynamic>.from((data['data'] as List).first),
        );
      }
    } catch (_) {}

    // 2) /productos/barcode/:code
    try {
      final res = await _dio.get('/productos/barcode/$code');
      if (res.data is Map) {
        return ProductLite.fromJson(Map<String, dynamic>.from(res.data as Map));
      }
    } catch (_) {}

    // 3) /productos?codigo_barra=xxx
    try {
      final res = await _dio.get(
        '/productos',
        queryParameters: {'codigo_barra': code},
      );
      final data = res.data;
      if (data is List && data.isNotEmpty) {
        return ProductLite.fromJson(Map<String, dynamic>.from(data.first));
      }
      if (data is Map &&
          data['data'] is List &&
          (data['data'] as List).isNotEmpty) {
        return ProductLite.fromJson(
          Map<String, dynamic>.from((data['data'] as List).first),
        );
      }
    } catch (_) {}
    return null;
  }

  /// Crea una venta con sus detalles.
  ///
  /// Body esperado (común en POS):
  /// {
  ///   forma_pago: 'efectivo'|'tarjeta'|'otro',
  ///   subtotal, iva, total,
  ///   items: [{ id_producto, cantidad, precio_unitario }]
  /// }
  Future<Map<String, dynamic>> createSale({
    required String formaPago,
    required double subtotal,
    required double iva,
    required double total,
    required List<CartLine> lines,
    double? montoRecibido,
  }) async {
    final payload = {
      'forma_pago': formaPago,
      'subtotal': subtotal,
      'iva': iva,
      'total': total,
      if (montoRecibido != null) 'monto_recibido': montoRecibido,
      'items':
          lines
              .map(
                (l) => {
                  'id_producto': l.product.id,
                  'cantidad': l.qty,
                  'precio_unitario': l.price,
                },
              )
              .toList(),
    };

    final res = await _dio.post('/ventas', data: payload);
    return (res.data is Map)
        ? Map<String, dynamic>.from(res.data)
        : {'ok': true};
  }
}

/// ====== CONTROLLER ======

class CartController extends ChangeNotifier {
  late final _CartApi _api;
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

  Future<void> init() async {
    _api = await _CartApi.create();
  }

  void clearError() {
    _error = null;
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
  Future<List<ProductLite>> search(String query) => _api.searchProducts(query);

  /// Intentar agregar por código de barras
  Future<bool> addByBarcode(String code) async {
    try {
      final p = await _api.byBarcode(code);
      if (p == null) return false;
      addProductLite(p);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Finaliza la venta
  Future<Map<String, dynamic>?> checkout({
    required String formaPago, // 'efectivo' | 'tarjeta' | 'otro'
    double? montoRecibido,
  }) async {
    if (_lines.isEmpty) return null;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final resp = await _api.createSale(
        formaPago: formaPago,
        subtotal: itemsSubtotal,
        iva: iva,
        total: total,
        lines: _lines,
        montoRecibido: montoRecibido,
      );
      // Limpia carrito si todo ok
      _lines.clear();
      _loading = false;
      notifyListeners();
      return resp;
    } catch (e) {
      _loading = false;
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }
}

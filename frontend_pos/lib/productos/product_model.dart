// lib/productos/product_model.dart

/// Modelo de producto mapeado a la tabla `productos` del SQL:
/// id_producto, nombre, codigo_barra, precio_compra, precio_venta, stock,
/// unidad, fecha_caducidad, id_proveedor, id_categoria, imagen
class Product {
  final int id;
  final String nombre;
  final String codigoBarra;
  final double precioCompra;
  final double precioVenta;
  final double stock;
  final String unidad; // pieza | kg | lt | otro
  final DateTime? fechaCaducidad;
  final int? idProveedor;
  final int? idCategoria;
  final String? imagen; // url o base64 (depende de tu backend)

  const Product({
    required this.id,
    required this.nombre,
    required this.codigoBarra,
    required this.precioCompra,
    required this.precioVenta,
    required this.stock,
    required this.unidad,
    this.fechaCaducidad,
    this.idProveedor,
    this.idCategoria,
    this.imagen,
  });

  factory Product.fromJson(Map<String, dynamic> j) {
    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    DateTime? _date(dynamic v) {
      if (v == null) return null;
      final s = v.toString();
      return DateTime.tryParse(s);
    }

    return Product(
      id: _int(j['id'] ?? j['id_producto']),
      nombre: (j['nombre'] ?? j['name'] ?? '').toString(),
      codigoBarra: (j['codigoBarra'] ?? j['codigo_barra'] ?? '').toString(),
      precioCompra: _num(j['precioCompra'] ?? j['precio_compra']),
      precioVenta: _num(j['precioVenta'] ?? j['precio_venta']),
      stock: _num(j['stock']),
      unidad: (j['unidad'] ?? 'pieza').toString(),
      fechaCaducidad: _date(
        j['fechaCaducidad'] ?? j['fecha_caducidad'] ?? j['caducidad'],
      ),
      idProveedor: j['id_proveedor'] == null ? null : _int(j['id_proveedor']),
      idCategoria: j['id_categoria'] == null ? null : _int(j['id_categoria']),
      imagen: j['imagen']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id_producto': id,
    'nombre': nombre,
    'codigo_barra': codigoBarra,
    'precio_compra': precioCompra,
    'precio_venta': precioVenta,
    'stock': stock,
    'unidad': unidad,
    'fecha_caducidad': fechaCaducidad?.toIso8601String(),
    'id_proveedor': idProveedor,
    'id_categoria': idCategoria,
    'imagen': imagen,
  };

  bool get bajoStock => stock < 5;
  bool get caducaPronto =>
      fechaCaducidad != null &&
      fechaCaducidad!.isBefore(DateTime.now().add(const Duration(days: 30)));
}

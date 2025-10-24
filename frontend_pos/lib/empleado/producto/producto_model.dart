/// Modelo de producto compatible con el backend Node.js
import 'package:frontend_pos/core/http.dart';

class Product {
  final int idProducto;
  final String nombre;
  final String codigoBarra;
  final double precioCompra;
  final double precioVenta;
  final double stock;
  final String unidad;
  final DateTime? fechaCaducidad;
  final int? idProveedor;
  final int? idCategoria;
  final String? imagen;
  final String? codigoBarrasUrl;
  final String? codigoQrUrl;
  final Map<String, dynamic>? codigosPublicIds;

  const Product({
    required this.idProducto,
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
    this.codigoBarrasUrl,
    this.codigoQrUrl,
    this.codigosPublicIds,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    DateTime? _date(dynamic v) {
      if (v == null) return null;
      return DateTime.tryParse(v.toString());
    }

    return Product(
      idProducto: _int(json['id_producto']),
      nombre: json['nombre']?.toString() ?? '',
      codigoBarra: json['codigo_barra']?.toString() ?? '',
      precioCompra: _num(json['precio_compra']),
      precioVenta: _num(json['precio_venta']),
      stock: _num(json['stock']),
      unidad: json['unidad']?.toString() ?? 'pieza',
      fechaCaducidad: _date(json['fecha_caducidad']),
      idProveedor:
          json['id_proveedor'] == null ? null : _int(json['id_proveedor']),
      idCategoria:
          json['id_categoria'] == null ? null : _int(json['id_categoria']),
      imagen: json['imagen']?.toString(),
      codigoBarrasUrl: json['codigo_barras_url']?.toString(),
      codigoQrUrl: json['codigo_qr_url']?.toString(),
      codigosPublicIds: json['codigos_public_ids'] != null ? asMap(json['codigos_public_ids']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id_producto': idProducto,
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
    'codigo_barras_url': codigoBarrasUrl,
    'codigo_qr_url': codigoQrUrl,
    'codigos_public_ids': codigosPublicIds,
  };
}

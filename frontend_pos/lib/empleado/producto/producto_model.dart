/// Modelo de producto adaptado al rol EMPLEADO.
/// Basado en product_model.dart del admin pero simplificado
/// para mostrar solo los campos necesarios en el POS.

class Producto {
  final int idProducto;
  final String nombre;
  final String codigoBarra;
  final double precioVenta;
  final double stock;
  final String unidad;
  final String? imagen;
  final bool? enOferta;
  final double? precioOferta;
  final double? porcentajeDescuento;

  const Producto({
    required this.idProducto,
    required this.nombre,
    required this.codigoBarra,
    required this.precioVenta,
    required this.stock,
    required this.unidad,
    this.imagen,
    this.enOferta,
    this.precioOferta,
    this.porcentajeDescuento,
  });

  factory Producto.fromJson(Map<String, dynamic> json) {
    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    return Producto(
      idProducto: _int(json['id_producto'] ?? json['id']),
      nombre: json['nombre']?.toString() ?? '',
      codigoBarra: json['codigo_barra']?.toString() ?? '',
      precioVenta: _num(json['precio_venta'] ?? json['precio'] ?? 0),
      stock: _num(json['stock'] ?? 0),
      unidad: json['unidad']?.toString() ?? 'pieza',
      imagen: json['imagen']?.toString(),
      enOferta: json['oferta_activa'] == true || json['en_oferta'] == true,
      precioOferta:
          json['precio_oferta'] != null ? _num(json['precio_oferta']) : null,
      porcentajeDescuento:
          json['porcentaje_descuento'] != null
              ? _num(json['porcentaje_descuento'])
              : null,
    );
  }

  /// Devuelve el precio actual a mostrar (oferta si existe)
  double get precioFinal => precioOferta ?? precioVenta;

  Map<String, dynamic> toJson() => {
    'id_producto': idProducto,
    'nombre': nombre,
    'codigo_barra': codigoBarra,
    'precio_venta': precioVenta,
    'stock': stock,
    'unidad': unidad,
    'imagen': imagen,
    'en_oferta': enOferta,
    'precio_oferta': precioOferta,
    'porcentaje_descuento': porcentajeDescuento,
  };
}

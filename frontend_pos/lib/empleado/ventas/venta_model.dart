
class Venta {
  final int idVenta;
  final DateTime fecha;
  final int idUsuario;
  final String formaPago;
  final double subtotal;
  final double iva;
  final double total;
  final List<DetalleVenta> detalles;
  final String? usuarioNombre;

  Venta({
    required this.idVenta,
    required this.fecha,
    required this.idUsuario,
    required this.formaPago,
    required this.subtotal,
    required this.iva,
    required this.total,
    required this.detalles,
    this.usuarioNombre,
  });

  factory Venta.fromJson(Map<String, dynamic> json) {
    return Venta(
      idVenta: json['id_venta'] ?? json['idVenta'] ?? 0,
      fecha: DateTime.parse(json['fecha']),
      idUsuario: json['id_usuario'] ?? json['idUsuario'] ?? 0,
      formaPago: json['forma_pago'] ?? 'efectivo',
      subtotal: (json['subtotal'] ?? 0).toDouble(),
      iva: (json['iva'] ?? 0).toDouble(),
      total: (json['total'] ?? 0).toDouble(),
      usuarioNombre: json['usuario_nombre'],
      detalles: (json['detalles'] as List<dynamic>?)
              ?.map((detalle) => DetalleVenta.fromJson(detalle))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id_venta': idVenta,
      'fecha': fecha.toIso8601String(),
      'id_usuario': idUsuario,
      'forma_pago': formaPago,
      'subtotal': subtotal,
      'iva': iva,
      'total': total,
      'usuario_nombre': usuarioNombre,
      'detalles': detalles.map((detalle) => detalle.toJson()).toList(),
    };
  }
}

class DetalleVenta {
  final int idDetalle;
  final int idVenta;
  final int idProducto;
  final double cantidad;
  final double precioUnitario;
  final double subtotal;
  final String? productoNombre;

  DetalleVenta({
    required this.idDetalle,
    required this.idVenta,
    required this.idProducto,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
    this.productoNombre,
  });

  factory DetalleVenta.fromJson(Map<String, dynamic> json) {
    return DetalleVenta(
      idDetalle: json['id_detalle'] ?? json['idDetalle'] ?? 0,
      idVenta: json['id_venta'] ?? json['idVenta'] ?? 0,
      idProducto: json['id_producto'] ?? json['idProducto'] ?? 0,
      cantidad: (json['cantidad'] ?? 0).toDouble(),
      precioUnitario: (json['precio_unitario'] ?? 0).toDouble(),
      subtotal: (json['subtotal'] ?? 0).toDouble(),
      productoNombre: json['producto_nombre'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id_detalle': idDetalle,
      'id_venta': idVenta,
      'id_producto': idProducto,
      'cantidad': cantidad,
      'precio_unitario': precioUnitario,
      'subtotal': subtotal,
      'producto_nombre': productoNombre,
    };
  }
}
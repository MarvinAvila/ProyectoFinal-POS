// lib/admin/ventas/venta_model.dart

class Venta {
  /// id_venta SERIAL PRIMARY KEY
  final int? idVenta;

  /// fecha TIMESTAMP DEFAULT NOW()
  final DateTime? fecha;

  /// id_usuario INT (FK) ON DELETE SET NULL
  final int? idUsuario;

  /// forma_pago VARCHAR(50) CHECK ('efectivo','tarjeta','otro')
  final String formaPago;

  /// subtotal NUMERIC(12,2) NOT NULL
  final double subtotal;

  /// iva NUMERIC(12,2) NOT NULL
  final double iva;

  /// total NUMERIC(12,2) NOT NULL
  final double total;

  const Venta({
    this.idVenta,
    this.fecha,
    this.idUsuario,
    required this.formaPago,
    required this.subtotal,
    required this.iva,
    required this.total,
  });

  /// ---- Helpers ----
  static double _toDouble(dynamic v) =>
      v == null ? 0.0 : double.tryParse(v.toString()) ?? 0.0;

  static DateTime? _toDateTime(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    final s = v.toString();
    return s.isEmpty ? null : DateTime.tryParse(s);
  }

  /// Crea Venta desde JSON con claves snake_case del backend
  factory Venta.fromJson(Map<String, dynamic> json) {
    return Venta(
      idVenta: json['id_venta'],
      fecha: _toDateTime(json['fecha']),
      idUsuario: json['id_usuario'],
      formaPago: json['forma_pago'] ?? 'efectivo',
      subtotal: _toDouble(json['subtotal']),
      iva: _toDouble(json['iva']),
      total: _toDouble(json['total']),
    );
  }

  /// Para enviar/guardar en backend (snake_case)
  Map<String, dynamic> toJson() {
    return {
      if (idVenta != null) 'id_venta': idVenta,
      if (fecha != null) 'fecha': fecha!.toIso8601String(),
      'id_usuario': idUsuario, // puede ir null (backend permite SET NULL)
      'forma_pago': formaPago,
      'subtotal': subtotal,
      'iva': iva,
      'total': total,
    };
  }

  /// copyWith para actualizaciones inmutables
  Venta copyWith({
    int? idVenta,
    DateTime? fecha,
    int? idUsuario,
    String? formaPago,
    double? subtotal,
    double? iva,
    double? total,
  }) {
    return Venta(
      idVenta: idVenta ?? this.idVenta,
      fecha: fecha ?? this.fecha,
      idUsuario: idUsuario ?? this.idUsuario,
      formaPago: formaPago ?? this.formaPago,
      subtotal: subtotal ?? this.subtotal,
      iva: iva ?? this.iva,
      total: total ?? this.total,
    );
  }
}

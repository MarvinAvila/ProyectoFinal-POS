// lib/alertas/alert_model.dart

/// Tipos que maneja tu BD:
/// 'caducidad' | 'stock_bajo'
enum AlertType { caducidad, stockBajo, otro }

AlertType alertTypeFromString(String? v) {
  switch ((v ?? '').toLowerCase()) {
    case 'caducidad':
      return AlertType.caducidad;
    case 'stock_bajo':
      return AlertType.stockBajo;
    default:
      return AlertType.otro;
  }
}

String alertTypeToText(AlertType t) {
  switch (t) {
    case AlertType.caducidad:
      return 'Caducidad';
    case AlertType.stockBajo:
      return 'Stock bajo';
    case AlertType.otro:
      return 'Alerta';
  }
}

class AlertItem {
  final int id;
  final int? productId;
  final String message;
  final DateTime date;
  final AlertType type;
  final bool attended;

  /// Opcional si tu API la entrega (no está en la tabla, pero a veces se une por nombre)
  final String? productName;

  AlertItem({
    required this.id,
    required this.productId,
    required this.message,
    required this.date,
    required this.type,
    required this.attended,
    this.productName,
  });

  /// Soporta tanto snake_case (como en la BD) como camelCase (si el backend lo formatea).
  factory AlertItem.fromJson(Map<String, dynamic> j) {
    int _int(dynamic x) => x is int ? x : int.tryParse('${x ?? ''}') ?? 0;

    String? _s(dynamic x) => x?.toString();
    bool _b(dynamic x) {
      if (x is bool) return x;
      final s = x?.toString().toLowerCase();
      return s == 'true' || s == '1';
    }

    String? tipo = _s(j['tipo']);
    final fechaRaw = j['fecha'] ?? j['created_at'] ?? j['creado_en'];
    DateTime parsedDate;
    if (fechaRaw is DateTime) {
      parsedDate = fechaRaw;
    } else {
      parsedDate = DateTime.tryParse('$fechaRaw') ?? DateTime.now();
    }

    return AlertItem(
      id: _int(j['id_alerta'] ?? j['id'] ?? j['alertId']),
      productId:
          (j['id_producto'] ?? j['product_id'] ?? j['idProducto']) == null
              ? null
              : _int(j['id_producto'] ?? j['product_id'] ?? j['idProducto']),
      message: _s(j['mensaje'] ?? j['message']) ?? '',
      date: parsedDate,
      type: alertTypeFromString(tipo),
      attended: _b(j['atendida'] ?? j['attended']),
      productName: _s(j['producto']?['nombre'] ?? j['product_name']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id_alerta': id,
    'id_producto': productId,
    'mensaje': message,
    'fecha': date.toIso8601String(),
    'tipo':
        {
          AlertType.caducidad: 'caducidad',
          AlertType.stockBajo: 'stock_bajo',
          AlertType.otro: 'otro',
        }[type],
    'atendida': attended,
    if (productName != null) 'product_name': productName,
  };

  AlertItem copyWith({bool? attended}) {
    return AlertItem(
      id: id,
      productId: productId,
      message: message,
      date: date,
      type: type,
      attended: attended ?? this.attended,
      productName: productName,
    );
  }
}

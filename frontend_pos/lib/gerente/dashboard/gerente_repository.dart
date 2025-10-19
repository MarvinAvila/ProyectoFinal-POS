// lib/gerente/dashboard/dashboard_repository.dart
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/auth/auth_service.dart';
import 'package:intl/intl.dart';

/// ---- Modelos ----

class GerenteDashboardData {
  final double ventasHoy;
  final double ventasMes;
  final int totalVentasHoy;
  final int alertasPendientes;
  final List<SalesPoint> ventasUltimaSemana;
  final List<TopProducto> topProductos;

  const GerenteDashboardData({
    required this.ventasHoy,
    required this.ventasMes,
    required this.totalVentasHoy,
    required this.alertasPendientes,
    required this.ventasUltimaSemana,
    required this.topProductos,
  });

  factory GerenteDashboardData.fromJson(Map<String, dynamic> j) {
    // Backend análogo al admin: datos en "estadisticas"
    final stats = j['estadisticas'] ?? {};
    final ventasSemana = j['ventas_ultima_semana'] ?? [];
    // Top productos puede venir como "top_productos" o "productos_populares"
    final top = j['top_productos'] ?? j['productos_populares'] ?? [];

    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    return GerenteDashboardData(
      ventasHoy: _num(stats['ventas_hoy']?['ingresos'] ?? 0),
      ventasMes: _num(stats['ventas_mes']?['ingresos'] ?? 0),
      totalVentasHoy: _int(stats['ventas_hoy']?['total'] ?? 0),
      alertasPendientes: _int(stats['alertas_pendientes'] ?? 0),

      ventasUltimaSemana:
          (ventasSemana is List)
              ? ventasSemana
                  .map((v) => SalesPoint.fromJson(Map<String, dynamic>.from(v)))
                  .toList()
              : [],

      topProductos:
          (top is List)
              ? top
                  .map(
                    (e) => TopProducto.fromJson(Map<String, dynamic>.from(e)),
                  )
                  .toList()
              : [],
    );
  }
}

class TopProducto {
  final int id;
  final String nombre;
  final double vendidos;
  final double total;

  TopProducto({
    required this.id,
    required this.nombre,
    required this.vendidos,
    required this.total,
  });

  factory TopProducto.fromJson(Map<String, dynamic> j) {
    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    return TopProducto(
      id: _int(j['id'] ?? j['id_producto']),
      nombre: (j['nombre'] ?? j['producto'] ?? '').toString(),
      vendidos: _num(j['vendidos'] ?? j['cantidad'] ?? 0),
      total: _num(j['total'] ?? j['importe'] ?? j['monto'] ?? 0),
    );
  }
}

class SalesPoint {
  final DateTime fecha;
  final double ingresos;
  final int totalVentas;

  SalesPoint({
    required this.fecha,
    required this.ingresos,
    required this.totalVentas,
  });

  factory SalesPoint.fromJson(Map<String, dynamic> j) {
    final f = DateTime.tryParse(j['fecha']?.toString() ?? '') ?? DateTime.now();
    final ingresos =
        (j['ingresos'] is num)
            ? (j['ingresos'] as num).toDouble()
            : double.tryParse('${j['ingresos'] ?? 0}') ?? 0.0;
    final totalVentas =
        (j['total_ventas'] is num)
            ? (j['total_ventas'] as num).toInt()
            : int.tryParse('${j['total_ventas'] ?? 0}') ?? 0;
    return SalesPoint(fecha: f, ingresos: ingresos, totalVentas: totalVentas);
  }
}

/// ---- Repositorio ----
class GerenteDashboardRepository {
  final _api = ApiClient();

  Map<String, String> _authHeaders() {
    final token = AuthService.token;
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// 🔹 Resumen del dashboard del GERENTE
  /// Endpoint esperado: /dashboard/gerente
  /// Estructura: { data: { estadisticas: {...}, ventas_ultima_semana:[...], top_productos:[...] } }
  /// 🔹 Resumen del dashboard del GERENTE + Top Productos
  Future<GerenteDashboardData> fetchDashboard() async {
    // Obtener resumen del dashboard
    final resumen = await _api.get(
      '/dashboard/resumen',
      headers: _authHeaders(),
    );

    // Obtener top de productos (nuevo)
    final top = await _api.get(
      '/ventas/top-productos',
      headers: _authHeaders(),
    );

    // Normalizar estructura del resumen
    final normalized =
        (resumen is Map && resumen.containsKey('data'))
            ? resumen['data']
            : resumen;

    // Fusionar ambos resultados
    final merged = {
      ...Map<String, dynamic>.from(normalized ?? {}),
      'top_productos':
          top is Map && top.containsKey('data') ? top['data'] : top,
    };

    // Construir objeto final
    return GerenteDashboardData.fromJson(Map<String, dynamic>.from(merged));
  }
}

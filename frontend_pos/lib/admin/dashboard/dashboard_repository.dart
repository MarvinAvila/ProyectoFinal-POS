// lib/admin/dashboard/dashboard_repository.dart
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/auth/auth_service.dart';
import 'package:intl/intl.dart';

/// ---- Modelos ----

class DashboardData {
  final double ventasHoy;
  final double ventasMes;
  final int totalVentasHoy;
  final int totalProductos;
  final int totalCategorias;
  final int totalProveedores;
  final int totalUsuarios;
  final int alertasPendientes;
  final List<SalesPoint> ventasUltimaSemana; // ✅ Nueva propiedad para gráficas

  const DashboardData({
    required this.ventasHoy,
    required this.ventasMes,
    required this.totalVentasHoy,
    required this.totalProductos,
    required this.totalCategorias,
    required this.totalProveedores,
    required this.totalUsuarios,
    required this.alertasPendientes,
    required this.ventasUltimaSemana,
  });

  factory DashboardData.fromJson(Map<String, dynamic> j) {
    // 🔹 El backend devuelve los datos dentro de "estadisticas"
    final stats = j['estadisticas'] ?? {};
    final ventasSemana = j['ventas_ultima_semana'] ?? [];

    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    return DashboardData(
      ventasHoy: _num(stats['ventas_hoy']?['ingresos'] ?? 0),
      ventasMes: _num(stats['ventas_mes']?['ingresos'] ?? 0),
      totalVentasHoy: _int(stats['ventas_hoy']?['total'] ?? 0),
      totalProductos: _int(stats['total_productos'] ?? 0),
      totalCategorias: _int(stats['total_categorias'] ?? 0),
      totalProveedores: _int(stats['total_proveedores'] ?? 0),
      totalUsuarios: _int(stats['total_usuarios'] ?? 0),
      alertasPendientes: _int(stats['alertas_pendientes'] ?? 0),

      // ✅ Mapear ventas_ultima_semana del backend
      ventasUltimaSemana:
          (ventasSemana is List)
              ? ventasSemana
                  .map((v) => SalesPoint.fromJson(Map<String, dynamic>.from(v)))
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
class DashboardRepository {
  final _api = ApiClient();

  /// Helper privado que agrega token a los headers
  Map<String, String> _authHeaders() {
    final token = AuthService.token;
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// 🔹 Resumen general del dashboard (datos + gráficas)
  Future<DashboardData> fetchDashboard() async {
    final data = await _api.get('/dashboard/resumen', headers: _authHeaders());

    // 🔸 Estructura esperada: { data: { estadisticas: {...}, ventas_ultima_semana: [...], ... } }
    final normalized =
        (data is Map && data.containsKey('data')) ? data['data'] : data;

    return DashboardData.fromJson(Map<String, dynamic>.from(normalized ?? {}));
  }

  /// 🔹 Métricas rápidas
  Future<Map<String, dynamic>> fetchMetricasRapidas() async {
    final data = await _api.get(
      '/dashboard/metricas-rapidas',
      headers: _authHeaders(),
    );
    final normalized =
        (data is Map && data.containsKey('data')) ? data['data'] : data;
    return asMap(normalized);
  }

  /// 🔹 Alertas del dashboard
  Future<List<Map<String, dynamic>>> fetchAlertas() async {
    final data = await _api.get('/dashboard/alertas', headers: _authHeaders());
    final normalized =
        (data is Map && data.containsKey('data')) ? data['data'] : data;
    return asList(normalized).map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// 🔹 Productos más vendidos
  Future<List<TopProducto>> fetchTopProductos({int limit = 5}) async {
    final data = await _api.get(
      '/dashboard/top-productos',
      query: {'limit': limit},
      headers: _authHeaders(),
    );
    final normalized =
        (data is Map && data.containsKey('data')) ? data['data'] : data;
    final list = asList(normalized);
    return list
        .map((e) => TopProducto.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}

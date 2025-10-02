// lib/dashboard/dashboard_repository.dart
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';

/// ---- Modelos ----

class DashboardSummary {
  final double ventasHoy;
  final double ventasMes;
  final int totalVentasHoy;
  final int totalProductos;
  final int totalCategorias;
  final int totalProveedores;
  final int totalUsuarios;
  final int alertasPendientes;

  const DashboardSummary({
    required this.ventasHoy,
    required this.ventasMes,
    required this.totalVentasHoy,
    required this.totalProductos,
    required this.totalCategorias,
    required this.totalProveedores,
    required this.totalUsuarios,
    required this.alertasPendientes,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> j) {
    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    // Se aceptan varios alias por si el backend devuelve otras claves
    return DashboardSummary(
      ventasHoy: _num(j['ventasHoy'] ?? j['salesToday'] ?? j['ventas_dia']),
      ventasMes: _num(j['ventasMes'] ?? j['salesMonth'] ?? j['ventas_mes']),
      totalVentasHoy: _int(
        j['totalVentasHoy'] ?? j['ordersToday'] ?? j['tickets_hoy'],
      ),
      totalProductos: _int(j['totalProductos'] ?? j['productos'] ?? j['items']),
      totalCategorias: _int(j['totalCategorias'] ?? j['categorias'] ?? 0),
      totalProveedores: _int(j['totalProveedores'] ?? j['proveedores'] ?? 0),
      totalUsuarios: _int(j['totalUsuarios'] ?? j['usuarios'] ?? 0),
      alertasPendientes: _int(
        j['alertasPendientes'] ?? j['alertsPending'] ?? j['alertas'],
      ),
    );
  }
}

class TopProducto {
  final int id;
  final String nombre;
  final double vendidos; // cantidad vendida
  final double total; // monto acumulado

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
      nombre: (j['nombre'] ?? j['product'] ?? j['producto'] ?? '').toString(),
      vendidos: _num(j['vendidos'] ?? j['qty'] ?? j['cantidad']),
      total: _num(j['total'] ?? j['importe'] ?? j['monto']),
    );
  }
}

/// ---- Repositorio ----
/// Endpoints esperados (ajústalos si tu backend usa otros):
/// GET /api/dashboard/summary
/// GET /api/dashboard/top-productos?limit=5
/// (Opcional) GET /api/dashboard/ventas-dia?days=7
class DashboardRepository {
  final _api = ApiClient();

  Future<DashboardSummary> fetchSummary() async {
    final data = await _api.get('${Endpoints.dashboard}/summary');
    return DashboardSummary.fromJson(asMap(data));
  }

  Future<List<TopProducto>> fetchTopProductos({int limit = 5}) async {
    final data = await _api.get(
      '${Endpoints.dashboard}/top-productos',
      query: {'limit': limit},
    );
    final list = asList(data);
    return list
        .map((e) => TopProducto.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Serie de ventas por día para gráficos (si lo implementaste en el backend).
  /// Formato aceptado:
  ///  - [{fecha: '2025-09-30', total: 123.45}, ...]
  ///  - {data: [...]} o {items: [...]}
  Future<List<SalesPoint>> ventasPorDia({int days = 7}) async {
    final data = await _api.get(
      '${Endpoints.dashboard}/ventas-dia',
      query: {'days': days},
    );
    final raw = (data is Map) ? (data['data'] ?? data['items'] ?? []) : data;
    final list = asList(raw);
    return list
        .map((e) => SalesPoint.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}

class SalesPoint {
  final DateTime fecha;
  final double total;
  SalesPoint(this.fecha, this.total);

  factory SalesPoint.fromJson(Map<String, dynamic> j) {
    final f = DateTime.tryParse(j['fecha']?.toString() ?? '') ?? DateTime.now();
    final t =
        (j['total'] is num)
            ? (j['total'] as num).toDouble()
            : double.tryParse('${j['total'] ?? 0}') ?? 0.0;
    return SalesPoint(f, t);
  }
}

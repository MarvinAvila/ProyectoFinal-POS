import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/auth/auth_service.dart';

/// ---- Modelo principal ----
/// Representa toda la información que el Dashboard del Dueño muestra.
class DuenoDashboardData {
  final double ingresosTotales; // 💰 Suma de todas las ventas
  final double ivaRecaudado; // 💸 IVA total
  final double promedioVenta; // 📈 Promedio de venta
  final List<CrecimientoMensual>
  crecimiento; // 📊 Tendencia de ingresos últimos meses
  final List<TopProducto> productosRentables; // ⭐ Productos con mayor ganancia
  final List<VentasEmpleado> ventasPorEmpleado; // 👩‍💼 Ranking de empleados
  final int alertasActivas; // ⚠️ Total de alertas sin atender
  final List<CategoriaDistribucion>
  categoriasDistribucion; // 🥧 Distribución inventario

  const DuenoDashboardData({
    required this.ingresosTotales,
    required this.ivaRecaudado,
    required this.promedioVenta,
    required this.crecimiento,
    required this.productosRentables,
    required this.ventasPorEmpleado,
    required this.alertasActivas,
    required this.categoriasDistribucion,
  });

  factory DuenoDashboardData.fromJson(Map<String, dynamic> j) {
    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    return DuenoDashboardData(
      ingresosTotales: _num(j['ingresos_totales'] ?? 0),
      ivaRecaudado: _num(j['iva_total'] ?? 0),
      promedioVenta: _num(j['promedio_venta'] ?? 0),
      crecimiento:
          (j['crecimiento_mensual'] is List)
              ? (j['crecimiento_mensual'] as List)
                  .map(
                    (e) => CrecimientoMensual.fromJson(
                      Map<String, dynamic>.from(e),
                    ),
                  )
                  .toList()
              : [],
      productosRentables:
          (j['productos_rentables'] is List)
              ? (j['productos_rentables'] as List)
                  .map(
                    (e) => TopProducto.fromJson(Map<String, dynamic>.from(e)),
                  )
                  .toList()
              : [],
      ventasPorEmpleado:
          (j['ventas_empleado'] is List)
              ? (j['ventas_empleado'] as List)
                  .map(
                    (e) =>
                        VentasEmpleado.fromJson(Map<String, dynamic>.from(e)),
                  )
                  .toList()
              : [],
      alertasActivas: _int(j['alertas_activas'] ?? 0),
      categoriasDistribucion:
          (j['categorias_distribucion'] is List)
              ? (j['categorias_distribucion'] as List)
                  .map(
                    (e) => CategoriaDistribucion.fromJson(
                      Map<String, dynamic>.from(e),
                    ),
                  )
                  .toList()
              : [],
    );
  }
}

/// ---- Submodelos ----

class CrecimientoMensual {
  final String mes;
  final double ingresos;
  CrecimientoMensual({required this.mes, required this.ingresos});

  factory CrecimientoMensual.fromJson(Map<String, dynamic> j) {
    return CrecimientoMensual(
      mes: j['mes']?.toString() ?? '',
      ingresos:
          (j['ingresos'] is num)
              ? (j['ingresos'] as num).toDouble()
              : double.tryParse('${j['ingresos'] ?? 0}') ?? 0.0,
    );
  }
}

class TopProducto {
  final int id;
  final String nombre;
  final double ganancia;

  TopProducto({required this.id, required this.nombre, required this.ganancia});

  factory TopProducto.fromJson(Map<String, dynamic> j) {
    double _num(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0.0;
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;

    return TopProducto(
      id: _int(j['id_producto'] ?? j['id']),
      nombre: j['nombre']?.toString() ?? '',
      ganancia: _num(j['ganancia'] ?? j['total'] ?? 0),
    );
  }
}

class VentasEmpleado {
  final String empleado;
  final double total;

  VentasEmpleado({required this.empleado, required this.total});

  factory VentasEmpleado.fromJson(Map<String, dynamic> j) {
    return VentasEmpleado(
      empleado: j['empleado']?.toString() ?? '',
      total:
          (j['total'] is num)
              ? (j['total'] as num).toDouble()
              : double.tryParse('${j['total'] ?? 0}') ?? 0.0,
    );
  }
}

class CategoriaDistribucion {
  final String categoria;
  final int cantidad;

  CategoriaDistribucion({required this.categoria, required this.cantidad});

  factory CategoriaDistribucion.fromJson(Map<String, dynamic> j) {
    int _int(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;
    return CategoriaDistribucion(
      categoria: j['categoria']?.toString() ?? '',
      cantidad: _int(j['cantidad'] ?? 0),
    );
  }
}

/// ---- Repositorio ----
class DuenoDashboardRepository {
  final _api = ApiClient();

  Map<String, String> _authHeaders() {
    final token = AuthService.token;
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// 🔹 Obtiene datos del Dashboard del Dueño desde el backend
  /// Endpoint: /api/dashboard/dueno
  Future<DuenoDashboardData> fetchDashboard() async {
    final data = await _api.get('/dashboard/resumen', headers: _authHeaders());
    final normalized =
        (data is Map && data.containsKey('data')) ? data['data'] : data;

    return DuenoDashboardData.fromJson(
      Map<String, dynamic>.from(normalized ?? {}),
    );
  }
}

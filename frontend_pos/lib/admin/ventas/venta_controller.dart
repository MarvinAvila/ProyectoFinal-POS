// lib/admin/ventas/ventas_controller.dart CORREGIDO
import 'package:flutter/foundation.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';
import 'venta_model.dart';

class VentasController extends ChangeNotifier {
  final _api = ApiClient(); // ✅ Usar ApiClient en lugar de Dio manual

  // Estado
  bool loading = true;
  String? error;

  // Datos
  List<Venta> ventas = [];
  double ingresosTotales = 0.0;
  int totalVentas = 0;

  // Paginación
  int page = 1;
  int limit = 20;
  int pages = 1;

  double _toDouble(dynamic v) =>
      v == null ? 0.0 : double.tryParse(v.toString()) ?? 0.0;

  /// 🔹 Carga estadísticas (usa /ventas/estadisticas)
  Future<void> fetchStats({String? desde, String? hasta}) async {
    try {
      final query = <String, dynamic>{};
      if (desde != null) query['fecha_inicio'] = desde;
      if (hasta != null) query['fecha_fin'] = hasta;

      final data = await _api.get('${Endpoints.ventas}/estadisticas', query: query);
      final general = data['general']; // ✅ ApiClient ya extrae 'data'
      ingresosTotales = _toDouble(general['ingresos_totales']);
      totalVentas = int.tryParse(general['total_ventas'].toString()) ?? 0;
      error = null;
      notifyListeners();
    } catch (e) {
      error = 'Error cargando estadísticas: $e';
      notifyListeners();
    }
  }

  /// 🔹 Lista de ventas (usa /ventas)
  Future<void> fetchAll({int? pageOverride}) async {
    loading = true;
    notifyListeners();

    try {
      final data = await _api.get(
        Endpoints.ventas, 
        query: {'page': pageOverride ?? page, 'limit': limit}
      );

      final list = (data['ventas'] as List?) ?? [];
      ventas = list.map((e) => Venta.fromJson(Map<String, dynamic>.from(e))).toList();

      // Paginación
      final pag = data['pagination'];
      page = pag['page'] ?? 1;
      limit = pag['limit'] ?? limit;
      pages = pag['pages'] ?? 1;

      error = null;
    } catch (e) {
      error = 'Error cargando ventas: $e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// 🔹 Carga inicial: estadísticas + listado
  Future<void> init() async {
    await fetchStats();
    await fetchAll(pageOverride: 1);
  }
}
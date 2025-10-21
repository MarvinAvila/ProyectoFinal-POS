import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';

class VentasService {
  final _api = ApiClient();

  Future<Map<String, dynamic>> estadisticas({
    String? desde,
    String? hasta,
  }) async {
    try {
      final qs = <String, String>{};
      if (desde != null) qs['fecha_inicio'] = desde;
      if (hasta != null) qs['fecha_fin'] = hasta;

      // ✅ Petición simplificada. ApiClient maneja URL y token.
      final data = await _api.get('${Endpoints.ventas}/estadisticas', query: qs);
      return asMap(data);
    } on ApiError {
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado obteniendo estadísticas: $e');
    }
  }

  Future<List<dynamic>> listar({int page = 1, int limit = 50}) async {
    try {
      // ✅ Petición simplificada.
      final data = await _api.get(Endpoints.ventas, query: {'page': page, 'limit': limit});
      // ApiClient._parse ya extrae el contenido de 'data', por lo que accedemos a 'ventas'.
      return asList(asMap(data)['ventas']);
    } on ApiError {
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado listando ventas: $e');
    }
  }
}

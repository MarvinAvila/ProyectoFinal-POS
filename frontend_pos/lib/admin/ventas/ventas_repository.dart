import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';

class VentasRepository {
  final _api = ApiClient();

  /// 🔹 Registra una nueva venta en el backend.
  ///
  /// El `payload` debe tener la forma:
  /// ```json
  /// {
  ///   "id_usuario": 1,
  ///   "forma_pago": "efectivo",
  ///   "total": 150.50,
  ///   "detalles": [
  ///     { "id_producto": 10, "cantidad": 2, "precio_unitario": 50.0 },
  ///     { "id_producto": 12, "cantidad": 1, "precio_unitario": 50.5 }
  ///   ]
  /// }
  /// ```
  Future<Map<String, dynamic>> createVenta(Map<String, dynamic> payload) async {
    try {
      final data = await _api.post(Endpoints.ventas, data: payload);
      return asMap(data);
    } on ApiError {
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado al crear la venta: $e');
    }
  }

  /// 🔹 Obtiene la lista de ventas paginada.
  Future<List<dynamic>> listar({int page = 1, int limit = 50}) async {
    try {
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
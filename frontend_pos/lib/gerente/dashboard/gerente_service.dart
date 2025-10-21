// lib/gerente/services/gerente_service.dart
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';

class GerenteService {
  final _api = ApiClient();

  // NOTA: La lógica de login ya está centralizada en `AuthService`.
  // Este archivo ahora solo se encarga de las peticiones específicas del gerente.

  /// 📊 RESUMEN GERENTE (equivalente a fetchSummary del admin)
  /// Usa el token guardado y consulta /api/dashboard/resumen
  Future<Map<String, dynamic>> fetchSummary() async {
    try {
      // ✅ Petición limpia y segura. El token se añade automáticamente.
      // Tu backend en dashboard.js usa /dashboard/resumen para todos los roles.
      final data = await _api.get(Endpoints.dashboardResumen);
      return asMap(data);
    } on ApiError {
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado al obtener resumen del gerente: $e');
    }
  }
}

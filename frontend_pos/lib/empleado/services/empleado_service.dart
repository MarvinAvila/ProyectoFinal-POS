// lib/empleado/services/empleado_service.dart CORREGIDO
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';

class EmpleadoService {
  static final _api = ApiClient();

  /// 🔑 LOGIN EMPLEADO
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final data = await _api.post(
        Endpoints.authLogin,
        data: {'correo': email, 'contrasena': password},
      );

      if (data['token'] != null) {
        await ApiClient.setToken(data['token']);
        return {'success': true, 'token': data['token']};
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Credenciales inválidas',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error en el servidor: $e',
      };
    }
  }

  /// 📊 RESUMEN EMPLEADO
  static Future<Map<String, dynamic>> fetchSummary() async {
    try {
      final data = await _api.get(Endpoints.dashboardResumen);
      return data;
    } catch (e) {
      throw Exception('Error al obtener resumen del empleado: $e');
    }
  }
}
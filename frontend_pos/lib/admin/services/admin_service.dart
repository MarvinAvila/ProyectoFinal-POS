// lib/admin/services/admin_service.dart CORREGIDO
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';

class AdminService {
  static final _api = ApiClient();

  /// 🔑 LOGIN ADMIN
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final data = await _api.post(
        Endpoints.authLogin,
        data: {
          'correo': email,
          'contrasena': password,
        },
      );

      // ✅ ApiClient.setToken guarda automáticamente el token
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

  /// 📊 RESUMEN ADMIN
  static Future<Map<String, dynamic>> fetchSummary() async {
    try {
      final data = await _api.get(Endpoints.dashboardResumen);
      return data; // ✅ ApiClient ya extrae 'data' si existe
    } catch (e) {
      throw Exception('Error al obtener resumen: $e');
    }
  }
}
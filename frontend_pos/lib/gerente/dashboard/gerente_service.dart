// lib/gerente/services/gerente_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class GerenteService {
  // Igual que en AdminService para autenticación
  static const String _authBase = 'http://192.168.1.67:3000/api/auth';
  // Para el resumen del gerente
  static const String _dashboardBase = 'http://192.168.1.67:3000/api/dashboard';

  /// 🔑 LOGIN GERENTE (mismo patrón que AdminService.login)
  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$_authBase/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'correo': email, // campos que espera tu backend
        'contrasena': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      if (data['success'] == true && data['token'] != null) {
        // Guardar token para posteriores peticiones (igual que admin)
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);

        return {'success': true, 'token': data['token']};
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Credenciales inválidas',
        };
      }
    } else {
      return {
        'success': false,
        'message': 'Error en el servidor (${response.statusCode})',
      };
    }
  }

  /// 📊 RESUMEN GERENTE (equivalente a fetchSummary del admin)
  /// Usa el token guardado y consulta /api/dashboard/gerente
  static Future<Map<String, dynamic>> fetchSummary([String? token]) async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = token ?? prefs.getString('token');

    if (savedToken == null || savedToken.isEmpty) {
      throw Exception('Token no encontrado');
    }

    final response = await http.get(
      Uri.parse('$_dashboardBase/gerente'),
      headers: {'Authorization': 'Bearer $savedToken'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);

      if (data['success'] == true) {
        // El backend suele responder { success, data: {...} }
        // devolvemos solo el payload útil como en AdminService
        return Map<String, dynamic>.from(data['data'] ?? {});
      } else {
        throw Exception(
          data['message'] ?? 'Error al obtener resumen del gerente',
        );
      }
    } else {
      throw Exception('Error en el servidor (${response.statusCode})');
    }
  }
}

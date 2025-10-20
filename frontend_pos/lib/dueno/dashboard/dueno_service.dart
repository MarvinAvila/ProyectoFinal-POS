// lib/dueno/services/dueno_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class DuenoService {
  // Rutas base (mismo patrón que GerenteService)
  static const String _authBase = 'http://192.168.1.67:3000/api/auth';
  static const String _dashboardBase = 'http://192.168.1.67:3000/api/dashboard';

  /// 🔑 LOGIN DUEÑO (mismo formato que GerenteService.login)
  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$_authBase/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'correo': email, 'contrasena': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      if (data['success'] == true && data['token'] != null) {
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

  /// 📊 DASHBOARD DEL DUEÑO
  /// Consulta /api/dashboard/dueno con el token guardado
  static Future<Map<String, dynamic>> fetchSummary([String? token]) async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = token ?? prefs.getString('token');

    if (savedToken == null || savedToken.isEmpty) {
      throw Exception('Token no encontrado');
    }

    final response = await http.get(
      Uri.parse('$_dashboardBase/dueno'),
      headers: {'Authorization': 'Bearer $savedToken'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);

      if (data['success'] == true) {
        // Devuelve directamente los datos útiles del dashboard
        return Map<String, dynamic>.from(data['data'] ?? {});
      } else {
        throw Exception(
          data['message'] ?? 'Error al obtener el resumen del dueño',
        );
      }
    } else {
      throw Exception('Error en el servidor (${response.statusCode})');
    }
  }
}

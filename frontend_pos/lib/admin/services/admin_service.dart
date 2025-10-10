import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AdminService {
  static const String baseUrl = 'http://192.168.1.67:3000/api/auth';

  /// 🔑 LOGIN ADMIN
  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'correo': email, // 👈 Ajusta al nombre que espera tu backend
        'contrasena': password, // 👈 Ajusta al nombre que espera tu backend
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      if (data['success'] == true && data['token'] != null) {
        // Guardar token en SharedPreferences para posteriores peticiones
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

  /// 📊 RESUMEN ADMIN
  static Future<Map<String, dynamic>> fetchSummary([String? token]) async {
    // Si no se pasa token, lo obtenemos de SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    final savedToken = token ?? prefs.getString('token');

    if (savedToken == null || savedToken.isEmpty) {
      throw Exception('Token no encontrado');
    }

    final response = await http.get(
      Uri.parse('$baseUrl/resumen'),
      headers: {'Authorization': 'Bearer $savedToken'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);

      if (data['success']) {
        return data['resumen'];
      } else {
        throw Exception(
          data['message'] ?? 'Error al obtener resumen del administrador',
        );
      }
    } else {
      throw Exception('Error en el servidor (${response.statusCode})');
    }
  }
}

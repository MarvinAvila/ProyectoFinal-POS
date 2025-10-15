import 'dart:convert';
import 'package:http/http.dart' as http;

class GerenteService {
  // Ajusta a tu host/puerto
  static const String _baseUrl = 'http://192.168.1.67:3000/api';

  /// Login para rol GERENTE
  /// Devuelve: { success: bool, token: String?, message: String?, user: Map? }
  static Future<Map<String, dynamic>> login(
    String correo,
    String contrasena,
  ) async {
    final uri = Uri.parse('$_baseUrl/auth/login');

    try {
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'correo': correo, 'contrasena': contrasena}),
      );

      if (res.statusCode != 200) {
        return {
          'success': false,
          'message': 'Error de autenticación (${res.statusCode})',
        };
      }

      final body = jsonDecode(res.body);
      final success = body['success'] == true;
      final token = body['token'];
      final user = body['user']; // si tu backend lo envía

      if (!success) {
        return {
          'success': false,
          'message': body['message'] ?? 'Credenciales inválidas',
        };
      }

      // (Opcional pero recomendado) Verificar rol devuelto por el backend
      final rol =
          (user is Map && user['rol'] != null) ? user['rol'].toString() : null;
      if (rol != null && rol.toLowerCase() != 'gerente') {
        return {
          'success': false,
          'message': 'Este usuario no tiene rol de gerente',
        };
      }

      return {
        'success': true,
        'token': token,
        'message': body['message'] ?? 'Login exitoso',
        'user': user,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'No se pudo conectar al servidor: $e',
      };
    }
  }

  /// (Opcional) Ejemplo de petición autenticada para el dashboard del gerente
  static Future<Map<String, dynamic>> fetchDashboard(String token) async {
    final uri = Uri.parse('$_baseUrl/dashboard/gerente');
    final res = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (res.statusCode != 200) {
      throw Exception('Error obteniendo dashboard del gerente');
    }
    final body = jsonDecode(res.body);
    return body['data'] as Map<String, dynamic>;
  }
}

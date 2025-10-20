import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:frontend_pos/core/http.dart'; // ✅ Importa tu ApiClient

class AuthService {
  static const String baseUrl = 'http://192.168.1.69:3000/api/auth';

  static String? _token;

  static String? get token => _token;

  Future<Map<String, dynamic>> login(String correo, String contrasena) async {
    final url = Uri.parse('$baseUrl/login');

    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'correo': correo, 'contrasena': contrasena}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      if (data['token'] != null) {
        _token = data['token'];
        print('🔐 Token guardado correctamente');

        // 🔹 Guardar también en ApiClient para que el interceptor lo use
        await ApiClient.setToken(_token);
        print('✅ Token guardado en ApiClient');
      } else {
        print('⚠️ No se recibió token en la respuesta');
      }

      return data;
    } else {
      throw Exception('Error de autenticación');
    }
  }
}

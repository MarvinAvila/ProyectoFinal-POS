import 'dart:convert';
import 'package:http/http.dart' as http;

class AuthService {
  static const String baseUrl = 'http://192.168.1.69:3000/api/auth';

  // 🔹 Aquí guardaremos el token después del login
  static String? _token;

  // Getter del token para usarlo en otros servicios
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

      // ✅ Guardamos el token si existe
      if (data['token'] != null) {
        _token = data['token'];
        print('🔐 Token guardado correctamente');
      } else {
        print('⚠️ No se recibió token en la respuesta');
      }

      return data;
    } else {
      throw Exception('Error de autenticación');
    }
  }
}

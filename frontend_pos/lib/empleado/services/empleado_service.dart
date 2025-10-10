import 'dart:convert';
import 'package:http/http.dart' as http;

class EmpleadoService {
  static const baseUrl = 'http://localhost:3000/api/empleado';

  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/login'),
      body: {'email': email, 'password': password},
    );
    return json.decode(response.body);
  }

  static Future<Map<String, dynamic>> fetchSummary(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/resumen'),
      headers: {'Authorization': 'Bearer $token'},
    );

    final data = json.decode(response.body);
    if (data['success']) return data['resumen'];
    throw Exception('Error al obtener resumen del empleado');
  }
}

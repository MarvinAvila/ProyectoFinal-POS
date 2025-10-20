import 'dart:convert';
import 'package:http/http.dart' as http;

class VentasService {
  final String baseUrl; // ej: http://192.168.1.67:3000/api
  final String token;

  VentasService({required this.baseUrl, required this.token});

  Future<Map<String, dynamic>> estadisticas({
    String? desde,
    String? hasta,
  }) async {
    final qs = <String, String>{};
    if (desde != null) qs['fecha_inicio'] = desde;
    if (hasta != null) qs['fecha_fin'] = hasta;

    final uri = Uri.parse(
      '$baseUrl/ventas/estadisticas',
    ).replace(queryParameters: qs.isEmpty ? null : qs);
    final res = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
    if (res.statusCode != 200) {
      throw Exception('Error obteniendo estadísticas');
    }
    return jsonDecode(res.body)['data'];
  }

  Future<List<dynamic>> listar({int page = 1, int limit = 50}) async {
    final uri = Uri.parse('$baseUrl/ventas?page=$page&limit=$limit');
    final res = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
    if (res.statusCode != 200) throw Exception('Error listando ventas');
    return (jsonDecode(res.body)['data']['ventas'] as List);
  }
}

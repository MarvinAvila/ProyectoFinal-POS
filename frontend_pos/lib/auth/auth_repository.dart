import 'package:frontend_pos/core/http.dart';
import 'auth_service.dart';

class AuthRepository {
  final ApiClient _api = ApiClient();

  /// 🔹 Inicia sesión (login)
  Future<Map<String, dynamic>> login(String correo, String contrasena) async {
    final response = await _api.post(
      '/auth/login',
      data: {'correo': correo, 'contrasena': contrasena},
    );

    if (response == null || response is! Map) {
      throw Exception('Error: respuesta inválida del servidor.');
    }

    final data = Map<String, dynamic>.from(response);
    if (data.containsKey('token')) {
      await ApiClient.setToken(data['token']);
    }

    return data;
  }

  /// 🔹 Registro de nuevos usuarios
  Future<Map<String, dynamic>> register({
    required String nombre,
    required String correo,
    required String contrasena,
    required String rol,
  }) async {
    final response = await _api.post(
      '/auth/register',
      data: {
        'nombre': nombre,
        'correo': correo,
        'contrasena': contrasena,
        'rol': rol,
      },
    );

    if (response == null || response is! Map) {
      throw Exception('Error: respuesta inválida del servidor.');
    }

    final data = Map<String, dynamic>.from(response);
    if (data.containsKey('token')) {
      await ApiClient.setToken(data['token']);
    }

    return data;
  }

  /// 🔹 Cierra sesión limpiando el token guardado
  Future<void> logout() async {
    await ApiClient.setToken(null);
  }

  /// 🔹 Verifica si el usuario tiene sesión activa
  Future<bool> isAuthenticated() async {
    final token = AuthService.token;
    return token != null && token.isNotEmpty;
  }

  /// 🔹 Obtiene el perfil del usuario autenticado
  Future<Map<String, dynamic>> fetchPerfil() async {
    final response = await _api.get(
      '/auth/perfil',
      headers: {'Authorization': 'Bearer ${AuthService.token}'},
    );

    if (response == null || response is! Map) {
      throw Exception('Error: respuesta inválida al obtener perfil.');
    }

    return Map<String, dynamic>.from(response);
  }
}

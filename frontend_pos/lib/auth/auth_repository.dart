import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';

class AuthRepository {
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> login(String correo, String contrasena) async {
    print('🔐 [AuthRepository] Iniciando login para: $correo');
    
    try {
      final response = await _api.post(
        Endpoints.authLogin,
        data: {'correo': correo, 'contrasena': contrasena},
      );

      print('📥 [AuthRepository] Respuesta recibida: $response');
      print('📥 [AuthRepository] Tipo de respuesta: ${response.runtimeType}');

      final data = asMap(response);
      print('📊 [AuthRepository] Data convertida: $data');
      print('📊 [AuthRepository] Keys del data: ${data.keys.toList()}');

      if (data.containsKey('token')) {
        print('✅ [AuthRepository] Token encontrado, guardando...');
        await ApiClient.setToken(data['token']);
        print('✅ [AuthRepository] Token guardado exitosamente');
      } else {
        print('❌ [AuthRepository] No se encontró token en la respuesta');
        print('❌ [AuthRepository] Contenido completo: $data');
      }
      
      return data;
    } catch (e) {
      print('💥 [AuthRepository] Error durante login: $e');
      rethrow;
    }
  }

  // ... el resto de los métodos permanece igual
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

    final data = asMap(response);
    if (data.containsKey('token')) {
      await ApiClient.setToken(data['token']);
    }
    
    return data;
  }

  Future<void> logout() async {
    await ApiClient.setToken(null);
  }

  Future<bool> isAuthenticated() async {
    final token = await ApiClient.getToken();
    return token != null && token.isNotEmpty;
  }

  Future<Map<String, dynamic>> fetchPerfil() async {
    final response = await _api.get(Endpoints.authMe);
    return asMap(response);
  }
}
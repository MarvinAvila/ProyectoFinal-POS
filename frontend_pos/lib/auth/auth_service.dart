import 'package:frontend_pos/core/http.dart';
import 'auth_repository.dart';

/// Servicio centralizado para la autenticación.
/// Utiliza ApiClient para comunicarse con el backend.
class AuthService {
  final _repo = AuthRepository();

  Future<Map<String, dynamic>> login(String correo, String contrasena) async {
    try {
      // ✅ Delega la lógica de login al repositorio.
      // El repositorio ya se encarga de llamar a la API y guardar el token.
      return await _repo.login(correo, contrasena);
    } on ApiError {
      rethrow; // Lanza el error de API para que la UI pueda mostrarlo.
    } catch (e) {
      throw Exception('Error inesperado durante el login: $e');
    }
  }
}

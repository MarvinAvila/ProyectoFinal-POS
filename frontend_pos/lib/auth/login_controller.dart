import 'package:flutter/material.dart';
import 'auth_service.dart';

class LoginController with ChangeNotifier {
  final AuthService _authService = AuthService();
  String? errorMessage;
  bool isLoading = false;

  Future<void> login(
    String correo,
    String contrasena,
    BuildContext context,
  ) async {
    isLoading = true;
    notifyListeners();

    try {
      final data = await _authService.login(correo, contrasena);
      final rol = data['usuario']['rol'];

      // Redirigir según el rol
      switch (rol) {
        case 'admin':
          Navigator.pushReplacementNamed(context, '/admin');
          break;
        case 'gerente':
          Navigator.pushReplacementNamed(context, '/gerente');
          break;
        case 'dueno':
          Navigator.pushReplacementNamed(context, '/dueno');
          break;
        case 'cajero':
          Navigator.pushReplacementNamed(context, '/cajero');
          break;
        default:
          throw Exception('Rol desconocido');
      }
    } catch (e) {
      errorMessage = 'Credenciales incorrectas';
      notifyListeners();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}

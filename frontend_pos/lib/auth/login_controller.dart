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
    print('🎯 [LoginController] Iniciando login...');
    isLoading = true;
    notifyListeners();

    try {
      final data = await _authService.login(correo, contrasena);
      print('📦 [LoginController] Data recibida: $data');
      print('📦 [LoginController] Keys: ${data.keys.toList()}');
      
      final usuario = data['usuario'];
      final rol = usuario['rol'];
      
      print('🎭 [LoginController] Rol detectado: $rol');
      print('🎭 [LoginController] Usuario completo: $usuario');

      // ✅ CORREGIDO: Usar las rutas exactas de tu main.dart
      switch (rol) {
        case 'admin':
          print('➡️ [LoginController] Navegando a /admin/dashboard');
          Navigator.pushReplacementNamed(context, '/admin/dashboard');
          break;
        case 'gerente':
          print('➡️ [LoginController] Navegando a /gerente/dashboard');
          Navigator.pushReplacementNamed(context, '/gerente/dashboard');
          break;
        case 'dueno':
          print('➡️ [LoginController] Navegando a /dueno/dashboard');
          Navigator.pushReplacementNamed(context, '/dueno/dashboard');
          break;
        case 'cajero':
          print('➡️ [LoginController] Navegando a /cajero/dashboard');
          Navigator.pushReplacementNamed(context, '/cajero/dashboard');
          break;
        default:
          print('❌ [LoginController] Rol desconocido: $rol');
          throw Exception('Rol desconocido: $rol');
      }
      
      print('✅ [LoginController] Navegación completada exitosamente');
    } catch (e) {
      print('❌ [LoginController] Error: $e');
      print('❌ [LoginController] Stack trace: ${e.toString()}');
      errorMessage = 'Error al conectar con el servidor: $e';
      notifyListeners();
    } finally {
      isLoading = false;
      notifyListeners();
      print('🏁 [LoginController] Proceso de login finalizado');
    }
  }
}
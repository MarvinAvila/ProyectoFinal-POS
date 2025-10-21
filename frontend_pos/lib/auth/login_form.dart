import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:frontend_pos/auth/auth_service.dart'; // ✅ Usar el servicio de autenticación central
import 'package:frontend_pos/core/http.dart'; // ✅ Importar para ApiError

class LoginForm extends StatefulWidget {
  final String rol; // 'admin', 'gerente', 'empleado'
  final void Function(String token) onLoginSuccess; // ✅ ahora recibe el token

  const LoginForm({
    super.key,
    required this.rol,
    required this.onLoginSuccess, // callback que recibe el token limpio
  });

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _correoController = TextEditingController();
  final _contrasenaController = TextEditingController();
  final _authService = AuthService(); // ✅ Instancia del servicio central
  final _storage = const FlutterSecureStorage();

  String errorMessage = '';
  bool _loading = false;

Future<void> _login() async {
  if (_formKey.currentState!.validate()) {
    setState(() {
      _loading = true;
      errorMessage = '';
    });

    final email = _correoController.text.trim();
    final password = _contrasenaController.text.trim();

    print('🔄 [LoginForm] Iniciando login con: $email');
    
    try {
      final result = await _authService.login(email, password);
      print('✅ [LoginForm] Login exitoso, resultado: $result');
      print('✅ [LoginForm] Tipo del resultado: ${result.runtimeType}');
      print('✅ [LoginForm] Keys del resultado: ${result.keys.toList()}');

      // ✅ CORREGIDO: Acceder a la estructura correcta
      final token = result['token'];
      final usuario = result['usuario'];
      
      print('🔑 [LoginForm] Token: $token');
      print('👤 [LoginForm] Usuario: $usuario');
      print('👤 [LoginForm] Tipo de usuario: ${usuario.runtimeType}');

      final rolRecibido = usuario?['rol'] ?? '';
      print('🎭 [LoginForm] Rol recibido: "$rolRecibido"');
      print('🎭 [LoginForm] Rol esperado: "${widget.rol}"');

      // Validar que el rol del token coincide con el esperado
      if (rolRecibido.toLowerCase() != widget.rol.toLowerCase()) {
        print('❌ [LoginForm] ERROR: Rol no coincide');
        print('❌ [LoginForm] Esperado: ${widget.rol}, Recibido: $rolRecibido');
        setState(() {
          errorMessage = 'Credenciales correctas, pero no para el rol de ${widget.rol}.';
        });
        await ApiClient.setToken(null);
        return;
      }

      print('✅ [LoginForm] Rol validado correctamente');
      await _storage.write(key: 'rol', value: widget.rol);
      print('✅ [LoginForm] Token y rol guardados, ejecutando callback...');
      widget.onLoginSuccess(token ?? '');
      print('✅ [LoginForm] Callback ejecutado exitosamente');
      
    } on ApiError catch (e) {
      print('❌ [LoginForm] ApiError: $e');
      setState(() {
        errorMessage = e.message;
      });
    } catch (e) {
      print('❌ [LoginForm] Error general: $e');
      print('❌ [LoginForm] Stack trace: ${e.toString()}');
      setState(() {
        errorMessage = 'Error inesperado durante el login: $e';
      });
    } finally {
      setState(() => _loading = false);
      print('🏁 [LoginForm] Proceso finalizado');
    }
  }
}

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _correoController,
            decoration: const InputDecoration(labelText: 'Correo'),
            keyboardType: TextInputType.emailAddress,
            validator:
                (value) =>
                    (value == null || value.isEmpty)
                        ? 'Ingrese su correo'
                        : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _contrasenaController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Contraseña'),
            validator:
                (value) =>
                    (value == null || value.isEmpty)
                        ? 'Ingrese su contraseña'
                        : null,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loading ? null : _login,
            child: _loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text('Iniciar sesión como ${widget.rol}'),
          ),
          if (errorMessage.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                errorMessage,
                style: const TextStyle(color: Colors.red),
              ),
            ),
        ],
      ),
    );
  }
}

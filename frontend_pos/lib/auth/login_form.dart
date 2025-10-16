import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:frontend_pos/admin/services/admin_service.dart';
import 'package:frontend_pos/gerente/dashboard/gerente_service.dart';
import 'package:frontend_pos/empleado/services/empleado_service.dart';

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
  final storage = const FlutterSecureStorage();

  String errorMessage = '';

  /// 🔐 Lógica de login basada en el rol
  Future<Map<String, dynamic>> loginPorRol(
    String email,
    String password,
  ) async {
    switch (widget.rol.toLowerCase()) {
      case 'admin':
        return await AdminService.login(email, password);
      case 'gerente':
        return await GerenteService.login(email, password);
      case 'cajero':
        return await EmpleadoService.login(email, password);
      default:
        return {'success': false, 'message': 'Rol desconocido: ${widget.rol}'};
    }
  }

  Future<void> _login() async {
    if (_formKey.currentState!.validate()) {
      final email = _correoController.text.trim();
      final password = _contrasenaController.text.trim();

      Map<String, dynamic> result = {};

      switch (widget.rol.toLowerCase()) {
        case 'admin':
          result = await AdminService.login(email, password);
          break;
        case 'gerente':
          result = await GerenteService.login(email, password);
          break;
        case 'cajero':
          result = await EmpleadoService.login(email, password);
          break;
        default:
          setState(() {
            errorMessage = 'Rol desconocido';
          });
          return;
      }

      if (result['success']) {
        final token = result['token'];
        await storage.write(key: 'token', value: token);
        await storage.write(key: 'rol', value: widget.rol);

        // ✅ Ahora notificamos al AdminLoginScreen (o cualquier rol) que el login fue exitoso
        widget.onLoginSuccess(token);
      } else {
        setState(() {
          errorMessage = result['message'] ?? 'Error al iniciar sesión';
        });
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
            onPressed: _login,
            child: Text('Iniciar sesión como ${widget.rol}'),
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

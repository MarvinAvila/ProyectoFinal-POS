import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'auth_service.dart';

class LoginScreen extends StatefulWidget {
  final String role;

  const LoginScreen({super.key, required this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController correoController = TextEditingController();
  final TextEditingController contrasenaController = TextEditingController();
  final AuthService authService = AuthService();

  bool cargando = false;
  String? error;

  void iniciarSesion() async {
    setState(() {
      cargando = true;
      error = null;
    });

    try {
      final resultado = await authService.login(
        correoController.text.trim(),
        contrasenaController.text.trim(),
      );

      if (resultado['success'] == true) {
        final data = resultado['data'];
        final usuario = data['usuario'];
        final token = data['token'];

        if (usuario['rol'] == widget.role) {
          final storage = const FlutterSecureStorage();
          await storage.write(key: 'token', value: token);
          await storage.write(key: 'rol', value: usuario['rol']);

          print('✅ Login exitoso de ${usuario['nombre']} (${usuario['rol']})');
          Navigator.pushReplacementNamed(context, '/${widget.role}/dashboard');
        } else {
          setState(() {
            error =
                'Rol incorrecto: este usuario no pertenece a ${widget.role.toUpperCase()}';
          });
        }
      } else {
        setState(() {
          error = resultado['message'] ?? 'Credenciales inválidas';
        });
      }
    } catch (e) {
      setState(() {
        error = 'Error al conectar con el servidor: ${e.toString()}';
      });
    } finally {
      setState(() {
        cargando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login - ${widget.role.toUpperCase()}')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: correoController,
              decoration: const InputDecoration(labelText: 'Correo'),
            ),
            TextField(
              controller: contrasenaController,
              decoration: const InputDecoration(labelText: 'Contraseña'),
              obscureText: true,
            ),
            const SizedBox(height: 20),
            if (error != null)
              Text(error!, style: const TextStyle(color: Colors.red)),
            ElevatedButton(
              onPressed: cargando ? null : iniciarSesion,
              child:
                  cargando
                      ? const CircularProgressIndicator()
                      : const Text('Iniciar sesión'),
            ),
          ],
        ),
      ),
    );
  }
}

// lib/auth/login_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'auth_controller.dart';
import 'auth_repository.dart';

class LoginScreen extends StatefulWidget {
  /// Si quieres que, al loguear, navegue a otra ruta:
  final String? navigateToOnSuccess; // p.ej. '/'

  const LoginScreen({super.key, this.navigateToOnSuccess});

  /// Helper para inyectar repo+controller localmente
  static Widget withProvider({String? navigateToOnSuccess}) {
    return FutureBuilder<AuthRepository>(
      future: AuthRepository.create(),
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return ChangeNotifierProvider(
          create:
              (_) => AuthController(repo: snap.data!)..init(loadProfile: false),
          child: LoginScreen(navigateToOnSuccess: navigateToOnSuccess),
        );
      },
    );
  }

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _doLogin() async {
    if (!_form.currentState!.validate()) return;
    final ctrl = context.read<AuthController>();
    final ok = await ctrl.login(_emailCtrl.text.trim(), _passCtrl.text);
    if (ok) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sesión iniciada')));
      if (widget.navigateToOnSuccess != null) {
        Navigator.of(context).pushReplacementNamed(widget.navigateToOnSuccess!);
      } else {
        Navigator.of(context).maybePop();
      }
    } else {
      if (!mounted) return;
      final msg = ctrl.error ?? 'No se pudo iniciar sesión';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AuthController>().loading;

    return Scaffold(
      appBar: AppBar(title: const Text('Iniciar sesión')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Correo',
                      hintText: 'tucorreo@dominio.com',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Ingresa tu correo';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passCtrl,
                    obscureText: _obscure,
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                    onFieldSubmitted: (_) => _doLogin(),
                    validator:
                        (v) =>
                            (v == null || v.isEmpty)
                                ? 'Ingresa tu contraseña'
                                : null,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: loading ? null : _doLogin,
                      child:
                          loading
                              ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                              : const Text('Entrar'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

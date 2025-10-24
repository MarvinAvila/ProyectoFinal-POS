import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_fonts/google_fonts.dart'; // Importar google_fonts
import 'auth_service.dart';

class LoginScreen extends StatefulWidget {
  final String role;
  const LoginScreen({super.key, required this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final TextEditingController correoController = TextEditingController();
  final TextEditingController contrasenaController = TextEditingController();
  final AuthService authService = AuthService();

  bool cargando = false;
  String? error;

  late final AnimationController _fadeIn;
  late final AnimationController _shakeCtrl; // para error
  late final Animation<double> _fadeAnim;
  late final Animation<double> _shakeAnim;

  @override
  void initState() {
    super.initState();
    _fadeIn = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeIn, curve: Curves.easeOutCubic);

    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 480),
    );
    _shakeAnim = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0, end: 14), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 14, end: -14), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -14, end: 8), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 8, end: 0), weight: 1),
    ]).animate(CurvedAnimation(parent: _shakeCtrl, curve: Curves.easeOutCubic));
  }

  @override
  void dispose() {
    _fadeIn.dispose();
    _shakeCtrl.dispose();
    correoController.dispose();
    contrasenaController.dispose();
    super.dispose();
  }

 Future<void> iniciarSesion() async {
  print('🔄 [LoginScreen] Iniciando sesión...');
  
  // ✅ Solo un setState al inicio
  setState(() {
    cargando = true;
    error = null;
  });

  try {
    final resultado = await authService.login(
      correoController.text.trim(),
      contrasenaController.text.trim(),
    );

    print('✅ [LoginScreen] Respuesta recibida: $resultado');
    print('✅ [LoginScreen] Keys: ${resultado.keys.toList()}');

    final usuario = resultado['usuario'];
    final token = resultado['token'];

    print('👤 [LoginScreen] Usuario: $usuario');
    print('🔑 [LoginScreen] Token: $token');
    print('🎭 [LoginScreen] Rol del usuario: ${usuario['rol']}');
    print('🎭 [LoginScreen] Rol esperado: ${widget.role}');

    if (usuario['rol'] == widget.role) {
      print('✅ [LoginScreen] Rol coincide, guardando datos...');
      const storage = FlutterSecureStorage();
      await storage.write(key: 'token', value: token);
      await storage.write(key: 'rol', value: usuario['rol']);
      
      print('➡️ [LoginScreen] Navegando a /${widget.role}/dashboard');
      
      // ✅ Navegación SEGURA - sin setState
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/${widget.role}/dashboard');
        print('✅ [LoginScreen] Navegación completada');
      }
    } else {
      print('❌ [LoginScreen] ERROR: Rol no coincide');
      print('❌ [LoginScreen] Esperado: ${widget.role}, Recibido: ${usuario['rol']}');
      
      // ✅ Solo un setState para el error
      if (mounted) {
        setState(() {
          error = 'Rol incorrecto: este usuario no pertenece a ${widget.role.toUpperCase()}';
          cargando = false;
        });
        _shakeCtrl.forward(from: 0);
      }
    }
  } catch (e) {
    print('❌ [LoginScreen] ERROR: $e');
    
    // ✅ Manejo seguro de errores
    if (mounted) {
      setState(() {
        error = 'Error al conectar con el servidor: ${e.toString()}';
        cargando = false;
      });
      _shakeCtrl.forward(from: 0);
    }
  }
  
  // ❌ ELIMINADO el finally con setState - ya se maneja en cada caso
  print('🏁 [LoginScreen] Proceso finalizado');
}

  @override
  Widget build(BuildContext context) {
    final roleUpper = widget.role.toUpperCase();
    final isMobile = MediaQuery.of(context).size.width < 700;
    final maxWidth = isMobile ? 520.0 : 640.0;

    return Scaffold(
      // Fondo con gradiente suave + brillos (se ve bien con tu paleta)
      body: Stack(
        fit: StackFit.expand,
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF0F164A), Color(0xFF1B255C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          Positioned(
            top: -60,
            left: -40,
            child: _Glow(
              size: 220,
              color: Colors.purpleAccent.withOpacity(0.20),
            ),
          ),
          Positioned(
            bottom: -80,
            right: -30,
            child: _Glow(
              size: 260,
              color: Colors.orangeAccent.withOpacity(0.18),
            ),
          ),
          // Contenido
          SafeArea(
            child: Center(
              child: FadeTransition(
                opacity: _fadeAnim,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 24,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxWidth),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(26, 24, 26, 28),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.12),
                            ),
                            borderRadius: BorderRadius.circular(28),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.35),
                                blurRadius: 24,
                                offset: const Offset(0, 12),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Header
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(
                                      Icons.arrow_back_rounded,
                                      color: Colors.white70,
                                    ),
                                    onPressed: () => Navigator.pop(context),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.center,
                                      children: [
                                        const SizedBox(height: 4),
                                        Text(
                                          'Bienvenido',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(
                                              0.95,
                                            ),
                                            fontSize: 24,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.2,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        _RoleChip(text: 'Login · $roleUpper'),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(
                                    width: 48,
                                  ), // balancear el IconButton
                                ],
                              ),
                              const SizedBox(height: 18),
                              // Form
                              AnimatedBuilder(
                                animation: _shakeAnim,
                                builder: (context, child) {
                                  return Transform.translate(
                                    offset: Offset(_shakeAnim.value, 0),
                                    child: child,
                                  );
                                },
                                child: Column(
                                  children: [
                                    _Input(
                                      controller: correoController,
                                      label: 'Correo',
                                      hint: 'usuario@correo.com',
                                      icon: Icons.mail_outline_rounded,
                                      keyboardType: TextInputType.emailAddress,
                                    ),
                                    const SizedBox(height: 16),
                                    _Input(
                                      controller: contrasenaController,
                                      label: 'Contraseña',
                                      hint: '••••••••',
                                      icon: Icons.lock_outline_rounded,
                                      obscure: true,
                                    ),
                                    const SizedBox(height: 8),
                                    const SizedBox(height: 14),

                                    // Error
                                    AnimatedSwitcher(
                                      duration: const Duration(
                                        milliseconds: 250,
                                      ),
                                      child:
                                          (error == null)
                                              ? const SizedBox.shrink()
                                              : Padding(
                                                key: const ValueKey('error'),
                                                padding: const EdgeInsets.only(
                                                  bottom: 8,
                                                ),
                                                child: Row(
                                                  children: [
                                                    const Icon(
                                                      Icons
                                                          .error_outline_rounded,
                                                      color: Colors.redAccent,
                                                      size: 18,
                                                    ),
                                                    const SizedBox(width: 8),
                                                    Expanded(
                                                      child: Text(
                                                        error!,
                                                        style: const TextStyle(
                                                          color:
                                                              Colors.redAccent,
                                                          fontWeight:
                                                              FontWeight.w600,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                    ),
                                    const SizedBox(height: 6),
                                    // Botón
                                    _PrimaryButton(
                                      text: 'Iniciar sesión',
                                      loading: cargando,
                                      onTap: cargando ? null : iniciarSesion,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 8),
                              Opacity(
                                opacity: 0.8,
                                child: const Text(
                                  'Por seguridad, no compartas tus credenciales.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.white70,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// ---------- Widgets de estilo (solo UI) ----------

class _Glow extends StatelessWidget {
  final double size;
  final Color color;
  const _Glow({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color,
            blurRadius: size * 0.65,
            spreadRadius: size * 0.15,
          ),
        ],
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  final String text;
  const _RoleChip({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE1BEE7), Color(0xFFFFE0B2)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.25),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Text(
        text,
        style: GoogleFonts.notoSans( // ✅ Usar Noto Sans para mejor soporte de caracteres
          color: Color(0xFF3E2C74),
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
        ), // ✅ Fin de GoogleFonts.notoSans
      ),
    );
  }
}

class _Input extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final bool obscure;
  final TextInputType? keyboardType;

  const _Input({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.keyboardType,
  });

  @override
  State<_Input> createState() => _InputState();
}

class _InputState extends State<_Input> {
  bool _obscure = false;
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _obscure = widget.obscure;
  }

  @override
  Widget build(BuildContext context) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: Colors.white.withOpacity(0.18)),
    );
    final focusBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: Color(0xFFE1BEE7), width: 1.4),
    );

    return FocusScope(
      onFocusChange: (f) => setState(() => _focused = f),
      child: TextField(
        controller: widget.controller,
        obscureText: _obscure,
        keyboardType: widget.keyboardType,
        style: const TextStyle(color: Colors.white),
        cursorColor: const Color(0xFFE1BEE7),
        decoration: InputDecoration(
          labelText: widget.label,
          hintText: widget.hint,
          prefixIcon: Icon(
            widget.icon,
            color: _focused ? const Color(0xFFE1BEE7) : Colors.white70,
          ),
          suffixIcon:
              widget.obscure
                  ? IconButton(
                    onPressed: () => setState(() => _obscure = !_obscure),
                    icon: Icon(
                      _obscure
                          ? Icons.visibility_rounded
                          : Icons.visibility_off_rounded,
                      color:
                          _focused ? const Color(0xFFE1BEE7) : Colors.white60,
                    ),
                  )
                  : null,
          labelStyle: const TextStyle(color: Colors.white70),
          hintStyle: const TextStyle(color: Colors.white38),
          filled: true,
          fillColor: Colors.white.withOpacity(0.06),
          enabledBorder: border,
          focusedBorder: focusBorder,
          errorBorder: border,
          focusedErrorBorder: focusBorder,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 18,
          ),
        ),
      ),
    );
  }
}

class _PrimaryButton extends StatefulWidget {
  final String text;
  final VoidCallback? onTap;
  final bool loading;
  const _PrimaryButton({
    required this.text,
    required this.onTap,
    required this.loading,
  });

  @override
  State<_PrimaryButton> createState() => _PrimaryButtonState();
}

class _PrimaryButtonState extends State<_PrimaryButton> {
  bool _hover = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    const fg = Color(0xFF3E2C74);

    return MouseRegion(
      cursor:
          widget.onTap == null
              ? SystemMouseCursors.basic
              : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapCancel: () => setState(() => _pressed = false),
        onTapUp: (_) => setState(() => _pressed = false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _pressed ? 0.98 : (_hover ? 1.02 : 1.0),
          duration: const Duration(milliseconds: 140),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            padding: const EdgeInsets.symmetric(vertical: 16),
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFFE0B2), Color(0xFFE1BEE7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: Colors.white.withOpacity(_hover ? 0.28 : 0.16),
                width: _hover ? 1.4 : 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.deepPurple.withOpacity(_hover ? 0.25 : 0.12),
                  blurRadius: _hover ? 18 : 12,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Center(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child:
                    widget.loading
                        ? const SizedBox(
                          key: ValueKey('loader'),
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(fg),
                          ),
                        )
                        : Row(
                          key: const ValueKey('text'),
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.login_rounded, size: 18, color: fg),
                            SizedBox(width: 8),
                            Text(
                              'Iniciar sesión',
                              style: TextStyle(
                                color: fg,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

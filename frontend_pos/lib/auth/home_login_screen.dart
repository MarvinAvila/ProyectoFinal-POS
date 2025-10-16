import 'package:flutter/material.dart';
import 'package:frontend_pos/auth/login_screen.dart';

class HomeLoginScreen extends StatefulWidget {
  const HomeLoginScreen({super.key});

  @override
  State<HomeLoginScreen> createState() => _HomeLoginScreenState();
}

class _HomeLoginScreenState extends State<HomeLoginScreen>
    with SingleTickerProviderStateMixin {
  double opacity = 0.0;
  late final AnimationController _controller;
  late final Animation<double> _titleSlide;
  int? _hovered; // índice del botón en hover (web/desktop)

  @override
  void initState() {
    super.initState();
    // Animación sutil de entrada
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..forward();

    _titleSlide = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );

    Future.delayed(const Duration(milliseconds: 200), () {
      setState(() => opacity = 1.0);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;
    final maxWidth = isMobile ? double.infinity : 520.0;

    return Scaffold(
      backgroundColor: const Color.fromARGB(
        255,
        15,
        22,
        74,
      ), // tu fondo original
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Luces suaves en el fondo (no reemplaza tu color, solo le da profundidad)
          Positioned(
            top: -80,
            left: -40,
            child: _GlowCircle(
              size: 200,
              color: Colors.purple.withOpacity(0.25),
            ),
          ),
          Positioned(
            bottom: -60,
            right: -20,
            child: _GlowCircle(
              size: 220,
              color: Colors.orangeAccent.withOpacity(0.18),
            ),
          ),
          // Contenido
          Center(
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 800),
              opacity: opacity,
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 48,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: maxWidth),
                  child: _GlassCard(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Título con gradiente y “breathing”
                        AnimatedBuilder(
                          animation: _titleSlide,
                          builder: (_, __) {
                            final slide = (1 - _titleSlide.value) * 12;
                            return Transform.translate(
                              offset: Offset(0, slide),
                              child: _GradientTitle(text: 'Selecciona tu rol'),
                            );
                          },
                        ),
                        const SizedBox(height: 8),
                        Opacity(
                          opacity: 0.85,
                          child: Text(
                            'Elige cómo quieres ingresar',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 14,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 28),
                        _RoleButton(
                          index: 0,
                          hoveredIndex: _hovered,
                          onHover:
                              (h) => setState(() => _hovered = h ? 0 : null),
                          icon: Icons.admin_panel_settings_rounded,
                          label: 'Administrador',
                          onTap: () => _goToRole(context, 'admin'),
                          gradient: const [
                            Color(0xFFFFE0B2),
                            Color(0xFFD1C4E9),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _RoleButton(
                          index: 1,
                          hoveredIndex: _hovered,
                          onHover:
                              (h) => setState(() => _hovered = h ? 1 : null),
                          icon: Icons.business_center_rounded,
                          label: 'Gerente',
                          onTap: () => _goToRole(context, 'gerente'),
                          gradient: const [
                            Color(0xFFB3E5FC),
                            Color(0xFFD1C4E9),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _RoleButton(
                          index: 2,
                          hoveredIndex: _hovered,
                          onHover:
                              (h) => setState(() => _hovered = h ? 2 : null),
                          icon: Icons.emoji_events_rounded,
                          label: 'Dueño',
                          onTap: () => _goToRole(context, 'dueno'),
                          gradient: const [
                            Color(0xFFFFF59D),
                            Color(0xFFFFCC80),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _RoleButton(
                          index: 3,
                          hoveredIndex: _hovered,
                          onHover:
                              (h) => setState(() => _hovered = h ? 3 : null),
                          icon: Icons.person,
                          label: 'Cajero',
                          onTap: () => _goToRole(context, 'cajero'),
                          gradient: const [
                            Color(0xFFC8E6C9),
                            Color(0xFFD1C4E9),
                          ],
                        ),
                      ],
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

  void _goToRole(BuildContext context, String role) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen(role: role.toLowerCase())),
    );
  }
}

/// ---------- Widgets de estilo/animación (solo UI) ----------

class _GlowCircle extends StatelessWidget {
  final double size;
  final Color color;
  const _GlowCircle({required this.size, required this.color});

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
            blurRadius: size * 0.6,
            spreadRadius: size * 0.12,
          ),
        ],
      ),
    );
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 700),
      curve: Curves.easeOutCubic,
      padding: const EdgeInsets.fromLTRB(22, 28, 22, 26),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.06),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _GradientTitle extends StatefulWidget {
  final String text;
  const _GradientTitle({required this.text});

  @override
  State<_GradientTitle> createState() => _GradientTitleState();
}

class _GradientTitleState extends State<_GradientTitle>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
      lowerBound: 0.0,
      upperBound: 1.0,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (_, __) {
        final scale = 1 + (_pulse.value * 0.01); // “breathing” muy sutil
        return Transform.scale(
          scale: scale,
          child: ShaderMask(
            shaderCallback:
                (bounds) => const LinearGradient(
                  colors: [Color(0xFFE1BEE7), Color(0xFFFFE0B2)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ).createShader(bounds),
            child: const Text(
              '',
              style:
                  TextStyle(), // placeholder, se reemplaza con RichText abajo
            ),
          ),
        );
      },
      child: RichText(
        textAlign: TextAlign.center,
        text: TextSpan(
          text: widget.text,
          style: const TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
            // El color real lo aporta el ShaderMask, así que aquí va blanco con opacidad para fallback
            color: Color.fromARGB(255, 217, 206, 234),
          ),
        ),
      ),
    );
  }
}

class _RoleButton extends StatefulWidget {
  final int index;
  final int? hoveredIndex;
  final void Function(bool) onHover;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final List<Color> gradient;

  const _RoleButton({
    required this.index,
    required this.hoveredIndex,
    required this.onHover,
    required this.icon,
    required this.label,
    required this.onTap,
    required this.gradient,
  });

  @override
  State<_RoleButton> createState() => _RoleButtonState();
}

class _RoleButtonState extends State<_RoleButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final isHovered = widget.hoveredIndex == widget.index;

    // Colores de texto/ícono sobre el gradiente
    const Color fg = Color(0xFF3E2C74);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => widget.onHover(true),
      onExit: (_) => widget.onHover(false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapCancel: () => setState(() => _pressed = false),
        onTapUp: (_) => setState(() => _pressed = false),
        onTap: widget.onTap,
        child: AnimatedScale(
          duration: const Duration(milliseconds: 160),
          scale: _pressed ? 0.98 : (isHovered ? 1.02 : 1.0),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 22),
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: widget.gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: Colors.white.withOpacity(isHovered ? 0.28 : 0.16),
                width: isHovered ? 1.4 : 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.deepPurple.withOpacity(isHovered ? 0.25 : 0.12),
                  blurRadius: isHovered ? 18 : 12,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  transitionBuilder:
                      (child, anim) =>
                          ScaleTransition(scale: anim, child: child),
                  child: Icon(
                    widget.icon,
                    key: ValueKey(isHovered),
                    size: 26,
                    color: fg,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  widget.label,
                  style: const TextStyle(
                    fontSize: 18,
                    color: fg,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                // Indicador sutil en hover
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 200),
                  opacity: isHovered ? 1 : 0,
                  child: const Padding(
                    padding: EdgeInsets.only(left: 10),
                    child: Icon(
                      Icons.arrow_forward_rounded,
                      size: 18,
                      color: fg,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

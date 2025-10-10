import 'package:flutter/material.dart';
import 'package:frontend_pos/auth/login_screen.dart';

class HomeLoginScreen extends StatefulWidget {
  const HomeLoginScreen({super.key});

  @override
  State<HomeLoginScreen> createState() => _HomeLoginScreenState();
}

class _HomeLoginScreenState extends State<HomeLoginScreen> {
  double opacity = 0.0;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 300), () {
      setState(() {
        opacity = 1.0;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;
    final maxWidth = isMobile ? double.infinity : 500.0;

    return Scaffold(
      backgroundColor: const Color(0xFFFFF7FB), // rosa pastel suave
      body: Center(
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 800),
          opacity: opacity,
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Selecciona tu Rol',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5D3A9B),
                    ),
                  ),
                  const SizedBox(height: 40),
                  _buildRoleButton(
                    context,
                    'Administrador',
                    'admin',
                    Icons.admin_panel_settings_rounded,
                  ),
                  const SizedBox(height: 20),
                  _buildRoleButton(
                    context,
                    'Gerente',
                    'gerente',
                    Icons.business_center_rounded,
                  ),
                  const SizedBox(height: 20),
                  _buildRoleButton(
                    context,
                    'Dueño',
                    'dueno',
                    Icons.emoji_events_rounded,
                  ),
                  const SizedBox(height: 20),
                  _buildRoleButton(context, 'Cajero', 'cajero', Icons.person),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleButton(
    BuildContext context,
    String text,
    String role,
    IconData icon,
  ) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => LoginScreen(role: role.toLowerCase()),
            ),
          );
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 24),
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFFE0B2), Color(0xFFD1C4E9)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: Colors.deepPurple.withOpacity(0.15),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 26, color: const Color(0xFF5D3A9B)),
              const SizedBox(width: 14),
              Text(
                text,
                style: const TextStyle(
                  fontSize: 18,
                  color: Color(0xFF5D3A9B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

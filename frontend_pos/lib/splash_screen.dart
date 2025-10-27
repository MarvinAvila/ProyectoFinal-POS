import 'package:flutter/material.dart';

class CustomSplashScreen extends StatelessWidget {
  const CustomSplashScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // ✅ Fondo que cubre TODA la pantalla sin recortes
          Container(
            width: double.infinity,
            height: double.infinity,
            child: Image.asset(
              'assets/iconos/background.png',
              fit: BoxFit.cover,  // ✅ Cubre toda el área sin distorsión
            ),
          ),
          
          // ✅ Logo centrado con tamaño controlado
          Center(
            child: Container(
              width: 200,  // ✅ Tamaño fijo para control
              height: 200,
              child: Image.asset(
                'assets/iconos/logo.png',
                fit: BoxFit.contain,  // ✅ Mantiene proporción sin recortes
              ),
            ),
          ),
        ],
      ),
    );
  }
}
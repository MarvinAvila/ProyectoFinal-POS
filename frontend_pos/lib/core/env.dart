// lib/core/env.dart

/// ==================================================
/// 🔹 CONFIGURACIÓN DE ENTORNO Y ENDPOINTS DE LA API
/// ==================================================
///
/// Por defecto, la app se conectará a la URL de producción en Render.
/// Para desarrollo local, ejecuta:
/// flutter run --dart-define=API_BASE=http://localhost:3000
class Env {
  static const String _kBase = String.fromEnvironment(
    'API_BASE',
    // ✅ Render es ahora la URL por defecto
    defaultValue: 'https://proyectofinal-pos.onrender.com',
  );

  /// Base de la API (sin /api al final)
  static String get apiBase => _kBase;

  /// Prefija todas las rutas con /api
  static String get apiRoot => '$apiBase/api';

  /// Helper para armar URLs: Env.url('/categorias') -> http://..../api/categorias
  static String url(String path) {
    if (path.startsWith('/')) return '$apiRoot$path';
    return '$apiRoot/$path';
  }
}

/// Rutas conocidas de tu backend
class Endpoints {
  // Auth
  static const authLogin = '/auth/login';
  static const authMe = '/auth/me';

  // Catálogos
  static const usuarios = '/usuarios';
  static const productos = '/productos';
  static const proveedores = '/proveedores';
  static const categorias = '/categorias';
  static const alertas = '/alertas';
  static const inventario = '/inventario';
  static const ofertas = '/ofertas';
  static const productoOferta = '/producto-oferta';

  // Ventas
  static const ventas = '/ventas';
  static const detalleVenta = '/detalle-venta';

  // Dashboard
  static const dashboard = '/dashboard';
  // (opcional si lo usas en código)
  static const dashboardResumen = '/dashboard/resumen';

  // Reportes (👇 estos dos arreglan tu error en reportes_screen.dart)
  static const reportes = '/reportes';
  static const reportesVentas = '/reportes/ventas';
  static const reportesTopProductos = '/reportes/top-productos';
}

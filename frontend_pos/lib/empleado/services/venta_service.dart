import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:frontend_pos/auth/auth_service.dart';
import 'package:frontend_pos/empleado/carrito/cart_controller.dart';

class VentaService {
  final String baseUrl =
      'http://192.168.1.69:3000/api'; // 🔹 Ajusta si tu IP cambia

  /// ✅ Registrar una nueva venta
  Future<void> registrarVenta(CartController cart, int idUsuario) async {
    final token = AuthService.token;

    if (token == null) {
      throw Exception('Token no disponible. Inicia sesión nuevamente.');
    }

    // 🔸 Detalle de productos
    final detalle =
        cart.items.values
            .map(
              (item) => {
                'id_producto': item.producto.idProducto,
                'cantidad': item.cantidad,
                'precio_unitario': item.producto.precioVenta,
                'subtotal': item.cantidad * item.producto.precioVenta,
              },
            )
            .toList();

    // 🔸 Estructura de la venta (debe coincidir con lo que espera tu backend)
    final venta = {
      'id_usuario': idUsuario,
      'forma_pago': 'efectivo',
      'subtotal': cart.total,
      'iva': cart.total * 0.16,
      'total': cart.total * 1.16,
      'detalle': detalle,
    };

    final uri = Uri.parse('$baseUrl/ventas');
    final res = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(venta),
    );

    if (res.statusCode != 201 && res.statusCode != 200) {
      final body = jsonDecode(res.body);
      final msg = body['message'] ?? 'Error desconocido';
      throw Exception('ApiError(status: ${res.statusCode}, message: $msg)');
    }
  }

  /// ✅ Listar las ventas del empleado actual
  Future<List<dynamic>> listarVentasEmpleado(int idUsuario) async {
    final token = AuthService.token;
    if (token == null) throw Exception('Token no disponible.');

    final uri = Uri.parse('$baseUrl/ventas/usuario/$idUsuario');
    final res = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (res.statusCode != 200) {
      throw Exception('Error al obtener ventas del usuario');
    }

    final data = jsonDecode(res.body);
    return data['data']['ventas'] ?? [];
  }

  /// ✅ Obtener detalles de una venta específica
  Future<Map<String, dynamic>> obtenerVentaPorId(int idVenta) async {
    final token = AuthService.token;
    if (token == null) throw Exception('Token no disponible.');

    final uri = Uri.parse('$baseUrl/ventas/$idVenta');
    final res = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (res.statusCode != 200) {
      throw Exception('Error al obtener los detalles de la venta');
    }

    return jsonDecode(res.body)['data'];
  }
}

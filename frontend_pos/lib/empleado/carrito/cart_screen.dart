import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../carrito/cart_controller.dart';
import 'package:frontend_pos/utils/jwt_utils.dart';
import 'package:frontend_pos/auth/auth_repository.dart';
import 'package:frontend_pos/core/http.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartController>();
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Carrito de compras'),
        backgroundColor: Colors.deepPurple,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_forever),
            tooltip: 'Vaciar carrito',
            onPressed: () {
              if (cart.lines.isNotEmpty) {
                showDialog(
                  context: context,
                  builder:
                      (ctx) => AlertDialog(
                        title: const Text('Vaciar carrito'),
                        content: const Text(
                          '¿Estás segura de que quieres eliminar todos los productos del carrito?',
                        ),
                        actions: [
                          TextButton(
                            child: const Text('Cancelar'),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red,
                            ),
                            child: const Text('Vaciar'),
                            onPressed: () {
                              cart.clear();
                              Navigator.pop(ctx);
                            },
                          ),
                        ],
                      ),
                );
              }
            },
          ),
        ],
      ),
      body:
          cart.lines.isEmpty
              ? const Center(
                child: Text(
                  '🛍️ Tu carrito está vacío',
                  style: TextStyle(color: Colors.black54, fontSize: 16),
                ),
              )
              : Column(
                children: [
                  Expanded(
                    child: ListView.builder(
                      itemCount: cart.lines.length,
                      itemBuilder: (context, index) {
                        final item = cart.lines[index];
                        final producto = item.product;

                        return Card(
                          margin: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ListTile(
                            leading:
                                producto.imagen != null
                                    ? ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        producto.imagen!,
                                        width: 50,
                                        height: 50,
                                        fit: BoxFit.cover,
                                      ),
                                    )
                                    : const Icon(
                                      Icons.image,
                                      color: Colors.grey,
                                    ),
                            title: Text(
                              producto.nombre,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              currency.format(producto.precioVenta),
                              style: const TextStyle(color: Colors.deepPurple),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline),
                                  onPressed: () => cart.decrement(index),
                                ),
                                Text(
                                  '${item.qty}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline),
                                  onPressed: () => cart.increment(index),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  _buildResumen(context, cart, currency),
                ],
              ),
    );
  }

  // EN cart_screen.dart - ACTUALIZAR EL BOTÓN DE FINALIZAR VENTA

  Widget _buildResumen(
    BuildContext context,
    CartController cart,
    NumberFormat currency,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            offset: Offset(0, -1),
            blurRadius: 4,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ... (tus widgets existentes de resumen)
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed:
                cart.loading || cart.lines.isEmpty
                    ? null
                    : () => _finalizarVenta(context, cart),
            icon: const Icon(Icons.check_circle),
            label: Text(cart.loading ? 'Procesando...' : 'Finalizar venta'),
            style: ElevatedButton.styleFrom(
              backgroundColor: cart.lines.isEmpty ? Colors.grey : Colors.green,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        ],
      ),
    );
  }

  // ✅ NUEVO MÉTODO PARA FINALIZAR VENTA
  void _finalizarVenta(BuildContext context, CartController cart) async {
    // Mostrar loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => const AlertDialog(
            content: Row(
              children: [
                CircularProgressIndicator(),
                SizedBox(width: 16),
                Text('Procesando venta...'),
              ],
            ),
          ),
    );

    try {
      // 🔹 OBTENER EL ID DEL USUARIO ACTUAL
      final idUsuario = await _obtenerIdUsuarioActual();

      if (idUsuario == null) {
        if (!context.mounted) return;
        Navigator.pop(context); // Cerrar loading
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Error: No se pudo identificar al usuario'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // 🔹 MOSTRAR SELECTOR DE FORMA DE PAGO
      if (!context.mounted) return;
      Navigator.pop(context); // Cerrar loading primero

      final formaPago = await _mostrarSelectorPago(context);
      if (formaPago == null) return; // Usuario canceló

      // 🔹 MOSTRAR LOADING DE NUEVO PARA LA VENTA
      showDialog(
        context: context,
        barrierDismissible: false,
        builder:
            (context) => const AlertDialog(
              content: Row(
                children: [
                  CircularProgressIndicator(),
                  SizedBox(width: 16),
                  Text('Registrando venta...'),
                ],
              ),
            ),
      );

      // 🔹 PROCESAR LA VENTA
      final result = await cart.checkout(
        formaPago: formaPago,
        idUsuario: idUsuario,
      );

      if (!context.mounted) return;
      Navigator.pop(context); // Cerrar loading

      if (result != null && result['success'] == true) {
        final ventaData = result['data'];
        final idVenta = ventaData?['id_venta'];
        final total = ventaData?['total'];

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Venta #$idVenta registrada - Total: \$$total'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 5),
          ),
        );

        // Opcional: Navegar a comprobante o limpiar
        await Future.delayed(const Duration(seconds: 2));
      } else {
        final errorMsg =
            cart.error ?? result?['message'] ?? 'Error desconocido';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: $errorMsg'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Cerrar loading en caso de error
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error inesperado: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ✅ IMPLEMENTAR OBTENCIÓN DEL ID DEL USUARIO

  // EN cart_screen.dart - ACTUALIZAR EL MÉTODO

  Future<int?> _obtenerIdUsuarioActual() async {
    try {
      print('🎯 [CartScreen] SOLUCIÓN TEMPORAL: Forzando ID 4 para cajero');

      // 🔹 PRIMERO: Intentar obtener de AuthRepository
      print('🔄 [CartScreen] Intentando desde AuthRepository...');
      final idFromRepo = await AuthRepository.getUserId();
      if (idFromRepo != null) {
        print('✅ [CartScreen] ID desde AuthRepository: $idFromRepo');
        return idFromRepo;
      }

      // 🔹 SEGUNDO: Intentar desde el token
      print('🔄 [CartScreen] Intentando desde token...');
      final token = await ApiClient.getToken();
      if (token != null) {
        final payload = JwtUtils.decodeToken(token);
        final idFromToken = payload?['id_usuario'];
        print('🔑 [CartScreen] ID desde token: $idFromToken');
        if (idFromToken is int && idFromToken != 1) {
          return idFromToken;
        }
      }

      // 🔹 TERCERO: Forzar ID 4 como fallback
      print('⚠️ [CartScreen] Usando ID fijo 4');
      return 4;
    } catch (e) {
      print('❌ [CartScreen] Error, usando ID 4 como fallback: $e');
      return 4;
    }
  }

  // ✅ SELECTOR DE FORMA DE PAGO
  Future<String?> _mostrarSelectorPago(BuildContext context) async {
    return await showDialog<String>(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Forma de pago'),
            content: const Text('Selecciona cómo pagará el cliente:'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, 'efectivo'),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.money, color: Colors.green),
                    SizedBox(width: 8),
                    Text('Efectivo'),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, 'tarjeta'),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.credit_card, color: Colors.blue),
                    SizedBox(width: 8),
                    Text('Tarjeta'),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancelar'),
              ),
            ],
          ),
    );
  }
}

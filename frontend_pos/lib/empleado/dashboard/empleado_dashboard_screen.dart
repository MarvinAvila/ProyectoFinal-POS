import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/empleado/carrito/cart_controller.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/chatbot/screens/chatbot_screen.dart'; // 💬 Chatbot importado

class EmpleadoDashboardScreen extends StatefulWidget {
  const EmpleadoDashboardScreen({super.key});

  @override
  State<EmpleadoDashboardScreen> createState() =>
      _EmpleadoDashboardScreenState();
}

class _EmpleadoDashboardScreenState extends State<EmpleadoDashboardScreen> {
  // ✅ Controlador para la cámara y el campo de texto manual
  late final MobileScannerController _cameraController;
  final TextEditingController _manualBarcodeController =
      TextEditingController();
  String? _lastScannedBarcode;
  DateTime? _lastScanTime;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController();
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _manualBarcodeController.dispose();
    super.dispose();
  }

  // ✅ Función para procesar un código de barras (escaneado o manual)
  Future<void> _processBarcode(String code) async {
    // Evita escaneos múltiples del mismo código en un segundo
    final now = DateTime.now();
    if (code == _lastScannedBarcode &&
        _lastScanTime != null &&
        now.difference(_lastScanTime!).inSeconds < 1) {
      return;
    }

    setState(() {
      _lastScannedBarcode = code;
      _lastScanTime = now;
    });

    final cart = context.read<CartController>();
    try {
      final success = await cart.addByBarcode(code);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success
                  ? '✅ Producto agregado al carrito'
                  : '❌ Producto no encontrado',
            ),
            backgroundColor: success ? Colors.green : Colors.red,
            duration: const Duration(seconds: 1),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
      }
    }
  }

  Future<void> _finalizarVenta(BuildContext context) async {
    final cart = context.read<CartController>();
    if (cart.lines.isEmpty || cart.loading) return;

    // Aquí podrías mostrar un diálogo para seleccionar forma de pago
    try {
      // ✅ Llamamos al método checkout del controlador del carrito.
      final result = await cart.checkout(formaPago: 'efectivo');

      if (!mounted) return;

      if (result != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Venta registrada con éxito'),
            backgroundColor: Colors.green,
          ),
        );
        // Si es un modal sheet, lo cerramos
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: ${cart.error ?? 'Desconocido'}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } on ApiError catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('❌ Error: ${e.message}')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 800;
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');
    final cart = context.watch<CartController>();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F0F7),
      appBar: AppBar(
        title: const Text('Punto de Venta'),
        backgroundColor: Colors.deepPurple,
        actions: [
          // Botón para alternar la cámara
          IconButton(
            icon: ValueListenableBuilder<TorchState>(
              valueListenable: _cameraController.torchState,
              builder: (context, state, child) {
                return Icon(
                  state == TorchState.on ? Icons.flash_on : Icons.flash_off,
                );
              },
            ),
            onPressed: () => _cameraController.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios),
            onPressed: () => _cameraController.switchCamera(),
          ),
        ],
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 🟢 SECCIÓN DE ESCANEO (CÁMARA Y MANUAL)
          Expanded(
            flex: isMobile ? 1 : 2,
            child: Column(
              children: [
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: _buildScanner(),
                    ),
                  ),
                ),
                _buildManualEntry(),
              ],
            ),
          ),

          // 🟣 SECCIÓN CARRITO (oculta en pantallas pequeñas)
          if (!isMobile)
            Expanded(flex: 1, child: _buildCarrito(context, currency)),
        ],
      ),

      // 💬 Chatbot flotante + 🟠 Carrito flotante móvil
      floatingActionButton: Stack(
        children: [
          if (isMobile && cart.lines.isNotEmpty)
            Positioned(
              bottom: 80,
              right: 16,
              child: FloatingActionButton.extended(
                onPressed: () => _mostrarCarritoMovil(context),
                backgroundColor: Colors.deepPurple,
                icon: const Icon(Icons.shopping_cart),
                label: Text(currency.format(cart.total)),
              ),
            ),
          Positioned(
            bottom: 16,
            left: 24,
            child: FloatingActionButton(
              heroTag: 'chatbot_empleado',
              backgroundColor: Colors.deepPurple,
              tooltip: 'Abrir Chatbot',
              elevation: 6,
              child: const Icon(Icons.chat, color: Colors.white),
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.white,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                  ),
                  builder:
                      (_) => const SizedBox(
                        height: 600,
                        child: ChatbotScreen(), // ✅ Chatbot modal
                      ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ✅ Widget para la vista de la cámara
  Widget _buildScanner() {
    return MobileScanner(
      controller: _cameraController,
      onDetect: (capture) {
        final barcode = capture.barcodes.firstOrNull;
        if (barcode?.rawValue != null) {
          _processBarcode(barcode!.rawValue!);
        }
      },
    );
  }

  // ✅ Widget para la entrada manual de códigos
  Widget _buildManualEntry() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: TextField(
        controller: _manualBarcodeController,
        decoration: InputDecoration(
          labelText: 'Ingresar código manualmente',
          hintText: 'Escribe el código y presiona Enter',
          prefixIcon: const Icon(Icons.keyboard),
          suffixIcon: IconButton(
            icon: const Icon(Icons.send),
            onPressed: () {
              final code = _manualBarcodeController.text.trim();
              if (code.isNotEmpty) {
                _processBarcode(code);
                _manualBarcodeController.clear();
              }
            },
          ),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onSubmitted: _processBarcode,
      ),
    );
  }

  // 🛒 Panel lateral del carrito
  Widget _buildCarrito(BuildContext context, NumberFormat currency) {
    final cart = context.watch<CartController>();

    if (cart.lines.isEmpty) {
      return const Center(
        child: Text(
          '🛍️ Carrito vacío',
          style: TextStyle(color: Colors.black54),
        ),
      );
    }

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🛒 Carrito',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const Divider(),
          Expanded(
            child: ListView.builder(
              itemCount: cart.lines.length,
              itemBuilder: (context, i) {
                final line = cart.lines[i];
                final p = line.product;
                return Card(
                  elevation: 1,
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  child: ListTile(
                    leading:
                        p.imagen != null && p.imagen!.isNotEmpty
                            ? Image.network(
                              p.imagen!,
                              width: 40,
                              height: 40,
                              fit: BoxFit.cover,
                            )
                            : const Icon(
                              Icons.inventory_2_outlined,
                              color: Colors.grey,
                            ),
                    title: Text(
                      p.nombre,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(currency.format(line.price)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(
                            Icons.remove_circle_outline,
                            color: Colors.redAccent,
                          ),
                          onPressed: () => cart.decrement(i),
                        ),
                        Text(
                          '${line.qty.toInt()}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(
                            Icons.add_circle_outline,
                            color: Colors.green,
                          ),
                          onPressed: () => cart.increment(i),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const Divider(),
          // Aquí podrías agregar Subtotal, IVA y Total si quieres más detalle
          Text('Subtotal: ${currency.format(cart.itemsSubtotal)}'),
          Text('IVA (16%): ${currency.format(cart.iva)}'),
          Text(
            'Total: ${currency.format(cart.total)}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: cart.loading ? null : () => _finalizarVenta(context),
            icon: const Icon(Icons.check_circle),
            label:
                cart.loading
                    ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                    : const Text('Finalizar venta'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green.shade700,
              minimumSize: const Size(double.infinity, 40),
            ),
          ),
        ],
      ),
    );
  }

  // 💬 Carrito emergente en móvil
  void _mostrarCarritoMovil(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      builder:
          (_) => SafeArea(
            child: FractionallySizedBox(
              heightFactor: 0.9,
              child: _buildCarrito(
                context,
                NumberFormat.simpleCurrency(locale: 'es_MX'),
              ),
            ),
          ),
    );
  }
}

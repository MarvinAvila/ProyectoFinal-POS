import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend_pos/empleado/carrito/cart_controller.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/chatbot/screens/chatbot_screen.dart';
import 'product_search_dialog.dart';
import 'package:frontend_pos/auth/auth_repository.dart';
import 'package:frontend_pos/utils/jwt_utils.dart';
import 'dart:convert'; 

class EmpleadoDashboardScreen extends StatefulWidget {
  const EmpleadoDashboardScreen({super.key});

  @override
  State<EmpleadoDashboardScreen> createState() =>
      _EmpleadoDashboardScreenState();
}

class _EmpleadoDashboardScreenState extends State<EmpleadoDashboardScreen> {
  // ✅ Controlador para la cámara - SOLO PARA MÓVIL
  MobileScannerController? _cameraController;
  final TextEditingController _manualBarcodeController =
      TextEditingController();
  String? _lastScannedBarcode;
  DateTime? _lastScanTime;

  @override
  void initState() {
    super.initState();
    // Solo inicializar cámara si no es web
    if (!kIsWeb) {
      _cameraController = MobileScannerController();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _debugAuthStatus('AL INICIAR PANTALLA');
    });
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _manualBarcodeController.dispose();
    super.dispose();
  }

  void _showProductSearch() {
    showDialog(
      context: context,
      builder: (context) => const ProductSearchDialog(),
    );
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
      // ✅ NUEVO: Extraer código de producto (optimizado para tu formato QR)
      final String productCode = _extractProductCodeFromScannedData(code);

      print('🔍 [SCANNER] Datos crudos: "$code"');
      print('🔍 [SCANNER] Código procesado: "$productCode"');

      final success = await cart.addByBarcode(productCode);

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

  // ✅ MÉTODO OPTIMIZADO PARA TU FORMATO DE QR
  String _extractProductCodeFromScannedData(String scannedData) {
    final cleanData = scannedData.trim();

    print('🔍 [QR-PROCESSOR] Procesando: "${cleanData.substring(0, 50)}..."');

    // Caso 1: Si es JSON (tu formato específico)
    if (cleanData.startsWith('{') && cleanData.endsWith('}')) {
      print('📝 [QR-PROCESSOR] Detectado JSON, buscando campo "codigo"...');
      try {
        final jsonData = jsonDecode(cleanData);

        // ✅ PRIORIDAD 1: Buscar en este orden específico
        final productCode =
            jsonData['codigo'] ?? // Tu campo principal
            jsonData['id'] ?? // ID numérico
            jsonData['codigo_barra'] ?? // Código de barras
            jsonData['barcode']; // Barcode alternativo

        if (productCode != null) {
          final codeStr = productCode.toString();
          print('✅ [QR-PROCESSOR] Código extraído: "$codeStr"');
          print('✅ [QR-PROCESSOR] Producto: ${jsonData['nombre']}');
          print('✅ [QR-PROCESSOR] Precio: \$${jsonData['precio_venta']}');
          return codeStr;
        } else {
          print('❌ [QR-PROCESSOR] No se encontró campo "codigo" en JSON');
        }
      } catch (e) {
        print('❌ [QR-PROCESSOR] Error parseando JSON: $e');
      }
    }

    // Caso 2: Si es solo números (código de barras normal)
    if (RegExp(r'^\d+$').hasMatch(cleanData)) {
      print('📊 [QR-PROCESSOR] Es código de barras numérico: $cleanData');
      return cleanData;
    }

    // Caso 3: Si es una URL
    if (cleanData.toLowerCase().contains('http')) {
      print('🌐 [QR-PROCESSOR] Es URL, extrayendo código...');
      try {
        final uri = Uri.parse(cleanData);

        // Buscar en path segments
        for (final segment in uri.pathSegments) {
          if (RegExp(r'^\d+$').hasMatch(segment)) {
            print('✅ [QR-PROCESSOR] Código de URL: $segment');
            return segment;
          }
        }

        // Buscar en query parameters
        final codeParam =
            uri.queryParameters['codigo'] ?? uri.queryParameters['id'];
        if (codeParam != null) {
          print('✅ [QR-PROCESSOR] Código de query: $codeParam');
          return codeParam;
        }
      } catch (e) {
        print('❌ [QR-PROCESSOR] Error con URL: $e');
      }
    }

    // Caso 4: Por defecto, usar el texto completo
    print('🔍 [QR-PROCESSOR] Usando datos originales: "$cleanData"');
    return cleanData;
  }

  Future<void> _finalizarVenta(BuildContext context) async {
    final cart = context.read<CartController>();
    if (cart.lines.isEmpty || cart.loading) return;

    try {
      // ✅ DEBUG: Estado ANTES del checkout
      await _debugAuthStatus('ANTES DEL CHECKOUT');
      _debugSetTokenCalls();

      // ✅ OBTENER EL ID DEL USUARIO ACTUAL
      final currentUserId = await _getCurrentUserId(context);
      print('🎯 [EmpleadoDashboard] ID para venta: $currentUserId');

      // ✅ MOSTRAR DIÁLOGO DE CONFIRMACIÓN
      final confirm = await showDialog<bool>(
        context: context,
        builder:
            (context) => AlertDialog(
              title: const Text('Confirmar Venta'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('¿Estás seguro de finalizar esta venta?'),
                  const SizedBox(height: 12),
                  Text(
                    'Total: ${NumberFormat.simpleCurrency(locale: 'es_MX').format(cart.total)}',
                  ),
                  Text('Productos: ${cart.lines.length}'),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancelar'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                  ),
                  child: const Text('Confirmar Venta'),
                ),
              ],
            ),
      );

      if (confirm != true) return;

      // ✅ DEBUG: Estado JUSTO ANTES de llamar al checkout
      await _debugAuthStatus('JUSTO ANTES DE CHECKOUT');

      // ✅ CREAR LA VENTA
      final result = await cart.checkout(
        formaPago: 'efectivo',
        idUsuario: currentUserId,
      );

      // ✅ DEBUG: Estado INMEDIATAMENTE DESPUÉS del checkout
      await _debugAuthStatus('INMEDIATAMENTE DESPUÉS DE CHECKOUT');

      if (!mounted) return;

      if (result != null && result['success'] == true) {
        final ventaData = result['data'];
        final idVenta = ventaData?['id_venta'] ?? 'N/A';
        final total = ventaData?['total'] ?? cart.total;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '✅ Venta #$idVenta registrada - Total: \$${total.toStringAsFixed(2)}',
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );

        // ✅ DEBUG: Estado después de mostrar el mensaje de éxito
        await _debugAuthStatus('DESPUÉS DE MENSAJE ÉXITO');

        // ✅ DEBUG: Estado final
        await _debugAuthStatus('FINAL');
      } else {
        final errorMsg =
            cart.error ?? result?['message'] ?? 'Error desconocido';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: $errorMsg'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } on ApiError catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error: ${e.message}'),
          backgroundColor: Colors.red,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error inesperado: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // Agrega estos métodos en tu _EmpleadoDashboardScreenState

  // ✅ DEBUG: Verificar estado completo de autenticación
  Future<void> _debugAuthStatus(String stage) async {
    print('\n🔍 === DEBUG AUTH STATUS - $stage ===');

    // Verificar token
    final token = await ApiClient.getToken();
    print(
      '🔐 Token: ${token != null ? "PRESENTE (${token.length} chars)" : "AUSENTE"}',
    );

    // Verificar datos de usuario
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getInt('current_user_id');
    final userName = prefs.getString('current_user_name');
    final userRole = prefs.getString('current_user_role');

    print('👤 User ID: $userId');
    print('👤 User Name: $userName');
    print('👤 User Role: $userRole');
    print('🔍 === FIN DEBUG ===\n');
  }

  // ✅ DEBUG: Verificar si hay llamadas a setToken
  void _debugSetTokenCalls() {
    print('🎯 [Dashboard] Monitoreando llamadas a setToken...');
    // Esto nos ayudará a identificar si algo está limpiando el token
  }

  // ✅ MÉTODO PARA OBTENER EL ID DEL USUARIO ACTUAL
  Future<int> _getCurrentUserId(BuildContext context) async {
    try {
      print('🔍 [EmpleadoDashboard] Obteniendo ID del usuario...');

      // ✅ PRIMERO: Intentar desde AuthRepository
      final idFromRepo = await AuthRepository.getUserId();
      if (idFromRepo != null) {
        print('✅ [EmpleadoDashboard] ID desde AuthRepository: $idFromRepo');
        return idFromRepo;
      }

      // ✅ SEGUNDO: Intentar desde el token
      print('🔄 [EmpleadoDashboard] Intentando desde token...');
      final token = await ApiClient.getToken();
      if (token != null) {
        final payload = JwtUtils.decodeToken(token);
        final idFromToken = payload?['id_usuario'];
        print('🔑 [EmpleadoDashboard] ID desde token: $idFromToken');

        if (idFromToken is int && idFromToken != 1) {
          return idFromToken;
        }
      }

      // ✅ TERCERO: Forzar ID 4 como fallback
      print('⚠️ [EmpleadoDashboard] Usando ID fijo 4 para cajero');
      return 4;
    } catch (e) {
      print('❌ [EmpleadoDashboard] Error obteniendo ID: $e');

      // ✅ FALLBACK FINAL: ID 4
      print('⚠️ [EmpleadoDashboard] Fallback: usando ID 4');
      return 4;
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
        actions:
            kIsWeb
                ? [] // En web, sin controles de cámara
                : [
                  // En móvil, controles simplificados sin torchState
                  IconButton(
                    icon: const Icon(Icons.flash_on),
                    onPressed: () {
                      _cameraController?.toggleTorch();
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.flip_camera_ios),
                    onPressed: () {
                      _cameraController?.switchCamera();
                    },
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
                      (_) =>
                          const SizedBox(height: 600, child: ChatbotScreen()),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ✅ Widget para la vista de la cámara MULTIPLATAFORMA
  Widget _buildScanner() {
    if (kIsWeb) {
      return _buildWebScannerFallback();
    }

    if (_cameraController == null) {
      return Container(
        color: Colors.black,
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.white),
              SizedBox(height: 16),
              Text(
                'Inicializando cámara...',
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
        ),
      );
    }

    return MobileScanner(
      controller: _cameraController!,
      onDetect: (capture) {
        final barcode = capture.barcodes.firstOrNull;
        if (barcode?.rawValue != null) {
          _processBarcode(barcode!.rawValue!);
        }
      },
    );
  }

  Widget _buildWebScannerFallback() {
    return Container(
      color: Colors.grey[900],
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.qr_code_scanner, size: 80, color: Colors.white),
            const SizedBox(height: 20),
            const Text(
              'Escáner de Códigos de Barras',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Usa la entrada manual para agregar productos\n\nEn dispositivos móviles se activará la cámara automáticamente',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'En versión móvil se activa el escáner de cámara',
                    ),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              icon: const Icon(Icons.camera_alt),
              label: const Text('Modo Cámara (Móvil)'),
            ),
          ],
        ),
      ),
    );
  }

  // ✅ Widget para la entrada manual de códigos
  Widget _buildManualEntry() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        children: [
          // ✅ BOTÓN DE BÚSQUEDA MANUAL
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _showProductSearch,
              icon: const Icon(Icons.search),
              label: const Text('Buscar Productos Manualmente'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'O ingresa el código manualmente:',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 8),

          // ✅ CAMPO DE CÓDIGO MANUAL (existente)
          TextField(
            controller: _manualBarcodeController,
            decoration: InputDecoration(
              labelText: 'Ingresar código manualmente',
              hintText: 'Escribe el código y presiona Enter',
              prefixIcon: const Icon(Icons.qr_code),
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
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onSubmitted: _processBarcode,
          ),
        ],
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

import 'package:flutter/material.dart';
import 'package:flutter_barcode_scanner/flutter_barcode_scanner.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:dio/dio.dart';

class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codigoCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _precioCompraCtrl = TextEditingController(); // 🆕 Nuevo campo
  final _precioCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  final _categoriaCtrl = TextEditingController();

  String? _unidadSeleccionada; // 🆕 Dropdown de unidad
  bool _loading = false;

  // 📷 Escanear código de barras o escribirlo manual
  Future<void> _scanBarcode() async {
    try {
      final barcode = await FlutterBarcodeScanner.scanBarcode(
        '#6A1B9A',
        'Cancelar',
        true,
        ScanMode.BARCODE,
      );
      if (barcode != "-1") {
        setState(() => _codigoCtrl.text = barcode);
      }
    } catch (e) {
      _showError('Error al escanear: $e');
    }
  }

  // 💾 Guardar producto con manejo de errores personalizado
  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final body = {
        'codigo_barra': _codigoCtrl.text.trim(),
        'nombre': _nombreCtrl.text.trim(),
        'precio_compra': double.tryParse(_precioCompraCtrl.text) ?? 0,
        'precio_venta': double.tryParse(_precioCtrl.text) ?? 0,
        'stock': double.tryParse(_stockCtrl.text) ?? 0,
        'unidad': _unidadSeleccionada, // 🆕 del Dropdown
        'id_categoria': 1, // ⚠️ Ajusta según el ID real de tu categoría
        'id_proveedor': null,
        'fecha_caducidad': null,
        'imagen': null,
      };

      final res = await ApiClient().post('/productos', data: body);

      if (!mounted) return;

      if (res is Map && res['success'] == true) {
        _showSuccess('Producto agregado correctamente');
        Navigator.pop(context, true);
      } else {
        _showError(res['message'] ?? 'Error desconocido al guardar');
      }
    } on ApiError catch (e) {
      String msg;
      if (e.status == 400 || e.status == 422) {
        msg = e.message;
      } else if (e.status == 401) {
        msg = 'Sesión expirada. Inicia sesión nuevamente.';
      } else if (e.status == 403) {
        msg = 'No tienes permisos para realizar esta acción.';
      } else if (e.status == 404) {
        msg = 'Ruta no encontrada (${e.message}).';
      } else if (e.status == 409) {
        msg = 'Ya existe un producto con este código de barras.';
      } else {
        msg = e.message.isNotEmpty ? e.message : 'Error desconocido.';
      }
      _showError(msg);
    } on DioException catch (e) {
      _showError('Error de conexión: ${e.message}');
    } catch (e) {
      _showError('Error inesperado: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(color: Colors.white)),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(color: Colors.white)),
        backgroundColor: Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5FF),
      appBar: AppBar(
        title: const Text('Agregar Producto'),
        backgroundColor: const Color(0xFF6A1B9A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(isMobile ? 16 : 32),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 🟣 Código de barras
              TextFormField(
                controller: _codigoCtrl,
                decoration: InputDecoration(
                  labelText: 'Código de barras',
                  hintText: 'Escanea o escribe manualmente el código',
                  suffixIcon: IconButton(
                    icon: const Icon(
                      Icons.qr_code_scanner,
                      color: Color(0xFF6A1B9A),
                    ),
                    tooltip: 'Escanear código',
                    onPressed: _scanBarcode,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (v) => v!.isEmpty ? 'Campo obligatorio' : null,
              ),
              const SizedBox(height: 16),

              _buildField(_nombreCtrl, 'Nombre del producto'),

              // 🆕 Campo de precio de compra
              _buildField(
                _precioCompraCtrl,
                'Precio de compra',
                keyboard: TextInputType.number,
              ),

              _buildField(
                _precioCtrl,
                'Precio de venta',
                keyboard: TextInputType.number,
              ),

              _buildField(
                _stockCtrl,
                'Stock disponible',
                keyboard: TextInputType.number,
              ),

              // 🆕 Dropdown de unidad
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: DropdownButtonFormField<String>(
                  value: _unidadSeleccionada,
                  decoration: InputDecoration(
                    labelText: 'Unidad',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'pieza', child: Text('Pieza')),
                    DropdownMenuItem(value: 'kg', child: Text('Kilogramo')),
                    DropdownMenuItem(value: 'lt', child: Text('Litro')),
                    DropdownMenuItem(value: 'otro', child: Text('Otro')),
                  ],
                  onChanged: (v) => setState(() => _unidadSeleccionada = v),
                  validator: (v) => v == null ? 'Seleccione una unidad' : null,
                ),
              ),

              _buildField(_categoriaCtrl, 'Categoría'),

              const SizedBox(height: 24),

              Center(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6A1B9A),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 30,
                      vertical: 14,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: _loading ? null : _saveProduct,
                  icon: const Icon(Icons.save, color: Colors.white),
                  label:
                      _loading
                          ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                          : const Text(
                            'Guardar producto',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(
    TextEditingController c,
    String label, {
    TextInputType? keyboard,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: c,
        keyboardType: keyboard,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
        validator: (v) => v!.isEmpty ? 'Campo obligatorio' : null,
      ),
    );
  }
}

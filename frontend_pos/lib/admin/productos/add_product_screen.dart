import 'package:flutter/material.dart';
import 'package:flutter_barcode_scanner/flutter_barcode_scanner.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:dio/dio.dart';
import 'product_model.dart'; // ✅ Importar el modelo
import 'product_repository.dart'; // ✅ Importar el repositorio

class AddProductScreen extends StatefulWidget {
  final Product? product; // 👈 producto opcional para editar o crear

  const AddProductScreen({super.key, this.product});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _repo = ProductRepository(); // ✅ Usar el repositorio
  final _codigoCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _precioCompraCtrl = TextEditingController(); // 🆕 Nuevo campo
  final _precioCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  final _categoriaCtrl = TextEditingController();

  String? _unidadSeleccionada; // 🆕 Dropdown de unidad
  bool _loading = false;

  @override
  void initState() {
    super.initState();

    // 🟣 Si viene un producto, precarga los datos (modo edición)
    final p = widget.product;
    if (p != null) {
      _codigoCtrl.text = p.codigoBarra;
      _nombreCtrl.text = p.nombre;
      _precioCompraCtrl.text = p.precioCompra?.toString() ?? '';
      _precioCtrl.text = p.precioVenta.toString();
      _stockCtrl.text = p.stock.toString();
      _unidadSeleccionada = p.unidad;
      _categoriaCtrl.text = p.idCategoria?.toString() ?? '';
    }
  }

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

    // ✅ Crear instancia del modelo desde el formulario
    final producto = Product(
      idProducto: widget.product?.idProducto ?? 0,
      codigoBarra: _codigoCtrl.text.trim(),
      nombre: _nombreCtrl.text.trim(),
      precioCompra: double.tryParse(_precioCompraCtrl.text) ?? 0,
      precioVenta: double.tryParse(_precioCtrl.text) ?? 0,
      stock: double.tryParse(_stockCtrl.text) ?? 0,
      unidad: _unidadSeleccionada ?? 'pieza',
      idCategoria: int.tryParse(_categoriaCtrl.text), // ⚠️ Ajusta según tu lógica real
      idProveedor: null,
      fechaCaducidad: null,
    );

    try {
      final bool isEdit = widget.product != null;
      if (isEdit) {
        await _repo.update(producto);
      } else {
        await _repo.create(producto);
      }

      if (!mounted) return;
      _showSuccess(
        isEdit ? 'Producto actualizado' : 'Producto agregado',
      );
      Navigator.pop(context, true);
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
    final bool isEdit = widget.product != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5FF),
      appBar: AppBar(
        title: Text(isEdit ? 'Editar producto' : 'Agregar producto'),
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
                          : Text(
                            isEdit ? 'Actualizar producto' : 'Guardar producto',
                            style: const TextStyle(
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

// REEMPLAZA SOLO LAS PARTES NECESARIAS EN TU AddProductScreen
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_barcode_scanner/flutter_barcode_scanner.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'product_model.dart';
import 'product_repository.dart';
import '../../utils/image_picker_utils.dart';

class AddProductScreen extends StatefulWidget {
  final Product? product;

  const AddProductScreen({super.key, this.product});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _repo = ProductRepository();
  final _codigoCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _precioCompraCtrl = TextEditingController();
  final _precioCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  final _categoriaCtrl = TextEditingController();

  String? _unidadSeleccionada;
  bool _loading = false;

  // 🆕 CAMBIO: Reemplazar File por Uint8List para multiplataforma
  Uint8List? _imageBytes;
  String? _networkImageUrl;
  String? _selectedFileName; // 🆕 Guardar nombre del archivo

  @override
  void initState() {
    super.initState();

    final p = widget.product;
    if (p != null) {
      _codigoCtrl.text = p.codigoBarra;
      _nombreCtrl.text = p.nombre;
      _precioCompraCtrl.text = p.precioCompra?.toString() ?? '';
      _precioCtrl.text = p.precioVenta.toString();
      _stockCtrl.text = p.stock.toString();
      _unidadSeleccionada = p.unidad;
      _categoriaCtrl.text = p.idCategoria?.toString() ?? '';
      _networkImageUrl = p.imagen;
    }
  }

  // 📷 Escanear código de barras (MANTENER IGUAL)
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

  // 🖼️ 🆕 ACTUALIZADO: Seleccionar imagen MULTIPLATAFORMA
  Future<void> _pickImage() async {
    try {
      final pickedFile = await ImagePickerUtils.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );

      if (pickedFile != null) {
        final bytes = await ImagePickerUtils.fileToBytes(pickedFile);
        if (bytes != null) {
          setState(() {
            _imageBytes = bytes;
            _selectedFileName = pickedFile.name; // 🆕 Guardar nombre
          });
        }
      }
    } catch (e) {
      _showError('Error al seleccionar imagen: $e');
    }
  }

  // 💾 🆕 ACTUALIZADO: Guardar producto MULTIPLATAFORMA
  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    final producto = Product(
      idProducto: widget.product?.idProducto ?? 0,
      codigoBarra: _codigoCtrl.text.trim(),
      nombre: _nombreCtrl.text.trim(),
      precioCompra: double.tryParse(_precioCompraCtrl.text) ?? 0,
      precioVenta: double.tryParse(_precioCtrl.text) ?? 0,
      stock: double.tryParse(_stockCtrl.text) ?? 0,
      unidad: _unidadSeleccionada ?? 'pieza',
      idCategoria: int.tryParse(_categoriaCtrl.text),
      idProveedor: null,
      fechaCaducidad: null,
    );

    try {
      final bool isEdit = widget.product != null;

      // 🆕 LLAMADA MULTIPLATAFORMA MEJORADA
      if (isEdit) {
        await _repo.update(
          producto,
          imageFile:
              !kIsWeb && _imageBytes != null ? await _createTempFile() : null,
          imageBytes: kIsWeb ? _imageBytes : null,
          imageFileName: _selectedFileName,
        );
      } else {
        await _repo.create(
          producto,
          imageFile:
              !kIsWeb && _imageBytes != null ? await _createTempFile() : null,
          imageBytes: kIsWeb ? _imageBytes : null,
          imageFileName: _selectedFileName,
        );
      }

      if (!mounted) return;
      _showSuccess(isEdit ? 'Producto actualizado' : 'Producto agregado');
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

  // 🆕 AGREGAR este método auxiliar para móvil
  Future<File?> _createTempFile() async {
    if (_imageBytes == null || _selectedFileName == null) return null;

    try {
      final tempDir = await getTemporaryDirectory();
      final tempFile = File('${tempDir.path}/$_selectedFileName');
      await tempFile.writeAsBytes(_imageBytes!);
      return tempFile;
    } catch (e) {
      print('Error creando archivo temporal: $e');
      return null;
    }
  }

  // 🆕 ACTUALIZADO: Widget de imagen MULTIPLATAFORMA
  Widget _buildImagePicker() {
    return Center(
      child: Stack(
        children: [
          Container(
            width: 130,
            height: 130,
            decoration: BoxDecoration(
              border: Border.all(width: 2, color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(16),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child:
                  _imageBytes != null
                      ? Image.memory(
                        _imageBytes!,
                        fit: BoxFit.cover,
                      ) // 🆕 Image.memory para bytes
                      : (_networkImageUrl != null &&
                          _networkImageUrl!.isNotEmpty)
                      ? Image.network(
                        _networkImageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder:
                            (context, error, stackTrace) => const Icon(
                              Icons.image_not_supported,
                              color: Colors.grey,
                              size: 50,
                            ),
                      )
                      : const Center(
                        child: Icon(
                          Icons.image_outlined,
                          color: Colors.grey,
                          size: 50,
                        ),
                      ),
            ),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: Material(
              color: const Color(0xFF6A1B9A),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
              child: InkWell(
                onTap: _pickImage,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
                child: const Padding(
                  padding: EdgeInsets.all(6.0),
                  child: Icon(Icons.edit, color: Colors.white, size: 20),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 🔽 MANTENER TODOS LOS MÉTODOS EXISTENTES SIN CAMBIOS 🔽

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
              _buildImagePicker(), // 🆕 Este método ya fue actualizado
              const SizedBox(height: 24),

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

// REEMPLAZA SOLO LAS PARTES NECESARIAS EN TU AddProductScreen
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile_scanner/mobile_scanner.dart'; // ✅ REEMPLAZADO
import 'package:frontend_pos/core/http.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'product_model.dart';
import 'product_repository.dart';
import 'package:provider/provider.dart'; // ✅ 1. Importar Provider
import '../categorias/categories_controller.dart'; // ✅ 2. Importar el controlador
import '../categorias/category_model.dart'; // ✅ 1. Importar modelo
import '../categorias/category_repository.dart'; // ✅ 2. Importar repositorio
import '../categorias/category_form.dart'; // ✅ 3. Importar formulario de categoría
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

  String? _unidadSeleccionada;
  bool _loading = false;

  // 🆕 CAMBIO: Reemplazar File por Uint8List para multiplataforma
  Uint8List? _imageBytes;
  String? _networkImageUrl;
  String? _selectedFileName; // 🆕 Guardar nombre del archivo

  // ✅ 4. Nuevas variables de estado para las categorías
  List<Categoria> _categorias = [];
  int? _idCategoriaSeleccionada;
  bool _loadingCategories = true;

  // ✅ NUEVO: Controlador para el scanner
  MobileScannerController? _scannerController;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();

    final p = widget.product;
    if (p != null) {
      _codigoCtrl.text = p.codigoBarra;
      _nombreCtrl.text = p.nombre;
      _precioCompraCtrl.text =
          p.precioCompra.toString(); // ✅ 3. Quitar operador innecesario
      _precioCtrl.text = p.precioVenta.toString();
      _stockCtrl.text = p.stock.toString();
      _unidadSeleccionada = p.unidad;
      _idCategoriaSeleccionada = p.idCategoria;
      _networkImageUrl = p.imagen;
    }

    _loadCategories(); // ✅ 5. Cargar categorías al iniciar la pantalla
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    super.dispose();
  }

  // ✅ 6. Nuevo método para obtener las categorías de la API
  Future<void> _loadCategories() async {
    setState(() => _loadingCategories = true);
    try {
      // Usamos un repositorio temporal para esta tarea
      final repo = CategoryRepository();
      final page = await repo.list();
      setState(() => _categorias = page.items);
    } catch (e) {
      _showError('Error al cargar categorías: $e');
    } finally {
      setState(() => _loadingCategories = false);
    }
  }

  // 📷 ✅ ACTUALIZADO: Escanear código de barras con mobile_scanner
  Future<void> _scanBarcode() async {
    try {
      setState(() {
        _isScanning = true;
        _scannerController = MobileScannerController();
      });

      final barcode = await showDialog<String>(
        context: context,
        builder: (context) => _buildScannerDialog(),
      );

      if (barcode != null && barcode.isNotEmpty) {
        setState(() => _codigoCtrl.text = barcode);
      }
    } catch (e) {
      _showError('Error al escanear: $e');
    } finally {
      setState(() {
        _isScanning = false;
        _scannerController?.dispose();
        _scannerController = null;
      });
    }
  }

  // ✅ NUEVO: Dialog para el scanner
  Widget _buildScannerDialog() {
    return Dialog(
      insetPadding: const EdgeInsets.all(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Escanear Código de Barras',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    _scannerController?.dispose();
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: MobileScanner(
                  controller: _scannerController,
                  onDetect: (capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    if (barcodes.isNotEmpty) {
                      final String barcode = barcodes.first.rawValue ?? '';
                      if (barcode.isNotEmpty) {
                        _scannerController?.dispose();
                        Navigator.pop(context, barcode);
                      }
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Enfoca el código de barras dentro del área',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
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
      idCategoria: _idCategoriaSeleccionada, // ✅ 7. Usar el ID del dropdown
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
      // ✅ 4. Usar debugPrint en lugar de print
      debugPrint('Error creando archivo temporal: $e');
      return null;
    }
  }

  Future<void> _regenerateCodes() async {
    if (widget.product == null) return;

    // ✅ DETERMINAR EL MENSAJE Y OPCIONES BASADO EN EL CAMPO
    final tieneCodigo = _codigoCtrl.text.trim().isNotEmpty;
    final String codigoActual = _codigoCtrl.text.trim();

    final bool? confirm = await showDialog<bool>(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Text(
              tieneCodigo ? 'Generar Códigos' : 'Generar Códigos Automáticos',
            ),
            content: Text(
              tieneCodigo
                  ? '¿Qué código deseas usar para generar los nuevos códigos?\n\nCódigo actual: "$codigoActual"'
                  : 'Se generará un código de barras automático y un nuevo QR para este producto.',
            ),
            actions: [
              // Botón Cancelar
              TextButton(
                onPressed:
                    () => Navigator.pop(context, null), // null = cancelar
                child: const Text('Cancelar'),
              ),

              // ✅ BOTONES DINÁMICOS
              if (!tieneCodigo) ...[
                // Solo un botón cuando no hay código
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Generar Automático'),
                ),
              ] else ...[
                // Dos botones cuando hay código en el campo
                OutlinedButton(
                  onPressed:
                      () => Navigator.pop(
                        context,
                        false,
                      ), // false = generar automático
                  child: const Text('Generar Automático'),
                ),
                FilledButton(
                  onPressed:
                      () => Navigator.pop(
                        context,
                        true,
                      ), // true = usar código ingresado
                  child: const Text('Usar Código Ingresado'),
                ),
              ],
            ],
          ),
    );

    // Si es null, el usuario canceló
    if (confirm == null) return;

    setState(() => _loading = true);

    try {
      FocusScope.of(context).unfocus();

      String? codigoParaEnviar;
      String mensajeExito;

      // ✅ LÓGICA INTELIGENTE BASADA EN LA ELECCIÓN DEL USUARIO
      if (tieneCodigo) {
        if (confirm == true) {
          // Usuario eligió "Usar Código Ingresado"
          codigoParaEnviar = codigoActual;
          mensajeExito = 'Códigos generados usando: $codigoActual';
        } else {
          // Usuario eligió "Generar Automático" - no enviar código
          codigoParaEnviar = null;
          mensajeExito = 'Códigos generados automáticamente';
        }
      } else {
        // Campo vacío - siempre generar automático
        codigoParaEnviar = null;
        mensajeExito = 'Códigos generados automáticamente';
      }

      // ✅ LLAMAR AL BACKEND CON LA ELECCIÓN
      final productoActualizado = await _repo.regenerateCodes(
        widget.product!.idProducto,
        newBarcode: codigoParaEnviar,
      );

      if (!mounted) return;

      // ✅ ACTUALIZAR LA INTERFAZ CON EL NUEVO CÓDIGO
      setState(() {
        _codigoCtrl.text = productoActualizado.codigoBarra;
      });

      _showSuccess(
        '$mensajeExito\nNuevo código: ${productoActualizado.codigoBarra}',
      );
    } on ApiError catch (e) {
      _showError('Error al generar códigos: ${e.message}');
    } catch (e) {
      _showError('Error inesperado: $e');
    } finally {
      setState(() => _loading = false);
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
                // ✅ CAMBIO: El código de barras ya no es obligatorio
                validator: null,
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

              // ✅ 8. Reemplazar el campo de texto por un Dropdown con botón de "Agregar"
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        value: _idCategoriaSeleccionada,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: 'Categoría',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          suffixIcon:
                              _loadingCategories
                                  ? const Padding(
                                    padding: EdgeInsets.all(12.0),
                                    child: SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    ),
                                  )
                                  : null,
                        ),
                        items:
                            _categorias.map((cat) {
                              return DropdownMenuItem(
                                value: cat.idCategoria,
                                child: Text(cat.nombre),
                              );
                            }).toList(),
                        onChanged:
                            (v) => setState(() => _idCategoriaSeleccionada = v),
                        validator:
                            (v) =>
                                v == null ? 'Seleccione una categoría' : null,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // ✅ 9. Botón para crear una nueva categoría
                    IconButton.filled(
                      icon: const Icon(Icons.add),
                      tooltip: 'Nueva Categoría',
                      style: IconButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: _crearNuevaCategoria,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 🆕 BOTÓN DE REGENERAR (solo en modo edición)
              if (isEdit)
                Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: Center(
                    child: OutlinedButton.icon(
                      onPressed: _loading ? null : _regenerateCodes,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Regenerar Códigos (QR y Barras)'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.orange.shade800,
                        side: BorderSide(color: Colors.orange.shade800),
                      ),
                    ),
                  ),
                ),

              // Botón de Guardar/Actualizar
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

  // ✅ 10. Lógica para abrir el formulario de creación de categoría
  Future<void> _crearNuevaCategoria() async {
    // Usamos un controlador temporal para el formulario
    final categoriesController = CategoriesController();

    final result = await showDialog<bool>(
      context: context,
      builder:
          (_) => ChangeNotifierProvider.value(
            value: categoriesController,
            child: const CategoryForm(),
          ),
    );

    // Si el formulario se guardó con éxito (result == true)
    if (result == true) {
      // Recargamos la lista de categorías para que incluya la nueva
      await _loadCategories();
      // Opcional: auto-seleccionar la categoría recién creada
      final nuevaCategoria = categoriesController.categorias.last;
      setState(() => _idCategoriaSeleccionada = nuevaCategoria.idCategoria);
    }
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

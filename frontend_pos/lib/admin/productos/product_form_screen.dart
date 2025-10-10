import 'package:flutter/material.dart';
import 'package:flutter_barcode_scanner/flutter_barcode_scanner.dart';
import 'package:intl/intl.dart';

import 'product_model.dart';
import 'product_repository.dart';

class ProductFormScreen extends StatefulWidget {
  final Product? product; // null → modo creación
  const ProductFormScreen({super.key, this.product});

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _repo = ProductRepository();

  // Controladores
  final _nombreCtrl = TextEditingController();
  final _codigoCtrl = TextEditingController();
  final _precioCompraCtrl = TextEditingController();
  final _precioVentaCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  DateTime? _fechaCaducidad;

  String _unidad = 'pieza';
  int? _idCategoria;
  int? _idProveedor;
  bool _guardando = false;

  final unidades = ['pieza', 'kg', 'lt', 'otro'];

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    if (p != null) {
      _nombreCtrl.text = p.nombre;
      _codigoCtrl.text = p.codigoBarra;
      _precioCompraCtrl.text = p.precioCompra.toString();
      _precioVentaCtrl.text = p.precioVenta.toString();
      _stockCtrl.text = p.stock.toString();
      _unidad = p.unidad;
      _fechaCaducidad = p.fechaCaducidad;
      _idCategoria = p.idCategoria;
      _idProveedor = p.idProveedor;
    }
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _codigoCtrl.dispose();
    _precioCompraCtrl.dispose();
    _precioVentaCtrl.dispose();
    _stockCtrl.dispose();
    super.dispose();
  }

  Future<void> _scanBarcode() async {
    final result = await FlutterBarcodeScanner.scanBarcode(
      '#ff6666',
      'Cancelar',
      true,
      ScanMode.BARCODE,
    );
    if (result != '-1') {
      setState(() => _codigoCtrl.text = result);
    }
  }

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _guardando = true);

    final producto = Product(
      id: widget.product?.id ?? 0,
      nombre: _nombreCtrl.text.trim(),
      codigoBarra: _codigoCtrl.text.trim(),
      precioCompra: double.tryParse(_precioCompraCtrl.text) ?? 0,
      precioVenta: double.tryParse(_precioVentaCtrl.text) ?? 0,
      stock: double.tryParse(_stockCtrl.text) ?? 0,
      unidad: _unidad,
      fechaCaducidad: _fechaCaducidad,
      idCategoria: _idCategoria,
      idProveedor: _idProveedor,
    );

    try {
      if (widget.product == null) {
        await _repo.create(producto);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Producto creado correctamente')),
        );
      } else {
        await _repo.update(producto);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Producto actualizado correctamente')),
        );
      }
      Navigator.pop(context, true);
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('❌ Error: ${e.toString()}')));
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  Future<void> _seleccionarFecha(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _fechaCaducidad ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) {
      setState(() => _fechaCaducidad = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final modoEdicion = widget.product != null;
    final dateFormat = DateFormat('yyyy-MM-dd');

    return Scaffold(
      appBar: AppBar(
        title: Text(modoEdicion ? 'Editar producto' : 'Nuevo producto'),
        actions: [
          if (_guardando)
            const Padding(
              padding: EdgeInsets.all(12),
              child: CircularProgressIndicator(color: Colors.white),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nombreCtrl,
              decoration: const InputDecoration(
                labelText: 'Nombre del producto',
                prefixIcon: Icon(Icons.inventory_2_outlined),
              ),
              validator:
                  (v) =>
                      (v == null || v.trim().isEmpty)
                          ? 'El nombre es obligatorio'
                          : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _codigoCtrl,
              decoration: InputDecoration(
                labelText: 'Código de barras',
                prefixIcon: const Icon(Icons.qr_code),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.camera_alt_outlined),
                  onPressed: _scanBarcode,
                ),
              ),
              validator:
                  (v) =>
                      (v == null || v.trim().isEmpty)
                          ? 'El código de barras es obligatorio'
                          : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _precioCompraCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Precio compra',
                      prefixIcon: Icon(Icons.attach_money),
                    ),
                    validator:
                        (v) =>
                            (v == null || double.tryParse(v) == null)
                                ? 'Ingrese un precio válido'
                                : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _precioVentaCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Precio venta',
                      prefixIcon: Icon(Icons.sell_outlined),
                    ),
                    validator:
                        (v) =>
                            (v == null || double.tryParse(v) == null)
                                ? 'Ingrese un precio válido'
                                : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _stockCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Stock',
                prefixIcon: Icon(Icons.warehouse_outlined),
              ),
              validator:
                  (v) =>
                      (v == null || double.tryParse(v) == null)
                          ? 'Ingrese una cantidad válida'
                          : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _unidad,
              decoration: const InputDecoration(
                labelText: 'Unidad de medida',
                prefixIcon: Icon(Icons.scale_outlined),
              ),
              items:
                  unidades
                      .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                      .toList(),
              onChanged: (v) => setState(() => _unidad = v ?? 'pieza'),
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Fecha de caducidad'),
              subtitle: Text(
                _fechaCaducidad != null
                    ? dateFormat.format(_fechaCaducidad!)
                    : 'No especificada',
              ),
              trailing: IconButton(
                icon: const Icon(Icons.calendar_today_outlined),
                onPressed: () => _seleccionarFecha(context),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _guardando ? null : _guardar,
              icon: const Icon(Icons.save),
              label: Text(modoEdicion ? 'Actualizar' : 'Guardar'),
            ),
          ],
        ),
      ),
    );
  }
}

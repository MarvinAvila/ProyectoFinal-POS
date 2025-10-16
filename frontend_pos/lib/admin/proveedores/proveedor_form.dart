// lib/admin/proveedores/proveedor_form.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'proveedores_controller.dart';
import 'proveedor_model.dart';

class ProveedorForm extends StatefulWidget {
  final Proveedor? proveedor;
  const ProveedorForm({super.key, this.proveedor});

  @override
  State<ProveedorForm> createState() => _ProveedorFormState();
}

class _ProveedorFormState extends State<ProveedorForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController nombreCtrl;
  late TextEditingController telefonoCtrl;
  late TextEditingController emailCtrl;
  late TextEditingController direccionCtrl;

  @override
  void initState() {
    super.initState();
    nombreCtrl = TextEditingController(text: widget.proveedor?.nombre ?? '');
    telefonoCtrl = TextEditingController(
      text: widget.proveedor?.telefono ?? '',
    );
    emailCtrl = TextEditingController(text: widget.proveedor?.email ?? '');
    direccionCtrl = TextEditingController(
      text: widget.proveedor?.direccion ?? '',
    );
  }

  @override
  void dispose() {
    nombreCtrl.dispose();
    telefonoCtrl.dispose();
    emailCtrl.dispose();
    direccionCtrl.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;

    final ctrl = context.read<ProveedoresController>();

    final proveedor = Proveedor(
      idProveedor: widget.proveedor?.idProveedor,
      nombre: nombreCtrl.text.trim(),
      telefono: telefonoCtrl.text.trim(),
      email: emailCtrl.text.trim(),
      direccion: direccionCtrl.text.trim(),
    );

    final ok =
        widget.proveedor == null
            ? await ctrl.createProveedor(proveedor)
            : await ctrl.updateProveedor(proveedor);

    if (ok) {
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.proveedor == null
                  ? 'Proveedor creado correctamente'
                  : 'Proveedor actualizado',
            ),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ctrl.error ?? 'Error al guardar')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.proveedor == null ? 'Nuevo Proveedor' : 'Editar Proveedor',
        ),
        backgroundColor: const Color(0xFF5D3A9B),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: nombreCtrl,
                decoration: const InputDecoration(labelText: 'Nombre'),
                validator:
                    (v) => v == null || v.isEmpty ? 'Ingrese un nombre' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: telefonoCtrl,
                decoration: const InputDecoration(labelText: 'Teléfono'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: emailCtrl,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (v) {
                  if (v == null || v.isEmpty) return null;
                  final regex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
                  return regex.hasMatch(v) ? null : 'Email inválido';
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: direccionCtrl,
                decoration: const InputDecoration(labelText: 'Dirección'),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _guardar,
                icon: const Icon(Icons.save),
                label: const Text('Guardar'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5D3A9B),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

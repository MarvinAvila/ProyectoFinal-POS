import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'categories_controller.dart';
import 'category_model.dart';

class CategoryForm extends StatefulWidget {
  final Categoria? categoria;

  const CategoryForm({super.key, this.categoria});

  @override
  State<CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends State<CategoryForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController nombreCtrl;
  late TextEditingController descripcionCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    nombreCtrl = TextEditingController(text: widget.categoria?.nombre ?? '');
    descripcionCtrl = TextEditingController(
      text: widget.categoria?.descripcion ?? '',
    );
  }

  @override
  void dispose() {
    nombreCtrl.dispose();
    descripcionCtrl.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final ctrl = context.read<CategoriesController>();
    bool ok;
    if (widget.categoria == null) {
      ok = await ctrl.createCategoria(nombreCtrl.text, descripcionCtrl.text);
    } else {
      ok = await ctrl.updateCategoria(
        widget.categoria!.idCategoria!,
        nombreCtrl.text,
        descripcionCtrl.text,
      );
    }

    if (ok) {
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.categoria == null
                ? 'Categoría creada'
                : 'Categoría actualizada',
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error al guardar categoría')),
      );
    }

    setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final editando = widget.categoria != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(editando ? 'Editar Categoría' : 'Nueva Categoría'),
        backgroundColor: const Color(0xFF5D3A9B),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: nombreCtrl,
                decoration: const InputDecoration(labelText: 'Nombre'),
                validator:
                    (v) =>
                        v == null || v.trim().isEmpty
                            ? 'Ingrese un nombre'
                            : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: descripcionCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Descripción'),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                icon: const Icon(Icons.save),
                label: Text(
                  _saving
                      ? 'Guardando...'
                      : (editando ? 'Actualizar' : 'Guardar'),
                ),
                onPressed: _saving ? null : _guardar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5D3A9B),
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

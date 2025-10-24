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
    final isEditing = widget.categoria != null;

    return AlertDialog(
      title: Text(isEditing ? 'Editar Categoría' : 'Nueva Categoría'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: nombreCtrl,
              decoration: const InputDecoration(labelText: 'Nombre'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Ingrese un nombre' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: descripcionCtrl,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Descripción'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _saving ? null : _guardar,
          child: Text(isEditing ? 'Actualizar' : 'Guardar'),
        ),
      ],
    );
  }
}

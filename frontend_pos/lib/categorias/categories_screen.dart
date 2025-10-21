import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/admin/categorias/categories_controller.dart';
import 'package:frontend_pos/admin/categorias/category_model.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CategoriesController()..fetchAll(),
      child: const _CategoriesView(),
    );
  }
}

class _CategoriesView extends StatelessWidget {
  const _CategoriesView();

  void _showForm(BuildContext context, [Categoria? categoria]) {
    showDialog(
      context: context,
      builder: (_) => _CategoryForm(
        controller: context.read<CategoriesController>(),
        categoria: categoria,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<CategoriesController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Categorías'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: ctrl.loading ? null : ctrl.fetchAll,
          ),
        ],
      ),
      body: Builder(
        builder: (context) {
          if (ctrl.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (ctrl.error != null) {
            return Center(child: Text('Error: ${ctrl.error}'));
          }
          if (ctrl.categorias.isEmpty) {
            return const Center(child: Text('No hay categorías'));
          }
          return ListView.builder(
            itemCount: ctrl.categorias.length,
            itemBuilder: (context, index) {
              final cat = ctrl.categorias[index];
              return ListTile(
                title: Text(cat.nombre),
                subtitle: Text(cat.descripcion ?? 'Sin descripción'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit, color: Colors.blue),
                      onPressed: () => _showForm(context, cat),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () async {
                        final confirm = await showDialog<bool>(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('Confirmar'),
                                content: Text(
                                    '¿Eliminar la categoría "${cat.nombre}"?'),
                                actions: [
                                  TextButton(
                                      onPressed: () =>
                                          Navigator.pop(ctx, false),
                                      child: const Text('Cancelar')),
                                  FilledButton(
                                      onPressed: () =>
                                          Navigator.pop(ctx, true),
                                      child: const Text('Eliminar')),
                                ],
                              ),
                            ) ??
                            false;
                        if (confirm) {
                          await ctrl.deleteCategoria(cat.idCategoria!);
                        }
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showForm(context),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _CategoryForm extends StatefulWidget {
  final CategoriesController controller;
  final Categoria? categoria;

  const _CategoryForm({required this.controller, this.categoria});

  @override
  State<_CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends State<_CategoryForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nombreCtrl;
  late final TextEditingController _descCtrl;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nombreCtrl = TextEditingController(text: widget.categoria?.nombre);
    _descCtrl = TextEditingController(text: widget.categoria?.descripcion);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final bool success;
    if (widget.categoria == null) {
      success =
          await widget.controller.createCategoria(_nombreCtrl.text, _descCtrl.text);
    } else {
      success = await widget.controller.updateCategoria(
        widget.categoria!.idCategoria!,
        _nombreCtrl.text,
        _descCtrl.text,
      );
    }

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.categoria == null ? 'Nueva Categoría' : 'Editar Categoría'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _nombreCtrl,
              decoration: const InputDecoration(labelText: 'Nombre'),
              validator: (v) => v!.isEmpty ? 'Campo requerido' : null,
            ),
            TextFormField(
              controller: _descCtrl,
              decoration: const InputDecoration(labelText: 'Descripción'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(onPressed: _isSaving ? null : _save, child: const Text('Guardar')),
      ],
    );
  }
}
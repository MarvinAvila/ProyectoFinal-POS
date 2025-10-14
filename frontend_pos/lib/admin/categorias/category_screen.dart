import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'categories_controller.dart';
import 'category_model.dart';
import 'category_form.dart';

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

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<CategoriesController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Categorías'),
        backgroundColor: const Color(0xFF5D3A9B),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: ctrl.loading ? null : ctrl.fetchAll,
          ),
        ],
      ),
      backgroundColor: const Color(0xFFF5F0FA),
      body: Builder(
        builder: (context) {
          if (ctrl.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (ctrl.error != null) {
            return Center(child: Text('Error: ${ctrl.error}'));
          }

          if (ctrl.categorias.isEmpty) {
            return const Center(child: Text('No hay categorías registradas.'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: ctrl.categorias.length,
            itemBuilder: (context, i) {
              final c = ctrl.categorias[i];
              return Card(
                margin: const EdgeInsets.symmetric(vertical: 6),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 3,
                child: ListTile(
                  title: Text(
                    c.nombre,
                    style: const TextStyle(
                      color: Color(0xFF4A148C),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(c.descripcion ?? 'Sin descripción'),
                  trailing: PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) async {
                      if (value == 'edit') {
                        final actualizado = await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder:
                                (_) => ChangeNotifierProvider.value(
                                  // 🔹 Usa el mismo provider actual
                                  value: context.read<CategoriesController>(),
                                  child: CategoryForm(categoria: c),
                                ),
                          ),
                        );
                        if (actualizado == true) ctrl.fetchAll();
                      } else if (value == 'delete') {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder:
                              (_) => AlertDialog(
                                title: const Text('Confirmar eliminación'),
                                content: Text(
                                  '¿Deseas eliminar la categoría "${c.nombre}"?',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed:
                                        () => Navigator.pop(context, false),
                                    child: const Text('Cancelar'),
                                  ),
                                  TextButton(
                                    onPressed:
                                        () => Navigator.pop(context, true),
                                    child: const Text('Eliminar'),
                                  ),
                                ],
                              ),
                        );

                        if (confirm == true) {
                          final ok = await ctrl.deleteCategoria(c.idCategoria!);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                ok
                                    ? 'Categoría eliminada'
                                    : 'Error al eliminar',
                              ),
                            ),
                          );
                        }
                      }
                    },
                    itemBuilder:
                        (_) => const [
                          PopupMenuItem(
                            value: 'edit',
                            child: Row(
                              children: [
                                Icon(Icons.edit, color: Colors.deepPurple),
                                SizedBox(width: 8),
                                Text('Editar'),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'delete',
                            child: Row(
                              children: [
                                Icon(Icons.delete, color: Colors.red),
                                SizedBox(width: 8),
                                Text('Eliminar'),
                              ],
                            ),
                          ),
                        ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF5D3A9B),
        child: const Icon(Icons.add),
        onPressed: () async {
          final creada = await Navigator.push(
            context,
            MaterialPageRoute(
              builder:
                  (_) => ChangeNotifierProvider.value(
                    // 🔹 Reusa el mismo provider al abrir el formulario
                    value: context.read<CategoriesController>(),
                    child: const CategoryForm(),
                  ),
            ),
          );
          if (creada == true) context.read<CategoriesController>().fetchAll();
        },
      ),
    );
  }
}

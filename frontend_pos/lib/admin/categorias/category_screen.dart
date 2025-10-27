import 'dart:ui';
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
      // 🌌 Fondo azul con degradado
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0A0E21), // Azul noche profundo
              Color(0xFF0F172A), // Azul marino
              Color(0xFF1E293B), // Gris azulado
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 💎 AppBar glass con botón regresar y fecha si aplica
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(16),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                  child: Container(
                    height: kToolbarHeight,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.06),
                      border: Border(
                        bottom: BorderSide(
                          color: Colors.white.withOpacity(0.15),
                          width: 0.6,
                        ),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // 🔙 Botón de regreso
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: Colors.white,
                          ),
                          tooltip: 'Regresar',
                          onPressed: () => Navigator.pop(context),
                        ),

                        const Text(
                          'Categorías',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 20,
                          ),
                        ),

                        // 🔄 Botón de recarga
                        IconButton(
                          icon: const Icon(Icons.refresh, color: Colors.white),
                          tooltip: 'Actualizar',
                          onPressed: ctrl.loading ? null : ctrl.fetchAll,
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // 📋 Contenido principal
              Expanded(
                child: Builder(
                  builder: (context) {
                    if (ctrl.loading) {
                      return const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      );
                    }

                    if (ctrl.error != null) {
                      return Center(
                        child: Text(
                          'Error: ${ctrl.error}',
                          style: const TextStyle(color: Colors.white),
                        ),
                      );
                    }

                    if (ctrl.categorias.isEmpty) {
                      return const Center(
                        child: Text(
                          'No hay categorías registradas.',
                          style: TextStyle(color: Colors.white70),
                        ),
                      );
                    }

                    // 📜 Lista de categorías con cards
                    return ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: ctrl.categorias.length,
                      itemBuilder: (context, i) {
                        final c = ctrl.categorias[i];
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                            child: Container(
                              margin: const EdgeInsets.symmetric(vertical: 6),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    Colors.white.withOpacity(0.1),
                                    Colors.white.withOpacity(0.03),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.2),
                                  width: 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.25),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: ListTile(
                                title: Text(
                                  c.nombre,
                                  style: const TextStyle(
                                    color: Color(0xFFB388FF),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                subtitle: Text(
                                  c.descripcion ?? 'Sin descripción',
                                  style: const TextStyle(color: Colors.white70),
                                ),
                                trailing: PopupMenuButton<String>(
                                  icon: const Icon(
                                    Icons.more_vert,
                                    color: Colors.white,
                                  ),
                                  onSelected: (value) async {
                                    if (value == 'edit') {
                                      final actualizado = await Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder:
                                              (
                                                _,
                                              ) => ChangeNotifierProvider.value(
                                                value:
                                                    context
                                                        .read<
                                                          CategoriesController
                                                        >(),
                                                child: CategoryForm(
                                                  categoria: c,
                                                ),
                                              ),
                                        ),
                                      );
                                      if (actualizado == true) ctrl.fetchAll();
                                    } else if (value == 'delete') {
                                      final confirm = await showDialog<bool>(
                                        context: context,
                                        builder:
                                            (_) => AlertDialog(
                                              title: const Text(
                                                'Confirmar eliminación',
                                              ),
                                              content: Text(
                                                '¿Deseas eliminar la categoría "${c.nombre}"?',
                                              ),
                                              actions: [
                                                TextButton(
                                                  onPressed:
                                                      () => Navigator.pop(
                                                        context,
                                                        false,
                                                      ),
                                                  child: const Text('Cancelar'),
                                                ),
                                                TextButton(
                                                  onPressed:
                                                      () => Navigator.pop(
                                                        context,
                                                        true,
                                                      ),
                                                  child: const Text('Eliminar'),
                                                ),
                                              ],
                                            ),
                                      );

                                      if (confirm == true) {
                                        final ok = await ctrl.deleteCategoria(
                                          c.idCategoria!,
                                        );
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
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
                                              Icon(
                                                Icons.edit,
                                                color: Colors.deepPurple,
                                              ),
                                              SizedBox(width: 8),
                                              Text('Editar'),
                                            ],
                                          ),
                                        ),
                                        PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(
                                                Icons.delete,
                                                color: Colors.red,
                                              ),
                                              SizedBox(width: 8),
                                              Text('Eliminar'),
                                            ],
                                          ),
                                        ),
                                      ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),

      // 💜 FAB translúcido violeta
      floatingActionButton: ClipRRect(
        borderRadius: BorderRadius.circular(40),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: FloatingActionButton(
            backgroundColor: const Color(0xFF7C4DFF).withOpacity(0.85),
            child: const Icon(Icons.add, color: Colors.white),
            onPressed: () async {
              final creada = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder:
                      (_) => ChangeNotifierProvider.value(
                        value: context.read<CategoriesController>(),
                        child: const CategoryForm(),
                      ),
                ),
              );
              if (creada == true) {
                context.read<CategoriesController>().fetchAll();
              }
            },
          ),
        ),
      ),
    );
  }
}

// lib/admin/proveedores/proveedores_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'proveedores_controller.dart';
import 'proveedor_model.dart';
import 'proveedor_form.dart';

class ProveedoresScreen extends StatelessWidget {
  const ProveedoresScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ProveedoresController()..fetchAll(),
      child: const _ProveedoresView(),
    );
  }
}

class _ProveedoresView extends StatelessWidget {
  const _ProveedoresView();

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<ProveedoresController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Proveedores'),
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
            return Center(child: Text(ctrl.error!));
          }

          if (ctrl.proveedores.isEmpty) {
            return const Center(child: Text('No hay proveedores registrados.'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: ctrl.proveedores.length,
            itemBuilder: (context, i) {
              final p = ctrl.proveedores[i];
              return Card(
                margin: const EdgeInsets.symmetric(vertical: 6),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 3,
                child: ListTile(
                  title: Text(
                    p.nombre,
                    style: const TextStyle(
                      color: Color(0xFF4A148C),
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 6.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (p.telefono != null && p.telefono!.isNotEmpty)
                          Row(
                            children: [
                              const Icon(
                                Icons.phone,
                                size: 16,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                p.telefono!,
                                style: const TextStyle(color: Colors.black87),
                              ),
                            ],
                          ),
                        if (p.email != null && p.email!.isNotEmpty)
                          Row(
                            children: [
                              const Icon(
                                Icons.email_outlined,
                                size: 16,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                p.email!,
                                style: const TextStyle(color: Colors.black87),
                              ),
                            ],
                          ),
                        if (p.direccion != null && p.direccion!.isNotEmpty)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 16,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  p.direccion!,
                                  style: const TextStyle(color: Colors.black87),
                                  overflow: TextOverflow.visible,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                  trailing: PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) async {
                      if (value == 'edit') {
                        final actualizado = await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder:
                                (_) => ChangeNotifierProvider.value(
                                  value: context.read<ProveedoresController>(),
                                  child: ProveedorForm(proveedor: p),
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
                                  '¿Deseas eliminar al proveedor "${p.nombre}"?',
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
                          final ok = await ctrl.deleteProveedor(p.idProveedor!);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                ok
                                    ? 'Proveedor eliminado'
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
          final creado = await Navigator.push(
            context,
            MaterialPageRoute(
              builder:
                  (_) => ChangeNotifierProvider.value(
                    value: context.read<ProveedoresController>(),
                    child: const ProveedorForm(),
                  ),
            ),
          );
          if (creado == true) ctrl.fetchAll();
        },
      ),
    );
  }
}

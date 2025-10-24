import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'user_model.dart';
import 'users_repository.dart'; // ✅ Importar el repositorio

/// ==============================
/// 🔹 CONTROLADOR CON PROVIDER
/// ==============================
class UsersController extends ChangeNotifier {
  final _repo = UsersRepository(); // ✅ Usar el repositorio
  List<Usuario> _usuarios = [];
  bool _loading = false;
  String? _error;

  List<Usuario> get usuarios => _usuarios;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> init() async {
    await fetchUsers();
  }

  Future<void> fetchUsers() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _usuarios = await _repo.fetchUsers();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> deleteUser(int id) async {
    try {
      await _repo.deleteUser(id);
      _usuarios.removeWhere((u) => u.idUsuario == id);
      notifyListeners();
    } catch (e) {
      _error = 'No se pudo eliminar el usuario: $e';
      notifyListeners();
    }
  }
}

/// ==============================
/// 🔹 VISTA PRINCIPAL DE USUARIOS
/// ==============================
class UsersScreen extends StatelessWidget {
  const UsersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => UsersController()..init(),
      child: const _UsersView(),
    );
  }
}

class _UsersView extends StatelessWidget {
  const _UsersView();

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<UsersController>();

    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FA),
      appBar: AppBar(
        title: const Text('Usuarios'),
        backgroundColor: const Color(0xFF5D3A9B),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: ctrl.loading ? null : ctrl.fetchUsers,
          ),
        ],
      ),
      body: Builder(
        builder: (context) {
          if (ctrl.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (ctrl.error != null) {
            return Center(
              child: Text(
                'Error: ${ctrl.error}',
                style: const TextStyle(color: Colors.red),
              ),
            );
          }

          if (ctrl.usuarios.isEmpty) {
            return const Center(child: Text('No hay usuarios registrados.'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: ctrl.usuarios.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, index) {
              final u = ctrl.usuarios[index];
              return Dismissible(
                key: ValueKey(u.idUsuario),
                direction: DismissDirection.endToStart,
                background: Container(
                  color: Colors.red.withOpacity(0.1),
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: const Icon(Icons.delete, color: Colors.redAccent),
                ),
                confirmDismiss: (_) async {
                  return await showDialog<bool>(
                        context: context,
                        builder:
                            (_) => AlertDialog(
                              title: const Text('Eliminar usuario'),
                              content: Text(
                                '¿Deseas eliminar a "${u.nombre}"?',
                              ),
                              actions: [
                                TextButton(
                                  onPressed:
                                      () => Navigator.pop(context, false),
                                  child: const Text('Cancelar'),
                                ),
                                FilledButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Eliminar'),
                                ),
                              ],
                            ),
                      ) ??
                      false;
                },
                onDismissed: (_) => ctrl.deleteUser(u.idUsuario!),
                child: Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: u.activo ? Colors.teal : Colors.grey,
                      child: Text(
                        u.nombre.isNotEmpty ? u.nombre[0].toUpperCase() : '?',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    title: Text(
                      u.nombre,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF4A148C),
                      ),
                    ),
                    subtitle: Text(
                      '${u.correo}\nRol: ${u.rol} • Estado: ${u.activo ? 'Activo' : 'Inactivo'}',
                    ),
                    isThreeLine: true,
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

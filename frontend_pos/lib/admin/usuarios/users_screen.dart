import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:provider/provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'user_model.dart';

/// ==============================
/// 🔹 API CLIENT PARA USUARIOS
/// ==============================
class _UsersApi {
  final Dio _dio;
  static const _storage = FlutterSecureStorage();

  _UsersApi._(this._dio);

  static Future<_UsersApi> create() async {
    final dio = Dio(
      BaseOptions(
        baseUrl: 'http://localhost:3000/api', // cambia si usas otro host
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    // Middleware para token
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );

    return _UsersApi._(dio);
  }

  /// 🟣 Listar usuarios (GET /usuarios)
  Future<List<Usuario>> fetchUsers() async {
    final res = await _dio.get('/usuarios');
    final data = res.data;

    if (data is Map &&
        data['data'] is Map &&
        data['data']['usuarios'] is List) {
      final list = data['data']['usuarios'] as List;
      return list
          .map((e) => Usuario.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    throw Exception('Formato de respuesta no reconocido');
  }

  /// 🟢 Crear usuario (POST /usuarios)
  Future<Usuario> createUser(Usuario user, String contrasena) async {
    final payload = {
      'nombre': user.nombre,
      'correo': user.correo,
      'contrasena': contrasena,
      'rol': user.rol,
    };

    final res = await _dio.post('/usuarios', data: payload);
    final data = res.data;

    if (data is Map && data['data'] is Map) {
      return Usuario.fromJson(Map<String, dynamic>.from(data['data']));
    }
    throw Exception('Error al crear usuario');
  }

  /// 🟡 Actualizar usuario (PUT /usuarios/:id)
  Future<Usuario> updateUser(Usuario user) async {
    if (user.idUsuario == null) throw Exception('ID requerido');
    final res = await _dio.put(
      '/usuarios/${user.idUsuario}',
      data: user.toJson(),
    );
    final data = res.data;

    if (data is Map && data['data'] is Map) {
      return Usuario.fromJson(Map<String, dynamic>.from(data['data']));
    }
    throw Exception('Error al actualizar usuario');
  }

  /// 🔴 Eliminar usuario (DELETE /usuarios/:id)
  Future<void> deleteUser(int id) async {
    await _dio.delete('/usuarios/$id');
  }
}

/// ==============================
/// 🔹 CONTROLADOR CON PROVIDER
/// ==============================
class UsersController extends ChangeNotifier {
  late final _UsersApi _api;
  List<Usuario> _usuarios = [];
  bool _loading = false;
  String? _error;

  List<Usuario> get usuarios => _usuarios;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> init() async {
    _api = await _UsersApi.create();
    await fetchUsers();
  }

  Future<void> fetchUsers() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _usuarios = await _api.fetchUsers();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> deleteUser(int id) async {
    try {
      await _api.deleteUser(id);
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
                    trailing: IconButton(
                      icon: const Icon(Icons.edit, color: Colors.deepPurple),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Editar ${u.nombre} próximamente'),
                          ),
                        );
                      },
                    ),
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

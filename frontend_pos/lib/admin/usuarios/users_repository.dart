import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';
import 'user_model.dart';

/// ==============================
/// 🔹 REPOSITORIO PARA USUARIOS
/// ==============================
class UsersRepository {
  final _api = ApiClient();

  /// 🟣 Listar usuarios (GET /usuarios)
 Future<List<Usuario>> fetchUsers() async {
    // Asumimos que el backend devuelve un objeto como: { "usuarios": [...] }
    // Usamos `asMap` y `asList` de `core/http.dart` para un parseo seguro.
    final response = await _api.get(Endpoints.usuarios);
    final dataMap = asMap(response);
    final userList = asList(dataMap['usuarios']);
    
    return userList
        .map((userData) => Usuario.fromJson(asMap(userData)))
        .toList();
  }

  /// 🟢 Crear usuario (POST /usuarios)
  Future<Usuario> createUser(Usuario user, String contrasena) async {
    final payload = {
      ...user.toJson(),
      'contrasena': contrasena,
    };

    final data = await _api.post(Endpoints.usuarios, data: payload);
    // El backend devuelve { success: true, message: "...", data: {...} }
    // Extraemos el objeto de usuario de la clave 'data'.
    final dataMap = asMap(data);
    return Usuario.fromJson(asMap(dataMap['data']));
  }

  /// 🟡 Actualizar usuario (PUT /usuarios/:id)
  Future<Usuario> updateUser(Usuario user) async {
    if (user.idUsuario == null) {
      throw Exception('ID de usuario requerido para actualizar');
    }

    final data = await _api.put('${Endpoints.usuarios}/${user.idUsuario}', data: user.toJson());
    // El backend devuelve { success: true, message: "...", data: {...} }
    // Extraemos el objeto de usuario de la clave 'data'.
    final dataMap = asMap(data);
    return Usuario.fromJson(asMap(dataMap['data']));
  }

  /// 🔴 Eliminar usuario (DELETE /usuarios/:id)
  Future<void> deleteUser(int id) async {
    await _api.delete('${Endpoints.usuarios}/$id');
  }
}
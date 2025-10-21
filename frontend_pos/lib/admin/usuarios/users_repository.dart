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
    final data = await _api.get(Endpoints.usuarios);

    List list;
    // Adaptarse a diferentes formatos de respuesta del backend
    if (data is Map && data['data'] is List) {
      list = data['data'];
    } else if (data is Map && data['data'] is Map && data['data']['usuarios'] is List) {
      list = data['data']['usuarios'];
    } else if (data is List) {
      list = data;
    } else {
      throw Exception('Formato de respuesta no reconocido para usuarios');
    }

    return list
        .map((e) => Usuario.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// 🟢 Crear usuario (POST /usuarios)
  Future<Usuario> createUser(Usuario user, String contrasena) async {
    final payload = {
      ...user.toJson(),
      'contrasena': contrasena,
    };

    final data = await _api.post(Endpoints.usuarios, data: payload);
    final m = (data is Map && data['data'] != null) ? asMap(data['data']) : asMap(data);
    return Usuario.fromJson(m);
  }

  /// 🟡 Actualizar usuario (PUT /usuarios/:id)
  Future<Usuario> updateUser(Usuario user) async {
    if (user.idUsuario == null) throw Exception('ID de usuario requerido para actualizar');
    
    final data = await _api.put('${Endpoints.usuarios}/${user.idUsuario}', data: user.toJson());
    final m = (data is Map && data['data'] != null) ? asMap(data['data']) : asMap(data);
    return Usuario.fromJson(m);
  }

  /// 🔴 Eliminar usuario (DELETE /usuarios/:id)
  Future<void> deleteUser(int id) async {
    await _api.delete('${Endpoints.usuarios}/$id');
  }
}
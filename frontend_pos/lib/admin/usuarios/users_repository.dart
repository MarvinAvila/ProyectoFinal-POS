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

  // DEBUG - Agrega esto temporalmente
  print('🔍 [DEBUG UsersRepository] Tipo de data: ${data.runtimeType}');
  print('🔍 [DEBUG UsersRepository] Contenido: $data');

  List list;
  
  // ✅ CORREGIDO - Ahora data ya viene procesado por _parse()
  if (data is List) {
    list = data;
  } else if (data is Map) {
    // Si el backend devuelve un Map con la lista en alguna key
    if (data['usuarios'] is List) {
      list = data['usuarios'];
    } else if (data['data'] is List) {
      list = data['data'];
    } else if (data['items'] is List) {
      list = data['items'];
    } else {
      // Buscar cualquier key que sea una lista
      final possibleListKey = data.keys.firstWhere(
        (key) => data[key] is List,
        orElse: () => '',
      );
      if (possibleListKey.isNotEmpty) {
        list = data[possibleListKey];
      } else {
        throw Exception('Formato de respuesta no reconocido: $data');
      }
    }
  } else {
    throw Exception('Formato de respuesta no reconocido: $data');
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
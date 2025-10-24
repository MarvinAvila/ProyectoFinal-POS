import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';
import 'package:shared_preferences/shared_preferences.dart'; // ✅ Agregar import

class AuthRepository {
  final ApiClient _api = ApiClient();

  // ✅ CONSTANTES PARA LAS CLAVES DE SHAREDPREFERENCES
  static const String _userIdKey = 'current_user_id';
  static const String _userNameKey = 'current_user_name';
  static const String _userRoleKey = 'current_user_role';

  // ✅ MÉTODOS PARA GUARDAR Y OBTENER EL ID DEL USUARIO
  
  /// Guardar el ID del usuario en SharedPreferences
  static Future<void> setUserId(int userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_userIdKey, userId);
      print('💾 [AuthRepository] ID de usuario guardado: $userId');
    } catch (e) {
      print('❌ [AuthRepository] Error guardando ID usuario: $e');
    }
  }
  
  /// Obtener el ID del usuario desde SharedPreferences
  static Future<int?> getUserId() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getInt(_userIdKey);
      print('🔍 [AuthRepository] ID de usuario obtenido: $userId');
      return userId;
    } catch (e) {
      print('❌ [AuthRepository] Error obteniendo ID usuario: $e');
      return null;
    }
  }

  /// Guardar nombre del usuario
  static Future<void> setUserName(String userName) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userNameKey, userName);
      print('💾 [AuthRepository] Nombre de usuario guardado: $userName');
    } catch (e) {
      print('❌ [AuthRepository] Error guardando nombre usuario: $e');
    }
  }

  /// Obtener nombre del usuario
  static Future<String?> getUserName() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_userNameKey);
    } catch (e) {
      print('❌ [AuthRepository] Error obteniendo nombre usuario: $e');
      return null;
    }
  }

  /// Guardar rol del usuario
  static Future<void> setUserRole(String userRole) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userRoleKey, userRole);
      print('💾 [AuthRepository] Rol de usuario guardado: $userRole');
    } catch (e) {
      print('❌ [AuthRepository] Error guardando rol usuario: $e');
    }
  }

  /// Obtener rol del usuario
  static Future<String?> getUserRole() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_userRoleKey);
    } catch (e) {
      print('❌ [AuthRepository] Error obteniendo rol usuario: $e');
      return null;
    }
  }

  /// Limpiar todos los datos del usuario al hacer logout
  static Future<void> clearUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_userIdKey);
      await prefs.remove(_userNameKey);
      await prefs.remove(_userRoleKey);
      print('🗑️ [AuthRepository] Datos de usuario eliminados');
    } catch (e) {
      print('❌ [AuthRepository] Error eliminando datos usuario: $e');
    }
  }

  // ✅ MÉTODO LOGIN ACTUALIZADO PARA GUARDAR DATOS DEL USUARIO
  Future<Map<String, dynamic>> login(String correo, String contrasena) async {
    print('🔐 [AuthRepository] Iniciando login para: $correo');
    
    try {
      final response = await _api.post(
        Endpoints.authLogin,
        data: {'correo': correo, 'contrasena': contrasena},
      );

      print('📥 [AuthRepository] Respuesta recibida: $response');
      final data = asMap(response);
      print('📊 [AuthRepository] Data convertida: $data');

      if (data.containsKey('token')) {
        print('✅ [AuthRepository] Token encontrado, guardando...');
        await ApiClient.setToken(data['token']);
        print('✅ [AuthRepository] Token guardado exitosamente');
        
        // ✅ GUARDAR DATOS DEL USUARIO
        if (data.containsKey('usuario')) {
          final usuario = data['usuario'] as Map<String, dynamic>;
          
          // Guardar ID del usuario
          final idUsuario = usuario['id_usuario'];
          if (idUsuario != null) {
            if (idUsuario is int) {
              await setUserId(idUsuario);
            } else if (idUsuario is String) {
              await setUserId(int.tryParse(idUsuario) ?? 0);
            }
          }
          
          // Guardar nombre del usuario
          final nombre = usuario['nombre'];
          if (nombre is String) {
            await setUserName(nombre);
          }
          
          // Guardar rol del usuario
          final rol = usuario['rol'];
          if (rol is String) {
            await setUserRole(rol);
          }
          
          print('👤 [AuthRepository] Datos de usuario guardados:');
          print('   - ID: $idUsuario');
          print('   - Nombre: $nombre');
          print('   - Rol: $rol');
        }
      } else {
        print('❌ [AuthRepository] No se encontró token en la respuesta');
        print('❌ [AuthRepository] Contenido completo: $data');
      }
      
      return data;
    } catch (e) {
      print('💥 [AuthRepository] Error durante login: $e');
      rethrow;
    }
  }

  // ✅ MÉTODO REGISTER ACTUALIZADO
  Future<Map<String, dynamic>> register({
    required String nombre,
    required String correo,
    required String contrasena,
    required String rol,
  }) async {
    final response = await _api.post(
      '/auth/register',
      data: {
        'nombre': nombre,
        'correo': correo,
        'contrasena': contrasena,
        'rol': rol,
      },
    );

    final data = asMap(response);
    if (data.containsKey('token')) {
      await ApiClient.setToken(data['token']);
      
      // ✅ GUARDAR DATOS DEL USUARIO TAMBIÉN EN REGISTER
      if (data.containsKey('usuario')) {
        final usuario = data['usuario'] as Map<String, dynamic>;
        final idUsuario = usuario['id_usuario'];
        if (idUsuario is int) {
          await setUserId(idUsuario);
        }
        
        final nombreUsuario = usuario['nombre'];
        if (nombreUsuario is String) {
          await setUserName(nombreUsuario);
        }
        
        final rolUsuario = usuario['rol'];
        if (rolUsuario is String) {
          await setUserRole(rolUsuario);
        }
      }
    }
    
    return data;
  }

  // ✅ MÉTODO LOGOUT ACTUALIZADO
  Future<void> logout() async {
    await ApiClient.setToken(null);
    await clearUserData(); // ✅ Limpiar todos los datos del usuario
    print('🚪 [AuthRepository] Logout completado - token y datos eliminados');
  }

  Future<bool> isAuthenticated() async {
    final token = await ApiClient.getToken();
    return token != null && token.isNotEmpty;
    final authenticated = token != null && token.isNotEmpty;
    print('🔑 [AuthRepository] isAuthenticated() check: Token present = $authenticated');
    return authenticated;
  }

  Future<Map<String, dynamic>> fetchPerfil() async {
    final response = await _api.get(Endpoints.authMe);
    return asMap(response);
  }

  // ✅ MÉTODO PARA OBTENER INFORMACIÓN COMPLETA DEL USUARIO ACTUAL
  static Future<Map<String, dynamic>?> getCurrentUserInfo() async {
    try {
      final id = await getUserId();
      final nombre = await getUserName();
      final rol = await getUserRole();
      
      if (id == null) {
        return null;
      }
      
      return {
        'id_usuario': id,
        'nombre': nombre,
        'rol': rol,
      };
    } catch (e) {
      print('❌ [AuthRepository] Error obteniendo info usuario: $e');
      return null;
    }
  }
}
// Crea un nuevo archivo: lib/utils/jwt_utils.dart
import 'dart:convert';

class JwtUtils {
  /// Decodifica un token JWT y retorna el payload
  static Map<String, dynamic>? decodeToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) {
        print('❌ Token no tiene 3 partes');
        return null;
      }

      final payload = parts[1];
      var normalized = base64Url.normalize(payload);
      var decoded = utf8.decode(base64Url.decode(normalized));

      print('🔓 Payload decodificado: $decoded');

      final payloadMap = Map<String, dynamic>.from(json.decode(decoded));
      print('🗂️ Keys del payload: ${payloadMap.keys.toList()}');

      return payloadMap;
    } catch (e) {
      print('❌ Error decodificando token: $e');
      return null;
    }
  }

  /// Obtiene el ID de usuario desde el token
  static int? getUserIdFromToken(String token) {
    final payload = decodeToken(token);
    return payload?['id_usuario'] as int?;
  }

  /// Obtiene el rol del usuario desde el token
  static String? getUserRoleFromToken(String token) {
    final payload = decodeToken(token);
    return payload?['rol'] as String?;
  }

  /// Obtiene el nombre del usuario desde el token
  static String? getUserNameFromToken(String token) {
    final payload = decodeToken(token);
    return payload?['nombre'] as String?;
  }
}

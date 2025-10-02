// lib/auth/auth_repository.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Lee la base de la API desde --dart-define
const String _kApiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'http://localhost:3000',
);

class AuthResult {
  final String token;
  final Map<String, dynamic>? user;
  AuthResult({required this.token, this.user});
}

class AuthRepository {
  final Dio _dio;
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'token';

  AuthRepository._(this._dio);

  static Future<AuthRepository> create() async {
    final dio = Dio(
      BaseOptions(
        baseUrl: '$_kApiBase/api',
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    // Interceptor para adjuntar token si existe
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: _tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );

    return AuthRepository._(dio);
  }

  /// POST /api/auth/login
  /// En tu BD los campos son 'correo' y 'contrasena' -> mandamos ambos formatos
  Future<AuthResult> login(String email, String password) async {
    final payload = {
      'email': email, // por si tu backend usa 'email'
      'correo': email, // por si usa 'correo'
      'password': password, // por si usa 'password'
      'contrasena': password, // por si usa 'contrasena'
    };

    final res = await _dio.post('/auth/login', data: payload);
    final data = res.data;

    String? token = _pick<String>(data, const [
      ['token'],
      ['data', 'token'],
      ['access_token'],
      ['jwt'],
    ]);

    if (token == null || token.isEmpty) {
      throw Exception('La respuesta de /auth/login no trajo token');
    }

    final user = _pick<Map>(data, const [
      ['user'],
      ['usuario'],
      ['data', 'user'],
      ['data', 'usuario'],
    ]);

    // Persistir token
    await _storage.write(key: _tokenKey, value: token);

    return AuthResult(token: token, user: user?.cast<String, dynamic>());
  }

  /// GET /api/auth/me  (o fallback a /api/usuarios/me)
  Future<Map<String, dynamic>?> me() async {
    try {
      final res = await _dio.get('/auth/me');
      return (res.data is Map) ? Map<String, dynamic>.from(res.data) : null;
    } on DioException catch (e) {
      // Intento alterno si el backend expone /usuarios/me
      if (e.response?.statusCode == 404) {
        final res = await _dio.get('/usuarios/me');
        return (res.data is Map) ? Map<String, dynamic>.from(res.data) : null;
      }
      rethrow;
    }
  }

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
  }
}

/// Utilidad para extraer campos anidados con tolerancia de formato.
T? _pick<T>(dynamic root, List<List<String>> keysList) {
  for (final keys in keysList) {
    dynamic cur = root;
    var ok = true;
    for (final k in keys) {
      if (cur is Map && cur.containsKey(k)) {
        cur = cur[k];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && cur is T) return cur as T;
  }
  return null;
}

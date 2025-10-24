// lib/core/http.dart
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'env.dart';

/// Error uniforme para toda la app
class ApiError implements Exception {
  final int? status;
  final String message;
  final dynamic data;

  ApiError({this.status, required this.message, this.data});

  @override
  String toString() => 'ApiError(status: $status, message: $message)';
}

/// Cliente HTTP (Dio) centralizado con Bearer Token and baseUrl = Env.apiRoot
class ApiClient {
  static final ApiClient _i = ApiClient._internal();
  factory ApiClient() => _i;

  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiRoot,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 20),
        // ✅ CORREGIDO: Permitir todos los códigos de estado
        validateStatus: (status) => status != null && status < 600,
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) async {
          final token = await _storage.read(key: _kTokenKey);
          if (token != null && token.isNotEmpty) {
            o.headers['Authorization'] = 'Bearer $token';
          }
          if (kDebugMode) {
            debugPrint('[API ${o.method}] ${o.uri}');
          }
          return h.next(o);
        },
        onResponse: (r, h) {
          if (kDebugMode) {
            debugPrint(
              '[API ${r.requestOptions.method}] ${r.requestOptions.uri} '
              '→ ${r.statusCode}',
            );
          }
          return h.next(r);
        },
        onError: (e, h) {
          if (kDebugMode) {
            debugPrint('[API ERROR] ${e.requestOptions.uri}: ${e.message}');
            if (e.response != null) {
              debugPrint('[API ERROR DATA] ${e.response?.data}');
            }
          }
          return h.next(e);
        },
      ),
    );
  }

  late final Dio _dio;
  static const _kTokenKey = 'token';
  static const _storage = FlutterSecureStorage();

  /// Guarda / limpia token en storage
  static Future<void> setToken(String? token) async {
    if (token == null || token.isEmpty) {
      await _storage.delete(key: _kTokenKey);
    } else {
      await _storage.write(key: _kTokenKey, value: token);
    }
  }

  /// Lee el token del almacenamiento seguro.
  static Future<String?> getToken() async => _storage.read(key: _kTokenKey);

  // --------- Métodos HTTP genéricos ---------
  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) async {
    try {
      final res = await _dio.get(
        path,
        queryParameters: query,
        options: Options(headers: headers),
      );
      return _parse(res);
    } on DioException catch (e) {
      // ✅ Manejo mejorado de errores de Dio
      if (e.response != null) {
        return _parse(e.response!);
      }
      throw ApiError(
        status: e.response?.statusCode,
        message: e.message ?? 'Error de conexión',
        data: e.response?.data,
      );
    }
  }

  Future<dynamic> post(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) async {
    try {
      final res = await _dio.post(
        path,
        data: data,
        queryParameters: query,
        options: Options(headers: headers),
      );
      return _parse(res);
    } on DioException catch (e) {
      if (e.response != null) {
        return _parse(e.response!);
      }
      throw ApiError(
        status: e.response?.statusCode,
        message: e.message ?? 'Error de conexión',
        data: e.response?.data,
      );
    }
  }

  // ✅ AGREGAR ESTE MÉTODO DENTRO DE LA CLASE
  Future<dynamic> postFullResponse(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) async {
    try {
      final res = await _dio.post(
        path,
        data: data,
        queryParameters: query,
        options: Options(headers: headers),
      );

      // ✅ PARA ESTE MÉTODO ESPECÍFICO: Devolver respuesta completa
      return res.data; // ← Devuelve todo el JSON, no solo 'data'
    } on DioException catch (e) {
      if (e.response != null) {
        // Mantener el mismo manejo de errores
        final status = e.response!.statusCode ?? 500;
        final body = e.response!.data;

        String message = 'Error $status';
        if (body is Map) {
          message = (body['message'] ?? body['error'] ?? message).toString();
        } else if (body is String && body.isNotEmpty) {
          message = body;
        }

        throw ApiError(status: status, message: message, data: body);
      }
      throw ApiError(
        status: e.response?.statusCode,
        message: e.message ?? 'Error de conexión',
        data: e.response?.data,
      );
    }
  }

  Future<dynamic> put(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) async {
    try {
      final res = await _dio.put(
        path,
        data: data,
        queryParameters: query,
        options: Options(headers: headers),
      );
      return _parse(res);
    } on DioException catch (e) {
      if (e.response != null) {
        return _parse(e.response!);
      }
      throw ApiError(
        status: e.response?.statusCode,
        message: e.message ?? 'Error de conexión',
        data: e.response?.data,
      );
    }
  }

  Future<dynamic> patch(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) async {
    try {
      final res = await _dio.patch(
        path,
        data: data,
        queryParameters: query,
        options: Options(headers: headers),
      );
      return _parse(res);
    } on DioException catch (e) {
      if (e.response != null) {
        return _parse(e.response!);
      }
      throw ApiError(
        status: e.response?.statusCode,
        message: e.message ?? 'Error de conexión',
        data: e.response?.data,
      );
    }
  }

  Future<dynamic> delete(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) async {
    try {
      final res = await _dio.delete(
        path,
        data: data,
        queryParameters: query,
        options: Options(headers: headers),
      );
      return _parse(res);
    } on DioException catch (e) {
      if (e.response != null) {
        return _parse(e.response!);
      }
      throw ApiError(
        status: e.response?.statusCode,
        message: e.message ?? 'Error de conexión',
        data: e.response?.data,
      );
    }
  }

  /// ✅ CORREGIDO: Manejo mejorado de respuestas
  dynamic _parse(Response res) {
    final status = res.statusCode ?? 500;
    final body = res.data;

    // Si es éxito (2xx), devolver datos
    if (status >= 200 && status < 300) {
      if (body is Map && body.containsKey('data')) return body['data'];
      return body;
    }

    // Si es error del servidor (5xx), manejar apropiadamente
    if (status >= 500) {
      throw ApiError(
        status: status,
        message: 'Error del servidor: $status',
        data: body,
      );
    }

    // Si es error del cliente (4xx)
    String message = 'Error $status';
    if (body is Map) {
      message = (body['message'] ?? body['error'] ?? message).toString();
    } else if (body is String && body.isNotEmpty) {
      message = body;
    }

    throw ApiError(status: status, message: message, data: body);
  }
}

/// Helpers rápidos
String encodeBody(Map<String, dynamic> map) => jsonEncode(map);
Map<String, dynamic> asMap(dynamic data) =>
    (data is Map) ? Map<String, dynamic>.from(data) : <String, dynamic>{};
List asList(dynamic data) => (data is List) ? data : const [];
// lib/admin/proveedores/proveedores_controller.dart
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'proveedor_model.dart';

class ProveedoresController extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _baseUrl = 'http://localhost:3000/api/proveedores';
  List<Proveedor> proveedores = [];
  bool loading = true;
  String? error;

  /// 🔹 Construye el cliente Dio con el token de autenticación
  Future<Dio> _getDio() async {
    final token = await _storage.read(key: 'token');
    final dio = Dio(BaseOptions(baseUrl: _baseUrl));
    if (token != null) {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }
    return dio;
  }

  /// 🔹 Obtener todos los proveedores
  Future<void> fetchAll() async {
    loading = true;
    notifyListeners();

    try {
      final dio = await _getDio();
      final res = await dio.get('');
      final data = res.data;

      if (data['data']?['proveedores'] != null) {
        final list = data['data']['proveedores'] as List;
        proveedores =
            list
                .map((e) => Proveedor.fromJson(Map<String, dynamic>.from(e)))
                .toList();
      } else {
        proveedores = [];
      }

      error = null;
    } catch (e) {
      error = 'Error al cargar proveedores: $e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// 🔹 Crear proveedor
  Future<bool> createProveedor(Proveedor proveedor) async {
    try {
      final dio = await _getDio();
      await dio.post('', data: proveedor.toJson());
      await fetchAll();
      return true;
    } catch (e) {
      error = 'Error al crear proveedor: $e';
      notifyListeners();
      return false;
    }
  }

  /// 🔹 Actualizar proveedor
  Future<bool> updateProveedor(Proveedor proveedor) async {
    try {
      final dio = await _getDio();
      await dio.put('/${proveedor.idProveedor}', data: proveedor.toJson());
      await fetchAll();
      return true;
    } catch (e) {
      error = 'Error al actualizar proveedor: $e';
      notifyListeners();
      return false;
    }
  }

  /// 🔹 Eliminar proveedor
  Future<bool> deleteProveedor(int id) async {
    try {
      final dio = await _getDio();
      await dio.delete('/$id');
      proveedores.removeWhere((p) => p.idProveedor == id);
      notifyListeners();
      return true;
    } catch (e) {
      error = 'Error al eliminar proveedor: $e';
      notifyListeners();
      return false;
    }
  }
}

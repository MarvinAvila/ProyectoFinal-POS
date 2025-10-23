// lib/admin/proveedores/proveedores_controller.dart
import 'package:flutter/foundation.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';
import 'proveedor_model.dart';

class ProveedoresController extends ChangeNotifier {
  final _api = ApiClient();
  List<Proveedor> proveedores = [];
  bool loading = true;
  String? error;

  /// 🔹 Obtener todos los proveedores
  /// 🔹 Obtener todos los proveedores
  Future<void> fetchAll() async {
    loading = true;
    notifyListeners();

    try {
      final response = await _api.get(Endpoints.proveedores);

      // 🟣 Manejamos ambos posibles formatos
      dynamic proveedoresRaw;

      if (response is Map) {
        if (response['proveedores'] is List) {
          // Caso 1: el cliente HTTP ya devuelve directamente { proveedores: [...] }
          proveedoresRaw = response['proveedores'];
        } else if (response['data'] is Map &&
            response['data']['proveedores'] is List) {
          // Caso 2: backend devuelve { data: { proveedores: [...] } }
          proveedoresRaw = response['data']['proveedores'];
        }
      }

      // ✅ Convertir a lista de objetos Proveedor
      proveedores =
          (proveedoresRaw as List<dynamic>? ?? [])
              .map((e) => Proveedor.fromJson(Map<String, dynamic>.from(e)))
              .toList();

      error = null;
    } on ApiError catch (e) {
      error = 'Error al cargar proveedores: $e';
    } catch (e) {
      error = 'Error inesperado: $e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// 🔹 Crear proveedor
  Future<bool> createProveedor(Proveedor proveedor) async {
    try {
      await _api.post(Endpoints.proveedores, data: proveedor.toJson());
      await fetchAll();
      return true;
    } on ApiError catch (e) {
      error = 'Error al crear proveedor: $e';
      notifyListeners();
      return false;
    }
  }

  /// 🔹 Actualizar proveedor
  Future<bool> updateProveedor(Proveedor proveedor) async {
    try {
      await _api.put(
        '${Endpoints.proveedores}/${proveedor.idProveedor}',
        data: proveedor.toJson(),
      );
      await fetchAll();
      return true;
    } on ApiError catch (e) {
      error = 'Error al actualizar proveedor: $e';
      notifyListeners();
      return false;
    }
  }

  /// 🔹 Eliminar proveedor
  Future<bool> deleteProveedor(int id) async {
    try {
      await _api.delete('${Endpoints.proveedores}/$id');
      proveedores.removeWhere((p) => p.idProveedor == id);
      notifyListeners();
      return true;
    } on ApiError catch (e) {
      error = 'Error al eliminar proveedor: $e';
      notifyListeners();
      return false;
    }
  }
}

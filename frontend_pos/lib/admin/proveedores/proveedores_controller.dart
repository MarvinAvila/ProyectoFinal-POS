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
  Future<void> fetchAll() async {
    loading = true;
    notifyListeners();

    try {
      // ✅ Petición simplificada. ApiClient maneja URL y token.
      final data = await _api.get(Endpoints.proveedores);
      if (data is List) {
        final list = data;
        proveedores =
            list
                .map((e) => Proveedor.fromJson(Map<String, dynamic>.from(e)))
                .toList();
      } else {
        proveedores = [];
      }

      error = null;
    } on ApiError catch (e) {
      error = 'Error al cargar proveedores: $e';
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
      await _api.put('${Endpoints.proveedores}/${proveedor.idProveedor}',
          data: proveedor.toJson());
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

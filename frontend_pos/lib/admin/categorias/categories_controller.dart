import 'package:flutter/foundation.dart';
import 'package:frontend_pos/core/http.dart'; // ✅ Importar ApiClient
import 'package:frontend_pos/core/env.dart'; // ✅ Importar Endpoints
import 'category_model.dart';

class CategoriesController extends ChangeNotifier {
  final _api = ApiClient(); // ✅ Usar el cliente centralizado
  List<Categoria> categorias = [];
  bool loading = true;
  String? error;

  Future<void> fetchAll() async {
    loading = true;
    notifyListeners();
    try {
      // ✅ Llamada simplificada. El token y la URL base se manejan automáticamente.
      final data = await _api.get(Endpoints.categorias);
      // ✅ ApiClient._parse ya extrae el contenido de 'data'.
      // El backend devuelve { categorias: [...] }, por lo que accedemos a esa clave.
      final list = asList(asMap(data)['categorias']);
      categorias =
          list
              .map((e) => Categoria.fromJson(Map<String, dynamic>.from(e)))
              .toList();
    } on ApiError catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<bool> createCategoria(String nombre, String? descripcion) async {
    try {
      await _api.post(
        Endpoints.categorias,
        data: {'nombre': nombre, 'descripcion': descripcion ?? ''},
      );
      await fetchAll();
      return true;
    } on ApiError catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateCategoria(
    int id,
    String nombre,
    String? descripcion,
  ) async {
    try {
      await _api.put(
        '${Endpoints.categorias}/$id',
        data: {'nombre': nombre, 'descripcion': descripcion ?? ''},
      );
      await fetchAll();
      return true;
    } on ApiError catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteCategoria(int id) async {
    try {
      await _api.delete('${Endpoints.categorias}/$id');
      categorias.removeWhere((c) => c.idCategoria == id);
      notifyListeners();
      return true;
    } on ApiError catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }
}

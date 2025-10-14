import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'category_model.dart';

class CategoriesController extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _baseUrl = 'http://localhost:3000/api/categorias';
  List<Categoria> categorias = [];
  bool loading = true;
  String? error;

  Future<Dio> _getDio() async {
    final token = await _storage.read(key: 'token');
    final dio = Dio(BaseOptions(baseUrl: _baseUrl));
    if (token != null) {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }
    return dio;
  }

  Future<void> fetchAll() async {
    loading = true;
    notifyListeners();
    try {
      final dio = await _getDio();
      final res = await dio.get('');
      final data = res.data;
      if (data['data']?['categorias'] != null) {
        final list = data['data']['categorias'] as List;
        categorias =
            list
                .map((e) => Categoria.fromJson(Map<String, dynamic>.from(e)))
                .toList();
      } else {
        categorias = [];
      }
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<bool> createCategoria(String nombre, String? descripcion) async {
    try {
      final dio = await _getDio();
      await dio.post(
        '',
        data: {'nombre': nombre, 'descripcion': descripcion ?? ''},
      );
      await fetchAll();
      return true;
    } catch (e) {
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
      final dio = await _getDio();
      await dio.put(
        '/$id',
        data: {'nombre': nombre, 'descripcion': descripcion ?? ''},
      );
      await fetchAll();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteCategoria(int id) async {
    try {
      final dio = await _getDio();
      await dio.delete('/$id');
      categorias.removeWhere((c) => c.idCategoria == id);
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }
}

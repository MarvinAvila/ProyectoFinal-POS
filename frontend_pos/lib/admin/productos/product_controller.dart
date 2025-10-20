import 'package:flutter/material.dart';
import 'product_model.dart';
import 'product_repository.dart';

class ProductController extends ChangeNotifier {
  final _repo = ProductRepository();

  List<Product> productos = [];
  bool loading = false;
  String? error;

  Future<void> fetchAll() async {
    try {
      loading = true;
      error = null;
      notifyListeners();

      final page = await _repo.list(page: 1, limit: 100);
      productos = page.items;
    } catch (e) {
      error = 'Error al cargar productos: $e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteProduct(int id) async {
    try {
      await _repo.delete(id);
      productos.removeWhere((p) => p.idProducto == id);
      notifyListeners();
      return true;
    } catch (e) {
      error = 'Error al eliminar producto: $e';
      notifyListeners();
      return false;
    }
  }
}

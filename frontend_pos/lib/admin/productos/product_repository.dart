// lib/productos/product_repository.dart
import 'package:frontend_pos/core/http.dart'; // ApiClient, asMap, asList
import 'package:frontend_pos/core/env.dart'; // Endpoints
import 'package:frontend_pos/core/paging.dart'; // Page<T>

import 'product_model.dart';

class ProductRepository {
  final _api = ApiClient();

  /// Lista de productos con paginación y búsqueda.
  /// Adapta distintas formas de respuesta del backend.
  Future<Page<Product>> list({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoryId,
  }) async {
    final data = await _api.get(
      Endpoints.productos,
      query: {
        'page': page,
        'limit': limit,
        if (search != null && search.trim().isNotEmpty) 'q': search,
        if (categoryId != null) 'categoria': categoryId,
      },
    );

    List items;
    int total;

    if (data is Map) {
      final m = Map<String, dynamic>.from(data);
      items = asList(
        m['items'] ??
            m['data'] ??
            m['productos'] ??
            m['rows'] ??
            m['result'] ??
            m['results'] ??
            [],
      );
      total =
          (m['total'] ??
                  m['count'] ??
                  m['totalCount'] ??
                  m['total_count'] ??
                  items.length)
              as int? ??
          int.tryParse('${m['total'] ?? m['count'] ?? items.length}') ??
          items.length;
    } else {
      items = asList(data);
      total = items.length;
    }

    final productos =
        items
            .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
            .toList();

    return Page<Product>(
      items: productos,
      page: page,
      pageSize: limit,
      total: total,
    );
  }

  Future<Product> getById(int id) async {
    final data = await _api.get('${Endpoints.productos}/$id');
    final m =
        (data is Map && data['data'] != null)
            ? asMap(data['data'])
            : asMap(data);
    return Product.fromJson(m);
  }

  /// (Opcional) Crear producto si tu backend lo permite
  Future<Product> create(Product p) async {
    final data = await _api.post(Endpoints.productos, data: p.toJson());
    final m =
        (data is Map && data['data'] != null)
            ? asMap(data['data'])
            : asMap(data);
    return Product.fromJson(m);
  }

  /// (Opcional) Actualizar
  Future<Product> update(Product p) async {
    final data = await _api.put(
      '${Endpoints.productos}/${p.idProducto}',
      data: p.toJson(),
    );
    final m =
        (data is Map && data['data'] != null)
            ? asMap(data['data'])
            : asMap(data);
    return Product.fromJson(m);
  }

  /// (Opcional) Borrar
  Future<void> delete(int id) async {
    await _api.delete('${Endpoints.productos}/$id');
  }
}

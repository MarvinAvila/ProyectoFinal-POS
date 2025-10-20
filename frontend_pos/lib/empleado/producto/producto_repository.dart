import 'package:frontend_pos/core/http.dart'; // ApiClient
import 'package:frontend_pos/core/env.dart'; // Endpoints
import 'package:frontend_pos/core/paging.dart'; // Page<T>
import 'producto_model.dart';

/// 🔹 Repositorio de productos para el rol EMPLEADO
/// Permite listar productos disponibles para venta, buscar por nombre
/// y obtener los productos en oferta (solo lectura).
class ProductoRepository {
  final _api = ApiClient();

  /// Lista de productos disponibles para venta.
  /// Similar al admin, pero sin crear/editar/borrar.
  Future<Page<Producto>> list({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoriaId,
  }) async {
    final data = await _api.get(
      Endpoints.productos, // mismo endpoint
      query: {
        'page': page,
        'limit': limit,
        if (search != null && search.trim().isNotEmpty) 'q': search,
        if (categoriaId != null) 'categoria': categoriaId,
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
            .map((e) => Producto.fromJson(Map<String, dynamic>.from(e)))
            .toList();

    return Page<Producto>(
      items: productos,
      page: page,
      pageSize: limit,
      total: total,
    );
  }

  /// Obtener un producto específico por ID.
  Future<Producto> getById(int id) async {
    final data = await _api.get('${Endpoints.productos}/$id');
    final m =
        (data is Map && data['data'] != null)
            ? asMap(data['data'])
            : asMap(data);
    return Producto.fromJson(m);
  }

  /// 🔸 Obtener productos en oferta (para mostrar en el panel del empleado)
  Future<List<Producto>> listOfertas() async {
    final data = await _api.get('${Endpoints.productos}/ofertas');
    List items;

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
    } else {
      items = asList(data);
    }

    return items
        .map((e) => Producto.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}

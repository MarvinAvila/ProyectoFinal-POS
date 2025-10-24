import 'package:frontend_pos/core/env.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/paging.dart';
import 'category_model.dart';

class CategoryRepository {
  final _api = ApiClient();

  /// Obtiene una lista paginada de categorías.
  Future<Page<Categoria>> list({int page = 1, int limit = 100}) async {
    final response = await _api.get(
      Endpoints.categorias,
      query: {'page': page, 'limit': limit},
    );

    // El backend devuelve { "categorias": [...], "pagination": {...} } o a veces solo { "data": [...] }
    // PageParser es lo suficientemente inteligente para manejar ambas respuestas.
    return PageParser.parseList<Categoria>(
      response,
      page,
      (json) => Categoria.fromJson(json),
      pageSize: limit,
      // ✅ Le decimos al parser que la lista de items está dentro de la clave "categorias"
      // si la respuesta es un mapa.
      itemsKey: 'categorias',
    );
  }
}
// lib/core/paging.dart

/// Función para deserializar un elemento de lista (mapa JSON) a T.
typedef FromJson<T> = T Function(Map<String, dynamic>);

/// Petición de página típica: ?page=1&limit=20&search=...
class PageRequest {
  final int page; // 1-based
  final int limit;
  final String? search;

  const PageRequest({this.page = 1, this.limit = 20, this.search});

  Map<String, dynamic> toQuery() => {
    'page': page,
    'limit': limit,
    if (search != null && search!.isNotEmpty) 'search': search,
  };

  PageRequest next() =>
      PageRequest(page: page + 1, limit: limit, search: search);
}

/// Contenedor de resultados paginados.
class Page<T> {
  final List<T> items;
  final int page; // página actual (1-based)
  final int pageSize; // tamaño de página usado en la consulta
  final int total; // total de elementos en el servidor
  final int? totalPages;

  const Page({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
    this.totalPages,
  });

  /// ¿hay más elementos por cargar?
  bool get hasMore => page * pageSize < total;

  /// Número total de páginas (si no viene del backend, se calcula).
  int get pages =>
      totalPages ?? (pageSize > 0 ? ((total + pageSize - 1) ~/ pageSize) : 1);

  /// ¿esta es la última página?
  bool get isLast => page >= pages;
}

/// Parser que intenta adaptarse a varias formas comunes de paginado:
/// {data:[], total, page, totalPages, limit}
/// {items:[], count, pageSize}
/// {rows:[]}
/// o una lista simple []
class PageParser {
  static Page<T> parseList<T>(
    dynamic data,
    int page,
    FromJson<T> fromJson, {
    int pageSize = 20,
    String? itemsKey, // ✅ 1. AÑADIR el parámetro opcional
  }) {
    List list;
    int total = 0;
    int? totalPages;
    int ps = pageSize;

    if (data is Map) {
      final map = Map<String, dynamic>.from(data);

      // ✅ FIX: Lógica unificada. Usa itemsKey si existe, si no, busca en las llaves comunes.
      final rawList = (itemsKey != null && map.containsKey(itemsKey))
          ? map[itemsKey]
          : map['data'] ?? map['items'] ?? map['rows'] ?? map['result'] ?? [];

      list = rawList is List ? rawList : <dynamic>[];

      // Total de elementos (múltiples variantes)
      total = _asInt(
        map['total'] ??
            map['count'] ??
            map['totalCount'] ??
            map['total_count'] ??
            list.length,
      );

      // Tamaño de página si el backend lo envía
      final hintedSize = _asInt(
        map['limit'] ?? map['pageSize'] ?? map['perPage'],
      );
      if (hintedSize > 0) ps = hintedSize;

      // Total de páginas (si existe)
      totalPages = _asIntOrNull(map['totalPages']);
      if (totalPages == null && ps > 0) {
        totalPages = ((total + ps - 1) ~/ ps);
      }
    } else if (data is List) {
      list = data;
      total = list.length;
      // ps se mantiene con el valor recibido por parámetro
      totalPages = (ps > 0) ? ((total + ps - 1) ~/ ps) : null;
    } else {
      list = const [];
      total = 0;
      totalPages = (ps > 0) ? 0 : null;
    }

    final items =
        list.map((e) => fromJson(Map<String, dynamic>.from(e as Map))).toList();

    return Page<T>(
      items: items,
      page: page,
      pageSize: ps,
      total: total,
      totalPages: totalPages,
    );
  }

  static int _asInt(dynamic v) {
    if (v is int) return v;
    return int.tryParse('$v') ?? 0;
  }

  static int? _asIntOrNull(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    return int.tryParse('$v');
  }
}

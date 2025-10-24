// lib/ventas/ventas_repository.dart
import 'package:frontend_pos/core/http.dart'; // ApiClient, asMap, asList
import 'package:frontend_pos/core/env.dart'; // Env, Endpoints
import 'package:frontend_pos/core/paging.dart'; // Page<T>

/// ====== MODELOS ======

double _num(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse('${v ?? ''}') ?? 0.0;
}

int _int(dynamic v) {
  if (v is int) return v;
  return int.tryParse('${v ?? ''}') ?? 0;
}

DateTime? _date(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  final s = v.toString();
  try {
    return DateTime.parse(s);
  } catch (_) {
    return null;
  }
}

class Venta {
  final int id;
  final DateTime? fecha;
  final double subtotal;
  final double iva;
  final double total;
  final String? formaPago;
  final int? itemsCount;
  final String? cliente;
  final int? folio;

  Venta({
    required this.id,
    this.fecha,
    this.subtotal = 0,
    this.iva = 0,
    this.total = 0,
    this.formaPago,
    this.itemsCount,
    this.cliente,
    this.folio,
  });

  factory Venta.fromJson(Map<String, dynamic> j) {
    // Compatibilidad con varias claves comunes
    final id = _int(j['id_venta'] ?? j['id'] ?? j['ventaId']);
    final fecha = _date(j['fecha'] ?? j['created_at'] ?? j['createdAt']);
    final subtotal = _num(j['subtotal'] ?? j['sub_total']);
    final iva = _num(j['iva'] ?? j['impuesto'] ?? j['tax']);
    final total = _num(j['total'] ?? j['importe']);
    final formaPago =
        (j['forma_pago'] ?? j['metodo_pago'] ?? j['payment_method'])
            ?.toString();
    final itemsCount = _int(j['items'] ?? j['productos'] ?? j['count_items']);
    final cliente =
        (j['cliente'] ?? j['customer'] ?? j['nombre_cliente'])?.toString();
    final folio = _int(j['folio'] ?? j['consecutivo']);

    return Venta(
      id: id,
      fecha: fecha,
      subtotal: subtotal,
      iva: iva,
      total: total,
      formaPago: formaPago,
      itemsCount: itemsCount == 0 ? null : itemsCount,
      cliente: cliente?.isEmpty == true ? null : cliente,
      folio: folio == 0 ? null : folio,
    );
  }
}

class VentaItem {
  final int productoId;
  final String nombre;
  final double cantidad;
  final double precioUnitario;
  final double subtotal;

  VentaItem({
    required this.productoId,
    required this.nombre,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
  });

  factory VentaItem.fromJson(Map<String, dynamic> j) {
    return VentaItem(
      productoId: _int(
        j['id_producto'] ?? j['producto_id'] ?? j['productId'] ?? j['id'],
      ),
      nombre: (j['nombre'] ?? j['producto'] ?? j['name'] ?? '').toString(),
      cantidad: _num(j['cantidad'] ?? j['qty'] ?? j['quantity']),
      precioUnitario: _num(
        j['precio_unitario'] ?? j['precio'] ?? j['unit_price'],
      ),
      subtotal: _num(j['subtotal'] ?? j['importe'] ?? j['total']),
    );
  }
}

/// ====== REPOSITORIO ======

class VentasRepository {
  final ApiClient _api = ApiClient(); // ✅ Declarar correctamente

  // ✅ MÉTODO createVenta ACTUALIZADO - Usando el nuevo postFullResponse
  Future<Map<String, dynamic>> createVenta(Map<String, dynamic> payload) async {
    try {
      print('📦 [VentasRepository] Enviando payload: $payload');

      // ✅ USAR EL MÉTODO POST NORMAL (no postFullResponse)
      // El método post normal ya maneja el parsing correctamente
      final response = await _api.post(Endpoints.ventas, data: payload);

      print('✅ [VentasRepository] Respuesta recibida: $response');

      // ✅ ADAPTAR LA RESPUESTA A FORMATO ESTÁNDAR
      if (response is Map<String, dynamic>) {
        // Si la respuesta ya es un mapa, verificar estructura
        if (response.containsKey('success')) {
          return response;
        } else {
          // Si no tiene 'success', asumir que fue exitosa
          return {
            'success': true,
            'data': response,
            'message': 'Venta creada exitosamente',
          };
        }
      } else {
        // Si es otro tipo de dato, envolverlo
        return {
          'success': true,
          'data': response,
          'message': 'Venta creada exitosamente',
        };
      }
    } on ApiError catch (e) {
      print('❌ [VentasRepository] Error API: ${e.status} - ${e.message}');

      // ✅ MANEJO ESPECÍFICO DEL ERROR 401
      if (e.status == 401) {
        // Limpiar token expirado
        await ApiClient.setToken(null);
        throw ApiError(
          status: 401,
          message: 'Sesión expirada. Por favor inicie sesión nuevamente.',
          data: e.data,
        );
      }

      // Para otros errores, crear respuesta estructurada
      throw ApiError(
        status: e.status,
        message: e.message,
        data: {'success': false, 'error': e.message, 'data': e.data},
      );
    } catch (e) {
      print('❌ [VentasRepository] Error inesperado: $e');
      throw ApiError(
        message: 'Error inesperado: $e',
        data: {'success': false, 'error': 'Error inesperado: $e'},
      );
    }
  }

  /// Lista paginada de ventas con filtros opcionales.
  Future<Page<Venta>> list({
    int page = 1,
    int limit = 20,
    String? search,
    DateTime? from,
    DateTime? to,
    String? formaPago,
  }) async {
    final query = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (search != null && search.trim().isNotEmpty) 'search': search,
      if (from != null) 'from': _fmtDate(from),
      if (to != null) 'to': _fmtDate(to),
      if (formaPago != null && formaPago.isNotEmpty) 'forma_pago': formaPago,
    };

    final data = await _api.get(Endpoints.ventas, query: query);

    List raw;
    int total;
    if (data is Map) {
      final m = Map<String, dynamic>.from(data);
      raw = asList(
        m['items'] ??
            m['data'] ??
            m['rows'] ??
            m['result'] ??
            m['results'] ??
            [],
      );
      total = _int(m['total'] ?? m['count'] ?? m['totalCount'] ?? raw.length);
    } else if (data is List) {
      raw = asList(data);
      total = raw.length;
    } else {
      raw = const [];
      total = 0;
    }

    final items =
        raw.map((e) => Venta.fromJson(Map<String, dynamic>.from(e))).toList();

    return Page<Venta>(items: items, page: page, pageSize: limit, total: total);
  }

  /// Obtener una venta por ID
  Future<Venta> getById(int id) async {
    final data = await _api.get('${Endpoints.ventas}/$id');
    final m =
        (data is Map && data['data'] != null)
            ? asMap(data['data'])
            : asMap(data);
    return Venta.fromJson(m);
  }

  /// Detalle (items) de una venta
  Future<List<VentaItem>> itemsByVenta(int ventaId) async {
    dynamic data;

    try {
      data = await _api.get(
        Endpoints.detalleVenta,
        query: {'ventaId': ventaId, 'id_venta': ventaId, 'venta': ventaId},
      );
    } catch (_) {}

    if (data == null) {
      try {
        data = await _api.get('${Endpoints.ventas}/$ventaId/detalle');
      } catch (_) {}
    }

    if (data == null) {
      try {
        final header = await _api.get('${Endpoints.ventas}/$ventaId');
        if (header is Map) {
          final m = Map<String, dynamic>.from(header);
          final inner = m['data'] ?? m;
          data =
              (inner is Map)
                  ? (inner['items'] ?? inner['detalle'] ?? inner['products'])
                  : null;
        }
      } catch (_) {}
    }

    List list;
    if (data is Map && data['data'] is List) {
      list = asList(data['data']);
    } else if (data is List) {
      list = asList(data);
    } else {
      list = const [];
    }

    return list
        .map((e) => VentaItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Crear una venta (método alternativo)
  Future<Map<String, dynamic>> create({
    required String formaPago,
    required double subtotal,
    required double iva,
    required double total,
    required List<Map<String, dynamic>> items,
    double? montoRecibido,
    int? clienteId,
  }) async {
    final payload = <String, dynamic>{
      'forma_pago': formaPago,
      'subtotal': subtotal,
      'iva': iva,
      'total': total,
      'items': items,
      if (montoRecibido != null) 'monto_recibido': montoRecibido,
      if (clienteId != null) 'cliente_id': clienteId,
    };

    final data = await _api.post(Endpoints.ventas, data: payload);
    return (data is Map) ? Map<String, dynamic>.from(data) : {'ok': true};
  }

  /// Cancelar/eliminar una venta
  Future<void> delete(int id) async {
    try {
      await _api.delete('${Endpoints.ventas}/$id');
    } catch (_) {
      await _api.post('${Endpoints.ventas}/$id/cancelar');
    }
  }

  /// URL directa al comprobante
  String comprobanteUrl(int ventaId) {
    return Env.url('/comprobantes/$ventaId');
  }

  String _fmtDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}

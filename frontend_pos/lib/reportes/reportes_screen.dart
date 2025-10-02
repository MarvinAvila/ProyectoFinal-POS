// lib/reportes/reportes_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/http.dart'; // ApiClient, asMap, asList, ApiError
import '../core/env.dart'; // Endpoints (ver nota abajo)
import '../core/widgets.dart'; // AppLoader, ErrorView, EmptyView

/// Nota rápida:
/// Asegúrate de tener en lib/core/env.dart algo así:
///   static const reportesVentas = '/reportes/ventas';
///   static const reportesTopProductos = '/reportes/top-productos';
/// Si tus rutas reales son distintas, solo ajusta los nombres abajo.

class ReportesScreen extends StatefulWidget {
  const ReportesScreen({super.key});

  @override
  State<ReportesScreen> createState() => _ReportesScreenState();
}

class _ReportesScreenState extends State<ReportesScreen> {
  final _api = ApiClient();
  final _fmtMoney = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

  DateTime _from = DateTime.now().subtract(const Duration(days: 7));
  DateTime _to = DateTime.now();

  bool _loading = false;
  String? _error;

  // Datos de resumen
  double _total = 0;
  double _iva = 0;
  double _subtotal = 0;
  int _tickets = 0;
  double _ticketProm = 0;

  // Desglose por forma de pago
  List<_PagoRow> _pagos = const [];

  // Top productos
  List<_TopRow> _top = const [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _pickFrom() async {
    final d = await showDatePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _from,
      locale: const Locale('es', 'MX'),
    );
    if (d != null) {
      setState(() => _from = DateTime(d.year, d.month, d.day));
      _fetch();
    }
  }

  Future<void> _pickTo() async {
    final d = await showDatePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _to,
      locale: const Locale('es', 'MX'),
    );
    if (d != null) {
      // incluir todo el día
      setState(() => _to = DateTime(d.year, d.month, d.day, 23, 59, 59));
      _fetch();
    }
  }

  String _d(DateTime x) => DateFormat('yyyy-MM-dd').format(x);

  double _num(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse('${v ?? ''}') ?? 0.0;
  }

  int _int(dynamic v) {
    if (v is int) return v;
    return int.tryParse('${v ?? ''}') ?? 0;
  }

  Future<void> _fetch() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final qp = {'from': _d(_from), 'to': _d(_to)};

      // ===== Resumen ventas =====
      final dataResumen = await _api.get(Endpoints.reportesVentas, query: qp);
      Map<String, dynamic> m;
      if (dataResumen is Map && dataResumen['data'] != null) {
        m = asMap(dataResumen['data']);
      } else if (dataResumen is Map) {
        m = asMap(dataResumen);
      } else {
        m = {};
      }

      final total = _num(m['total'] ?? m['ventas_total'] ?? m['totalVentas']);
      final iva = _num(m['iva'] ?? m['impuesto'] ?? m['tax']);
      final subtotal = _num(m['subtotal'] ?? m['sub_total'] ?? (total - iva));
      final tickets = _int(
        m['tickets'] ?? m['count'] ?? m['ventas'] ?? m['total_tickets'],
      );
      final prom = _num(
        m['ticket_promedio'] ??
            m['avg_ticket'] ??
            (tickets > 0 ? total / tickets : 0),
      );

      // pagos puede venir como lista [{forma:'efectivo', total:123}] o como mapa {'efectivo':123}
      final List<_PagoRow> pagos;
      final rawPagos = m['pagos'] ?? m['metodos'] ?? m['formas_pago'];
      if (rawPagos is List) {
        pagos =
            rawPagos.map((e) {
              final x = Map<String, dynamic>.from(e);
              final nombre =
                  (x['forma'] ?? x['metodo'] ?? x['name'] ?? '').toString();
              final monto = _num(x['total'] ?? x['monto'] ?? x['amount']);
              return _PagoRow(nombre, monto);
            }).toList();
      } else if (rawPagos is Map) {
        final mm = Map<String, dynamic>.from(rawPagos);
        pagos =
            mm.entries
                .map((e) => _PagoRow(e.key.toString(), _num(e.value)))
                .toList();
      } else {
        pagos = [];
      }

      // ===== Top productos =====
      final dataTop = await _api.get(Endpoints.reportesTopProductos, query: qp);
      List list;
      if (dataTop is Map && dataTop['data'] is List) {
        list = asList(dataTop['data']);
      } else if (dataTop is List) {
        list = asList(dataTop);
      } else {
        list = const [];
      }

      final top =
          list.map<_TopRow>((e) {
            final x = Map<String, dynamic>.from(e);
            final nombre =
                (x['nombre'] ?? x['producto'] ?? x['name'] ?? '').toString();
            final qty =
                _num(x['cantidad'] ?? x['qty'] ?? x['total_qty']).toDouble();
            final importe = _num(x['importe'] ?? x['total'] ?? x['revenue']);
            return _TopRow(nombre, qty, importe);
          }).toList();

      setState(() {
        _total = total;
        _iva = iva;
        _subtotal = subtotal;
        _tickets = tickets;
        _ticketProm = prom;
        _pagos = pagos;
        _top = top;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refresh() => _fetch();

  @override
  Widget build(BuildContext context) {
    final rangeText =
        '${DateFormat('dd/MM/yyyy').format(_from)}  —  ${DateFormat('dd/MM/yyyy').format(_to)}';

    return Scaffold(
      appBar: AppBar(title: const Text('Reportes')),
      body: Column(
        children: [
          // Filtros de fecha
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickFrom,
                    icon: const Icon(Icons.event),
                    label: Text(DateFormat('dd/MM/yyyy').format(_from)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickTo,
                    icon: const Icon(Icons.event_available),
                    label: Text(DateFormat('dd/MM/yyyy').format(_to)),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Actualizar',
                  onPressed: _fetch,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Rango: $rangeText',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child:
                  _loading && _error == null
                      ? const AppLoader(text: 'Generando reportes...')
                      : _error != null
                      ? ErrorView(message: _error!, onRetry: _fetch)
                      : ListView(
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
                        children: [
                          _ResumenCard(
                            total: _total,
                            iva: _iva,
                            subtotal: _subtotal,
                            tickets: _tickets,
                            ticketProm: _ticketProm,
                            fmt: _fmtMoney,
                          ),
                          const SizedBox(height: 12),
                          _PagosCard(pagos: _pagos, fmt: _fmtMoney),
                          const SizedBox(height: 12),
                          _TopCard(rows: _top, fmt: _fmtMoney),
                        ],
                      ),
            ),
          ),
        ],
      ),
    );
  }
}

/* ======== Widgets ======== */

class _ResumenCard extends StatelessWidget {
  final double total, iva, subtotal, ticketProm;
  final int tickets;
  final NumberFormat fmt;

  const _ResumenCard({
    required this.total,
    required this.iva,
    required this.subtotal,
    required this.tickets,
    required this.ticketProm,
    required this.fmt,
  });

  @override
  Widget build(BuildContext context) {
    final labelStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
      color: Theme.of(context).colorScheme.outline,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Resumen de ventas',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 20,
              runSpacing: 10,
              children: [
                _kv('Subtotal', fmt.format(subtotal), labelStyle),
                _kv('IVA', fmt.format(iva), labelStyle),
                _kv('TOTAL', fmt.format(total), labelStyle, bold: true),
                _kv('Tickets', '$tickets', labelStyle),
                _kv('Ticket promedio', fmt.format(ticketProm), labelStyle),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, String v, TextStyle? s, {bool bold = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(k, style: s),
        const SizedBox(height: 2),
        Text(
          v,
          style: TextStyle(
            fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _PagoRow {
  final String forma;
  final double monto;
  _PagoRow(this.forma, this.monto);
}

class _PagosCard extends StatelessWidget {
  final List<_PagoRow> pagos;
  final NumberFormat fmt;
  const _PagosCard({required this.pagos, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Formas de pago',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (pagos.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 6),
                child: Text('Sin datos'),
              )
            else
              Column(
                children:
                    pagos
                        .map(
                          (p) => Row(
                            children: [
                              Expanded(child: Text(p.forma)),
                              Text(
                                fmt.format(p.monto),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        )
                        .toList(),
              ),
          ],
        ),
      ),
    );
  }
}

class _TopRow {
  final String nombre;
  final double qty;
  final double importe;
  _TopRow(this.nombre, this.qty, this.importe);
}

class _TopCard extends StatelessWidget {
  final List<_TopRow> rows;
  final NumberFormat fmt;
  const _TopCard({required this.rows, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Top productos',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 6),
                child: Text('Sin datos'),
              )
            else
              Column(
                children:
                    rows
                        .map(
                          (r) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    r.nombre,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                SizedBox(
                                  width: 56,
                                  child: Text(
                                    r.qty % 1 == 0
                                        ? r.qty.toInt().toString()
                                        : r.qty.toStringAsFixed(2),
                                    textAlign: TextAlign.right,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                SizedBox(
                                  width: 100,
                                  child: Text(
                                    fmt.format(r.importe),
                                    textAlign: TextAlign.right,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
              ),
          ],
        ),
      ),
    );
  }
}

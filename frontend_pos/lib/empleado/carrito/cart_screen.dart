// lib/carrito/cart_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import 'cart_controller.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CartController()..init(),
      child: const _CartView(),
    );
  }
}

class _CartView extends StatefulWidget {
  const _CartView();

  @override
  State<_CartView> createState() => _CartViewState();
}

class _CartViewState extends State<_CartView> {
  final _searchCtrl = TextEditingController();
  final _barcodeCtrl = TextEditingController();
  final _fmt = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

  @override
  void dispose() {
    _searchCtrl.dispose();
    _barcodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _openSearch(BuildContext context) async {
    final ctrl = context.read<CartController>();
    await showSearch<String?>(
      context: context,
      delegate: _ProductSearchDelegate(ctrl),
    );
  }

  Future<void> _tryAddBarcode(BuildContext context) async {
    final ctrl = context.read<CartController>();
    final ok = await ctrl.addByBarcode(_barcodeCtrl.text.trim());
    if (!mounted) return;
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Producto no encontrado por código')),
      );
    } else {
      _barcodeCtrl.clear();
    }
  }

  Future<void> _doCheckout(BuildContext context) async {
    final ctrl = context.read<CartController>();

    final PagoData? pago = await showModalBottomSheet<PagoData>(
      context: context,
      isScrollControlled: true,
      builder: (_) => PagoSheet(total: ctrl.total),
    );
    if (pago == null) return;

    final resp = await ctrl.checkout(
      formaPago: pago.formaPago,
      montoRecibido: pago.monto,
    );
    if (!mounted) return;

    if (resp != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Venta registrada ✅')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${ctrl.error ?? 'No se pudo cobrar'}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<CartController>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Carrito'),
        actions: [
          IconButton(
            tooltip: 'Buscar producto',
            onPressed: () => _openSearch(context),
            icon: const Icon(Icons.search),
          ),
          IconButton(
            tooltip: 'Vaciar errores',
            onPressed: ctrl.error == null ? null : ctrl.clearError,
            icon: const Icon(Icons.info_outline),
          ),
        ],
      ),
      body: Column(
        children: [
          // Captura rápida de código de barras manual
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _barcodeCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Código de barras',
                      hintText: 'Escanea o escribe y presiona Enter',
                      prefixIcon: Icon(Icons.qr_code_2),
                    ),
                    onSubmitted: (_) => _tryAddBarcode(context),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () => _tryAddBarcode(context),
                  child: const Text('Agregar'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child:
                ctrl.lines.isEmpty
                    ? const Center(child: Text('Sin productos en el carrito'))
                    : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: ctrl.lines.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final l = ctrl.lines[i];
                        return Dismissible(
                          key: ValueKey('line_$i'),
                          direction: DismissDirection.endToStart,
                          background: Container(
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            color: Colors.red.withOpacity(0.1),
                            child: const Icon(Icons.delete_outline),
                          ),
                          onDismissed: (_) => ctrl.removeAt(i),
                          child: Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                child: Text((i + 1).toString()),
                              ),
                              title: Text(l.product.nombre),
                              subtitle: Text(
                                'P.U. ${_fmt.format(l.price)} • Stock: ${l.product.stock}'
                                '${l.product.unidad != null ? " ${l.product.unidad}" : ""}',
                              ),
                              trailing: SizedBox(
                                width: 170,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    IconButton(
                                      onPressed: () => ctrl.decrement(i),
                                      icon: const Icon(
                                        Icons.remove_circle_outline,
                                      ),
                                    ),
                                    Text(
                                      l.qty.toStringAsFixed(
                                        l.qty % 1 == 0 ? 0 : 2,
                                      ),
                                    ),
                                    IconButton(
                                      onPressed: () => ctrl.increment(i),
                                      icon: const Icon(
                                        Icons.add_circle_outline,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(_fmt.format(l.subtotal)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
          ),
          const Divider(height: 1),
          _TotalsBar(
            subtotal: ctrl.itemsSubtotal,
            iva: ctrl.iva,
            total: ctrl.total,
            loading: ctrl.loading,
            onCobrar: ctrl.lines.isEmpty ? null : () => _doCheckout(context),
          ),
        ],
      ),
    );
  }
}

/// Barra de totales + botón Cobrar
class _TotalsBar extends StatelessWidget {
  final double subtotal, iva, total;
  final bool loading;
  final VoidCallback? onCobrar;

  const _TotalsBar({
    required this.subtotal,
    required this.iva,
    required this.total,
    required this.loading,
    required this.onCobrar,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    return Container(
      padding: const EdgeInsets.all(12),
      color: Theme.of(context).colorScheme.surface,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Subtotal: ${fmt.format(subtotal)}'),
                Text('IVA: ${fmt.format(iva)}'),
                const SizedBox(height: 4),
                Text(
                  'TOTAL: ${fmt.format(total)}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: loading ? null : onCobrar,
            icon:
                loading
                    ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                    : const Icon(Icons.point_of_sale),
            label: const Text('Cobrar'),
          ),
        ],
      ),
    );
  }
}

/// ====== Buscador con showSearch ======
class _ProductSearchDelegate extends SearchDelegate<String?> {
  final CartController ctrl;
  _ProductSearchDelegate(this.ctrl);

  @override
  String get searchFieldLabel => 'Buscar producto...';

  @override
  List<Widget>? buildActions(BuildContext context) => [
    IconButton(onPressed: () => query = '', icon: const Icon(Icons.clear)),
  ];

  @override
  Widget? buildLeading(BuildContext context) => IconButton(
    onPressed: () => close(context, null),
    icon: const Icon(Icons.arrow_back),
  );

  @override
  Widget buildResults(BuildContext context) => _buildList(context);

  @override
  Widget buildSuggestions(BuildContext context) => _buildList(context);

  Widget _buildList(BuildContext context) {
    if (query.trim().isEmpty) {
      return const Center(child: Text('Escribe para buscar'));
    }
    return FutureBuilder<List<ProductLite>>(
      future: ctrl.search(query),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snap.hasData || snap.data!.isEmpty) {
          return const Center(child: Text('Sin resultados'));
        }

        final items = snap.data!;
        final fmt = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

        return ListView.builder(
          itemCount: items.length,
          itemBuilder: (_, i) {
            final p = items[i];
            return ListTile(
              title: Text(p.nombre),
              subtitle: Text(
                'P.U. ${fmt.format(p.precioVenta)} • Stock ${p.stock}',
              ),
              onTap: () {
                ctrl.addProductLite(p); // wrapper que llama a addProduct(...)
                close(context, p.nombre);
              },
            );
          },
        );
      },
    );
  }
}

/// ====== Datos y Sheet de Pago (públicos) ======

class PagoData {
  final String formaPago; // efectivo | tarjeta | otro
  final double monto;
  PagoData(this.formaPago, this.monto);
}

class PagoSheet extends StatefulWidget {
  final double total;
  const PagoSheet({required this.total, super.key});

  @override
  State<PagoSheet> createState() => _PagoSheetState();
}

class _PagoSheetState extends State<PagoSheet> {
  String _forma = 'efectivo';
  final _montoCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _montoCtrl.text = widget.total.toStringAsFixed(2);
  }

  @override
  void dispose() {
    _montoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    final monto = double.tryParse(_montoCtrl.text.replaceAll(',', '.')) ?? 0;
    final cambio = (_forma == 'efectivo') ? (monto - widget.total) : 0;

    return Padding(
      padding: MediaQuery.of(context).viewInsets.add(const EdgeInsets.all(16)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Cobro',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text('Forma de pago:'),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _forma,
                items: const [
                  DropdownMenuItem(value: 'efectivo', child: Text('Efectivo')),
                  DropdownMenuItem(value: 'tarjeta', child: Text('Tarjeta')),
                  DropdownMenuItem(value: 'otro', child: Text('Otro')),
                ],
                onChanged: (v) => setState(() => _forma = v ?? 'efectivo'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _montoCtrl,
            keyboardType: const TextInputType.numberWithOptions(
              decimal: true,
              signed: false,
            ),
            decoration: const InputDecoration(
              labelText: 'Monto recibido',
              prefixIcon: Icon(Icons.payments_outlined),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          if (_forma == 'efectivo')
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                cambio >= 0
                    ? 'Cambio: ${fmt.format(cambio)}'
                    : 'Faltan: ${fmt.format(-cambio)}',
                style: TextStyle(
                  color: cambio >= 0 ? Colors.green : Colors.red,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {
                final m =
                    double.tryParse(_montoCtrl.text.replaceAll(',', '.')) ?? 0;
                Navigator.pop(context, PagoData(_forma, m));
              },
              child: Text('Confirmar cobro (${fmt.format(widget.total)})'),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

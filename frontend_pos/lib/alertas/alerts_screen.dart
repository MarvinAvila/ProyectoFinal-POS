// lib/alertas/alerts_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';
import 'alert_model.dart';

/// Estado + lógica con Provider
class AlertsController extends ChangeNotifier {
  final _dateFmt = DateFormat('dd MMM yyyy, HH:mm');

  List<AlertItem> _items = [];
  String? _error;
  bool _loading = false;
  bool _onlyPending = true;

  final _api = ApiClient(); // ✅ Usar el cliente centralizado

  List<AlertItem> get items =>
      _onlyPending ? _items.where((e) => !e.attended).toList() : _items;

  String? get error => _error;
  bool get loading => _loading;
  bool get onlyPending => _onlyPending;

  String formatDate(DateTime d) => _dateFmt.format(d);

  Future<void> init() async {
    await refresh();
  }

  Future<void> refresh() async {
    _error = null;
    _loading = true;
    notifyListeners();

    try {
      // ✅ Petición simplificada. ApiClient maneja URL y token.
      final endpoint =
          _onlyPending ? '${Endpoints.alertas}/pendientes' : Endpoints.alertas;
      final data = await _api.get(endpoint);
      // El backend devuelve { alertas: [...] } dentro de la clave 'data'
      final list = asList(asMap(data)['alertas']);
      _items = list.map((e) => AlertItem.fromJson(asMap(e))).toList();
    } on ApiError catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void toggleFilter() async {
    _onlyPending = !_onlyPending;
    await refresh(); // 🔹 recarga datos al cambiar filtro
  }

  Future<void> markAsAttended(AlertItem a) async {
    try {
      // ✅ Tu backend espera un PATCH a /alertas/:id/atendida
      await _api.put('${Endpoints.alertas}/${a.id}/atendida');
      _items =
          _items
              .map((x) => x.id == a.id ? x.copyWith(attended: true) : x)
              .toList();
      notifyListeners();
    } on ApiError catch (e) {
      _error = 'No se pudo marcar como atendida: $e';
      notifyListeners();
    }
  }

  Future<void> deleteAlert(AlertItem a) async {
    try {
      await _api.delete('${Endpoints.alertas}/${a.id}');
      _items.removeWhere((x) => x.id == a.id);
      notifyListeners();
    } on ApiError catch (e) {
      _error = 'No se pudo eliminar: $e';
      notifyListeners();
    }
  }
}

/// Pantalla pública
class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AlertsController()..init(),
      child: const _AlertsView(),
    );
  }
}

class _AlertsView extends StatefulWidget {
  const _AlertsView();

  @override
  State<_AlertsView> createState() => _AlertsViewState();
}

class _AlertsViewState extends State<_AlertsView> {
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    // 🔄 Refresco automático cada 20 s
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctrl = context.read<AlertsController>();
      _autoRefreshTimer = Timer.periodic(const Duration(seconds: 20), (_) {
        if (!ctrl.loading) ctrl.refresh();
      });
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<AlertsController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alertas'),
        actions: [
          IconButton(
            tooltip: ctrl.onlyPending ? 'Ver todas' : 'Ver pendientes',
            onPressed: ctrl.loading ? null : ctrl.toggleFilter,
            icon: Icon(
              ctrl.onlyPending ? Icons.filter_alt : Icons.filter_alt_off,
            ),
          ),
          IconButton(
            tooltip: 'Actualizar',
            onPressed: ctrl.loading ? null : ctrl.refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Builder(
        builder: (context) {
          if (ctrl.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (ctrl.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 40),
                    const SizedBox(height: 8),
                    Text('Error: ${ctrl.error}', textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: ctrl.refresh,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }
          final items = ctrl.items;
          if (items.isEmpty) {
            return const Center(child: Text('Sin alertas'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(8),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 6),
            itemBuilder: (context, i) {
              final a = items[i];
              final isCad = a.type == AlertType.caducidad;
              final leadingIcon = isCad ? Icons.timer_outlined : Icons.warning;

              return Dismissible(
                key: ValueKey('alert_${a.id}'),
                direction: DismissDirection.endToStart,
                background: Container(
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  color: Colors.red.withOpacity(0.1),
                  child: const Icon(Icons.delete_outline),
                ),
                confirmDismiss: (_) async {
                  final ok = await showDialog<bool>(
                    context: context,
                    builder:
                        (_) => AlertDialog(
                          title: const Text('Eliminar alerta'),
                          content: const Text('¿Deseas eliminar esta alerta?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context, false),
                              child: const Text('Cancelar'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(context, true),
                              child: const Text('Eliminar'),
                            ),
                          ],
                        ),
                  );
                  return ok ?? false;
                },
                onDismissed: (_) => ctrl.deleteAlert(a),
                child: Card(
                  child: ListTile(
                    leading: Icon(leadingIcon),
                    title: Text(a.message),
                    subtitle: Text(
                      [
                        alertTypeToText(a.type),
                        if (a.productName?.isNotEmpty == true)
                          '• ${a.productName}',
                        '• ${ctrl.formatDate(a.date)}',
                        if (a.productId != null) '• Prod #${a.productId}',
                      ].join(' '),
                    ),
                    trailing:
                        a.attended
                            ? const Icon(Icons.check_circle, color: Colors.teal)
                            : FilledButton.tonalIcon(
                              onPressed: () => ctrl.markAsAttended(a),
                              icon: const Icon(Icons.done),
                              label: const Text('Atender'),
                            ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

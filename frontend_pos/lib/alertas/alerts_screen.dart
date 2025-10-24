import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/core/env.dart';
import 'alert_model.dart';

/// ======================
/// CONTROLADOR DE ALERTAS
/// ======================
class AlertsController extends ChangeNotifier {
  final _api = ApiClient();
  final _dateFmt = DateFormat('dd MMM yyyy, HH:mm');

  List<AlertItem> _items = [];
  String? _error;
  bool _loading = false;

  List<AlertItem> get items => _items;
  String? get error => _error;
  bool get loading => _loading;

  String formatDate(DateTime d) => _dateFmt.format(d);

  Future<void> init() async {
    await refresh();
  }

  /// 🔄 Cargar solo alertas activas (vigentes)
  Future<void> refresh() async {
    _error = null;
    _loading = true;
    notifyListeners();

    try {
      // El backend ya debe filtrar solo las alertas vigentes (stock bajo actual)
      final data = await _api.get(Endpoints.alertas);
      final list = asList(asMap(data)['alertas']);
      _items = list.map((e) => AlertItem.fromJson(asMap(e))).toList();
    } on ApiError catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}

/// ======================
/// PANTALLA PRINCIPAL
/// ======================
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

/// ======================
/// VISTA DE ALERTAS
/// ======================
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
    // Refrescar cada 20 segundos
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
            return const Center(child: Text('Sin alertas activas'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(8),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 6),
            itemBuilder: (context, i) {
              final a = items[i];
              final isCad = a.type == AlertType.caducidad;
              final leadingIcon = isCad ? Icons.timer_outlined : Icons.warning;

              return Card(
                child: ListTile(
                  leading: Icon(
                    leadingIcon,
                    color: isCad ? Colors.orange : Colors.redAccent,
                  ),
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
                ),
              );
            },
          );
        },
      ),
    );
  }
}

// lib/alertas/alerts_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'alert_model.dart';

/// Lee la base de la API desde --dart-define
const String _kApiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'http://localhost:3000',
);

/// Cliente HTTP simple con token opcional (Bearer)
class _AlertsApi {
  final Dio _dio;

  _AlertsApi._(this._dio);

  static final _storage = const FlutterSecureStorage();

  static Future<_AlertsApi> create() async {
    final dio = Dio(
      BaseOptions(
        baseUrl: '$_kApiBase/api',
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    // Adjunta token si existe
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );

    return _AlertsApi._(dio);
  }

  Future<List<AlertItem>> fetchAlerts() async {
    final res = await _dio.get('/alertas');
    final data = res.data;

    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => AlertItem.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    if (data is List) {
      return data
          .map((e) => AlertItem.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    throw Exception('Formato de respuesta no reconocido para /alertas');
  }

  /// Marca una alerta como atendida (PATCH /alertas/:id { atendida: true })
  Future<void> markAsAttended(int id) async {
    await _dio.patch('/alertas/$id', data: {'atendida': true});
  }

  /// Elimina una alerta (si tu backend lo permite)
  Future<void> deleteAlert(int id) async {
    await _dio.delete('/alertas/$id');
  }
}

/// Estado + lógica con Provider
class AlertsController extends ChangeNotifier {
  final _dateFmt = DateFormat('dd MMM yyyy, HH:mm');

  List<AlertItem> _items = [];
  String? _error;
  bool _loading = false;
  bool _onlyPending = true;

  late final _AlertsApi _api;

  List<AlertItem> get items =>
      _onlyPending ? _items.where((e) => !e.attended).toList() : _items;

  String? get error => _error;
  bool get loading => _loading;
  bool get onlyPending => _onlyPending;

  String formatDate(DateTime d) => _dateFmt.format(d);

  Future<void> init() async {
    _api = await _AlertsApi.create();
    await refresh();
  }

  Future<void> refresh() async {
    _error = null;
    _loading = true;
    notifyListeners();

    try {
      _items = await _api.fetchAlerts();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void toggleFilter() {
    _onlyPending = !_onlyPending;
    notifyListeners();
  }

  Future<void> markAsAttended(AlertItem a) async {
    try {
      await _api.markAsAttended(a.id);
      _items =
          _items
              .map((x) => x.id == a.id ? x.copyWith(attended: true) : x)
              .toList();
      notifyListeners();
    } catch (e) {
      _error = 'No se pudo marcar como atendida: $e';
      notifyListeners();
    }
  }

  Future<void> deleteAlert(AlertItem a) async {
    try {
      await _api.deleteAlert(a.id);
      _items.removeWhere((x) => x.id == a.id);
      notifyListeners();
    } catch (e) {
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
  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<AlertsController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alertas'),
        actions: [
          IconButton(
            tooltip: ctrl.onlyPending ? 'Ver todas' : 'Ver pendientes',
            onPressed: ctrl.toggleFilter,
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

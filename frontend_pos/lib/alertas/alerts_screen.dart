import 'dart:async';
import 'dart:ui';
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
      final data = await _api.get(Endpoints.alertasPendientes);
      final rawResponse = asMap(data);
      final rawAlertsList = rawResponse['alertas'];
      final list = asList(rawAlertsList);
      _items = list.map((e) => AlertItem.fromJson(asMap(e))).toList();
    } on ApiError catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// ✅ Marcar una alerta como atendida
  Future<bool> marcarAtendida(int id) async {
    _loading = true;
    notifyListeners();

    try {
      await _api.patch('${Endpoints.alertas}/$id/atendida', data: {});
      _items.removeWhere((item) => item.id == id);
      return true;
    } on ApiError catch (e) {
      _error = 'Error al marcar como atendida: ${e.message}';
      return false;
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
      // 🌌 Fondo azul con degradado
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0A0E21), // azul noche
              Color(0xFF0F172A), // marino oscuro
              Color(0xFF1E293B), // gris azulado
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 💎 AppBar tipo glass con botón de regreso y refresh
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(16),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                  child: Container(
                    height: kToolbarHeight,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.06),
                      border: Border(
                        bottom: BorderSide(
                          color: Colors.white.withOpacity(0.15),
                          width: 0.6,
                        ),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // 🔙 Botón de regreso
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: Colors.white,
                          ),
                          tooltip: 'Regresar',
                          onPressed: () => Navigator.pop(context),
                        ),
                        const Text(
                          'Alertas',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 20,
                          ),
                        ),
                        IconButton(
                          tooltip: 'Actualizar',
                          onPressed: ctrl.loading ? null : ctrl.refresh,
                          icon: const Icon(Icons.refresh, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // 📋 Contenido de alertas
              Expanded(
                child: Builder(
                  builder: (context) {
                    if (ctrl.loading) {
                      return const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      );
                    }

                    if (ctrl.error != null) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.error_outline,
                                size: 40,
                                color: Colors.white70,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Error: ${ctrl.error}',
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.white),
                              ),
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
                      return const Center(
                        child: Text(
                          'Sin alertas activas',
                          style: TextStyle(color: Colors.white70),
                        ),
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.all(8),
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 6),
                      itemBuilder: (context, i) {
                        final a = items[i];
                        final isCad = a.type == AlertType.caducidad;
                        final leadingIcon =
                            isCad ? Icons.timer_outlined : Icons.warning;

                        return Opacity(
                          opacity: a.attended ? 0.5 : 1.0,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: BackdropFilter(
                              filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      Colors.white.withOpacity(0.1),
                                      Colors.white.withOpacity(0.03),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: Colors.white.withOpacity(0.15),
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.25),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ListTile(
                                  leading: Icon(
                                    leadingIcon,
                                    color:
                                        isCad
                                            ? Colors.orangeAccent
                                            : Colors.redAccent,
                                  ),
                                  title: Text(
                                    a.message,
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                  subtitle: Text(
                                    [
                                      alertTypeToText(a.type),
                                      '• ${ctrl.formatDate(a.date)}',
                                      if (a.productId != null)
                                        '• Prod #${a.productId}',
                                    ].join(' '),
                                    style: const TextStyle(
                                      color: Colors.white70,
                                    ),
                                  ),
                                  trailing:
                                      a.attended
                                          ? const Icon(
                                            Icons.check_circle,
                                            color: Colors.greenAccent,
                                          )
                                          : TextButton(
                                            onPressed: () async {
                                              final success = await ctrl
                                                  .marcarAtendida(a.id);
                                              if (success && context.mounted) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'Alerta atendida',
                                                    ),
                                                  ),
                                                );
                                              }
                                            },
                                            child: const Text(
                                              'Atender',
                                              style: TextStyle(
                                                color: Color(0xFFB388FF),
                                              ),
                                            ),
                                          ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

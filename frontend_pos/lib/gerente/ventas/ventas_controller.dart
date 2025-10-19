import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import '../../admin/ventas/ventas_service.dart'; // ✅ ruta correcta

class VentasGerenteController extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  late final VentasService _service;

  bool loading = true;
  String? error;
  double totalVentas = 0.0;

  VentasGerenteController() {
    _initService();
  }

  Future<void> _initService() async {
    final token = await _storage.read(key: 'token');
    _service = VentasService(
      baseUrl: 'http://192.168.1.67:3000/api', // tu IP o dominio
      token: token ?? '',
    );
  }

  Future<void> cargarTotal() async {
    try {
      loading = true;
      notifyListeners();

      final data = await _service.estadisticas();
      totalVentas =
          double.tryParse(
            data['general']?['ingresos_totales']?.toString() ?? '0',
          ) ??
          0.0;
      error = null;
    } catch (e) {
      error = 'Error cargando total: $e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  String get totalFormateado =>
      NumberFormat.currency(locale: 'es_MX', symbol: '\$').format(totalVentas);
}

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/http.dart'; // ✅ Importar ApiClient y ApiError
import '../../core/env.dart'; // ✅ Importar Endpoints

class VentasGerenteController extends ChangeNotifier {
  final _api = ApiClient(); // ✅ Usar el cliente centralizado

  bool loading = true;
  String? error;
  double totalVentas = 0.0;

  Future<void> cargarTotal() async {
    try {
      loading = true;
      error = null;
      notifyListeners();

      // ✅ Petición simplificada. ApiClient maneja URL y token.
      final data = await _api.get(Endpoints.ventas); // Asumiendo que /ventas devuelve las estadísticas
      totalVentas =
          double.tryParse(
            asMap(data)['general']?['ingresos_totales']?.toString() ?? '0',
          ) ??
          0.0;
    } on ApiError catch (e) {
      error = 'Error cargando total: $e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  String get totalFormateado =>
      NumberFormat.currency(locale: 'es_MX', symbol: '\$').format(totalVentas);
}

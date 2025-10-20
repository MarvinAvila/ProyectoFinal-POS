import 'package:frontend_pos/dueno/dashboard/dueno_service.dart';

class DuenoController {
  Map<String, dynamic>? dashboardData;
  bool cargando = false;
  String? error;

  Future<void> cargarDashboard() async {
    try {
      cargando = true;
      dashboardData = await DuenoService.fetchSummary();
      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      cargando = false;
    }
  }
}

import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_charts/charts.dart';
import 'package:intl/intl.dart';
import '../dashboard_repository.dart';

class DashboardChart extends StatelessWidget {
  final List<SalesPoint> data;
  final String title;
  final Color color;

  const DashboardChart({
    super.key,
    required this.data,
    required this.title,
    this.color = Colors.deepPurple,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF5D3A9B),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 300, // ✅ Altura fija para evitar error de constraints
              child: SfCartesianChart(
                backgroundColor: Colors.white,
                plotAreaBorderWidth: 0,
                tooltipBehavior: TooltipBehavior(enable: true),
                zoomPanBehavior: ZoomPanBehavior(
                  enablePinching: true,
                  enablePanning: true,
                ),
                primaryXAxis: DateTimeAxis(
                  title: AxisTitle(text: 'Fecha'),
                  dateFormat: DateFormat.Md(),
                  majorGridLines: const MajorGridLines(width: 0),
                ),
                primaryYAxis: NumericAxis(
                  title: AxisTitle(text: 'Ingresos'),
                  majorGridLines: MajorGridLines(
                    color: Colors.grey.withOpacity(0.2),
                  ),
                ),
                series: <CartesianSeries<SalesPoint, DateTime>>[
                  LineSeries<SalesPoint, DateTime>(
                    dataSource: data,
                    xValueMapper: (SalesPoint e, _) => e.fecha,
                    yValueMapper: (SalesPoint e, _) => e.ingresos,
                    color: color,
                    width: 3,
                    markerSettings: const MarkerSettings(
                      isVisible: true,
                      shape: DataMarkerType.circle,
                      width: 6,
                      height: 6,
                    ),
                    dataLabelSettings: const DataLabelSettings(
                      isVisible: false,
                    ),
                    name: 'Ventas',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

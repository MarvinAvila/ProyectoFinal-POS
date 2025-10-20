import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dueno_repository.dart';

class CrecimientoMensualChart extends StatelessWidget {
  final List<CrecimientoMensual> datos;

  const CrecimientoMensualChart({super.key, required this.datos});

  @override
  Widget build(BuildContext context) {
    if (datos.isEmpty) {
      return const Center(
        child: Text(
          "📉 Sin datos de crecimiento disponibles",
          style: TextStyle(color: Colors.grey),
        ),
      );
    }

    final maxIngreso = datos
        .map((e) => e.ingresos)
        .reduce((a, b) => a > b ? a : b);
    final minIngreso = datos
        .map((e) => e.ingresos)
        .reduce((a, b) => a < b ? a : b);
    final currency = NumberFormat.simpleCurrency(locale: 'es_MX');

    return Padding(
      padding: const EdgeInsets.all(12),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(show: true, drawVerticalLine: false),
          borderData: FlBorderData(show: true),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 60,
                getTitlesWidget: (value, meta) {
                  return Text(
                    currency.format(value),
                    style: const TextStyle(fontSize: 10, color: Colors.purple),
                  );
                },
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final i = value.toInt();
                  if (i >= 0 && i < datos.length) {
                    return Text(
                      datos[i].mes,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Colors.purple,
                      ),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
          ),
          minY: minIngreso * 0.8,
          maxY: maxIngreso * 1.2,
          lineBarsData: [
            LineChartBarData(
              isCurved: true,
              color: Colors.deepPurple,
              barWidth: 3,
              dotData: FlDotData(show: true),
              belowBarData: BarAreaData(
                show: true,
                color: Colors.deepPurpleAccent.withOpacity(0.2),
              ),
              spots: List.generate(datos.length, (i) {
                return FlSpot(i.toDouble(), datos[i].ingresos);
              }),
            ),
          ],
        ),
      ),
    );
  }
}

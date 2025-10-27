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
          style: TextStyle(color: Colors.white60),
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
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            getDrawingHorizontalLine:
                (value) => FlLine(
                  color: Colors.white.withOpacity(0.15),
                  strokeWidth: 1,
                ),
          ),
          borderData: FlBorderData(
            show: true,
            border: Border.all(color: Colors.white24, width: 1),
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 60,
                getTitlesWidget: (value, meta) {
                  return Text(
                    currency.format(value),
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF80D8FF), // azul cielo claro
                    ),
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
                        color: Color(0xFF82B1FF), // azul-violeta neón
                        fontWeight: FontWeight.bold,
                      ),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          minY: minIngreso * 0.8,
          maxY: maxIngreso * 1.2,
          lineBarsData: [
            LineChartBarData(
              isCurved: true,
              barWidth: 4,
              dotData: FlDotData(
                show: true,
                getDotPainter:
                    (spot, _, __, ___) => FlDotCirclePainter(
                      radius: 5,
                      color: const Color(0xFF00E5FF), // cian brillante
                      strokeWidth: 2,
                      strokeColor: Colors.white,
                    ),
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF00B0FF).withOpacity(0.35),
                    const Color(0xFF311B92).withOpacity(0.1),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF00E5FF), // cian
                  Color(0xFF82B1FF), // azul claro
                ],
              ),
              spots: List.generate(
                datos.length,
                (i) => FlSpot(i.toDouble(), datos[i].ingresos),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

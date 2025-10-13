import 'package:flutter/material.dart';

class DashboardTable extends StatelessWidget {
  final String title;
  final List<Map<String, dynamic>> data;
  final List<String> columns;

  const DashboardTable({
    super.key,
    required this.title,
    required this.data,
    required this.columns,
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
            const SizedBox(height: 12),
            Expanded(
              child: SingleChildScrollView(
                child: DataTable(
                  columns: [
                    for (var c in columns)
                      DataColumn(
                        label: Text(
                          c,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                  rows:
                      data
                          .map(
                            (e) => DataRow(
                              cells:
                                  columns
                                      .map((c) => DataCell(Text('${e[c]}')))
                                      .toList(),
                            ),
                          )
                          .toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

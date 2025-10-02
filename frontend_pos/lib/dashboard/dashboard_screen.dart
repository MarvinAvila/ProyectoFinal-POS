// lib/dashboard/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend_pos/core/http.dart' show ApiError;
import 'dashboard_repository.dart';
import 'package:frontend_pos/core/widgets.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final repo = DashboardRepository();
  late Future<_DashboardBundle> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_DashboardBundle> _load() async {
    final summary = await repo.fetchSummary();
    final top = await repo.fetchTopProductos(limit: 5);
    return _DashboardBundle(summary, top);
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: FutureBuilder<_DashboardBundle>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const AppLoader(text: 'Cargando dashboard...');
          }
          if (snap.hasError) {
            final msg =
                (snap.error is ApiError)
                    ? (snap.error as ApiError).message
                    : snap.error.toString();
            return ErrorView(message: msg, onRetry: _refresh);
          }
          final data = snap.data!;
          final s = data.summary;

          return RefreshIndicator(
            onRefresh: _refresh,
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverGrid(
                    delegate: SliverChildListDelegate.fixed([
                      _StatCard(
                        title: 'Ventas hoy',
                        value: currency.format(s.ventasHoy),
                        icon: Icons.point_of_sale,
                      ),
                      _StatCard(
                        title: 'Ventas mes',
                        value: currency.format(s.ventasMes),
                        icon: Icons.calendar_month,
                      ),
                      _StatCard(
                        title: 'Tickets hoy',
                        value: '${s.totalVentasHoy}',
                        icon: Icons.receipt_long,
                      ),
                      _StatCard(
                        title: 'Productos',
                        value: '${s.totalProductos}',
                        icon: Icons.inventory_2_outlined,
                      ),
                      _StatCard(
                        title: 'Categorías',
                        value: '${s.totalCategorias}',
                        icon: Icons.category_outlined,
                      ),
                      _StatCard(
                        title: 'Proveedores',
                        value: '${s.totalProveedores}',
                        icon: Icons.local_shipping_outlined,
                      ),
                      _StatCard(
                        title: 'Usuarios',
                        value: '${s.totalUsuarios}',
                        icon: Icons.group_outlined,
                      ),
                      _StatCard(
                        title: 'Alertas',
                        value: '${s.alertasPendientes}',
                        icon: Icons.warning_amber_rounded,
                      ),
                    ]),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.6,
                        ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Text(
                      'Top productos',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                ),
                if (data.top.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyView(message: 'Sin datos de top productos'),
                  )
                else
                  SliverList.builder(
                    itemCount: data.top.length,
                    itemBuilder: (context, i) {
                      final p = data.top[i];
                      return ListTile(
                        leading: CircleAvatar(child: Text('${i + 1}')),
                        title: Text(p.nombre),
                        subtitle: Text('Vendidos: ${p.vendidos}'),
                        trailing: Text(currency.format(p.total)),
                      );
                    },
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _DashboardBundle {
  final DashboardSummary summary;
  final List<TopProducto> top;
  _DashboardBundle(this.summary, this.top);
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primaryContainer;
    final fg = Theme.of(context).colorScheme.onPrimaryContainer;

    return Card(
      elevation: 1.5,
      color: color,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: fg),
            const Spacer(),
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.labelLarge?.copyWith(color: fg),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: fg,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// src/services/dashboardService.js

const dashboardRepository = require("../repositories/dashboardRepository");
const Producto = require("../models/Producto");
const Venta = require("../models/Venta");
const Alerta = require("../models/Alerta");

/**
 * Lógica de negocio para el Dashboard.
 * Combina datos de múltiples llamadas al repositorio y los transforma.
 */
const dashboardService = {

  async getResumenCompleto() {
    // MODIFICACIÓN: Ejecutar consultas secuencialmente para no saturar la BD
    const ventasHoy = await dashboardRepository.getVentasHoyStats();
    const totalProductos = await dashboardRepository.getTotalProductos();
    const totalUsuarios = await dashboardRepository.getTotalUsuariosActivos();
    const ventasMes = await dashboardRepository.getVentasMesStats();
    const alertasPendientes =
      await dashboardRepository.getTotalAlertasPendientes();
    const totalCategorias = await dashboardRepository.getTotalCategorias();
    const totalProveedores = await dashboardRepository.getTotalProveedores();
    const ventasRecientesRaw = await dashboardRepository.getVentasRecientes();
    const productosPopularesRaw =
      await dashboardRepository.getProductosPopulares("7 days");
    const productosRentablesRaw =
      await dashboardRepository.getProductosRentables("30 days");
    const ventasPorEmpleadoRaw = await dashboardRepository.getVentasPorEmpleado(
      "30 days"
    );
    const distribucionInventarioRaw =
      await dashboardRepository.getDistribucionInventario();
    const alertasRecientesRaw = await dashboardRepository.getAlertasRecientes();
    const ventasPorDiaRaw = await dashboardRepository.getVentasUltimaSemana();
    const crecimientoMensualRaw =
      await dashboardRepository.getCrecimientoMensual();

    // Transformar datos (Este bloque se mantiene igual, asumiendo que ya agregaste .toJSON() a tus modelos)
    const estadisticasBasicas = {
      ventas_hoy: {
        total: parseInt(ventasHoy.total_ventas) || 0,
        ingresos: parseFloat(ventasHoy.ingresos_totales) || 0,
        promedio: parseFloat(ventasHoy.promedio_venta) || 0,
        maxima: parseFloat(ventasHoy.venta_maxima) || 0,
      },
      total_productos: parseInt(totalProductos.total) || 0,
      total_usuarios: parseInt(totalUsuarios.total) || 0,
      ventas_mes: {
        total: parseInt(ventasMes.total) || 0,
        ingresos: parseFloat(ventasMes.ingresos) || 0,
      },
      alertas_pendientes: parseInt(alertasPendientes.total) || 0,
      total_categorias: parseInt(totalCategorias.total) || 0,
      total_proveedores: parseInt(totalProveedores.total) || 0,
    };

    const ventasRecientes = ventasRecientesRaw.map((row) =>
      Venta.fromDatabaseRow(row).toJSON()
    );

    const productosPopulares = productosPopularesRaw.map((row) => ({
      ...Producto.fromDatabaseRow(row).toJSON(),
      total_vendido: parseInt(row.total_vendido) || 0,
    }));

    const productosRentables = productosRentablesRaw.map((row) => ({
      ...row,
      cantidad_vendida: parseInt(row.cantidad_vendida) || 0,
      ingresos: parseFloat(row.ingresos) || 0,
      costos: parseFloat(row.costos) || 0,
      ganancia: parseFloat(row.ganancia) || 0,
    }));

    const ventasPorEmpleado = ventasPorEmpleadoRaw.map((row) => ({
      ...row,
      total_ventas: parseInt(row.total_ventas) || 0,
      ingresos_generados: parseFloat(row.ingresos_generados) || 0,
    }));

    const distribucionInventario = distribucionInventarioRaw.map((row) => ({
      ...row,
      total_productos: parseInt(row.total_productos) || 0,
      total_stock: parseFloat(row.total_stock) || 0,
      valor_inventario: parseFloat(row.valor_inventario) || 0,
    }));

    const alertasRecientes = alertasRecientesRaw.map((row) =>
      Alerta.fromDatabaseRow(row).toJSON()
    );

    const ventasPorDia = ventasPorDiaRaw.map((row) => ({
      ...row,
      total_ventas: parseInt(row.total_ventas) || 0,
      ingresos: parseFloat(row.ingresos_diarios) || 0,
    }));

    const crecimientoMensual = crecimientoMensualRaw.map((row) => ({
      ...row,
      ingresos: parseFloat(row.ingresos) || 0,
    }));

    // Ensamblar respuesta final
    return {
      estadisticas: estadisticasBasicas,
      ventas_recientes: ventasRecientes,
      productos_populares: productosPopulares,
      productos_rentables: productosRentables,
      ventas_por_empleado: ventasPorEmpleado,
      distribucion_inventario: distribucionInventario,
      alertas_recientes: alertasRecientes,
      ventas_ultima_semana: ventasPorDia,
      crecimiento_mensual: crecimientoMensual,
      timestamp: new Date().toISOString(),
    };
  },
  async getMetricasRapidas() {
    const [ventasHoy, alertasPendientes, stockBajo, ingresosMes] =
      await Promise.all([
        dashboardRepository.getVentasHoyStats(),
        dashboardRepository.getTotalAlertasPendientes(),
        dashboardRepository.getProductosStockBajoCount(),
        dashboardRepository.getIngresosMes(),
      ]);

    return {
      ventas_hoy: {
        total: parseInt(ventasHoy.total_ventas) || 0,
        ingresos: parseFloat(ventasHoy.ingresos_totales) || 0,
      },
      alertas_pendientes: parseInt(alertasPendientes.total) || 0,
      productos_stock_bajo: parseInt(stockBajo.total) || 0,
      ingresos_mes_actual: parseFloat(ingresosMes.ingresos) || 0,
      ultima_actualizacion: new Date().toISOString(),
    };
  },

  async getEstadisticasAvanzadas(queryParams) {
    const { periodo = "7d" } = queryParams;
    const interval = _getInterval(periodo);

    const [ventasPeriodo, topProductos, metricasEficiencia, horariosPico] =
      await Promise.all([
        dashboardRepository.getVentasPorDiaPeriodo(interval),
        dashboardRepository.getTopProductosPeriodo(interval),
        dashboardRepository.getMetricasEficiencia(interval),
        dashboardRepository.getHorariosPico(interval),
      ]);

    const estadisticasAvanzadas = {
      periodo: periodo,
      intervalo: interval,
      ventas_por_dia: ventasPeriodo.map((row) => ({
        fecha: row.fecha,
        total_ventas: parseInt(row.total_ventas) || 0,
        ingresos: parseFloat(row.ingresos) || 0,
        promedio_venta: parseFloat(row.promedio_venta) || 0,
      })),
      top_productos: topProductos.map((row) => ({
        ...row,
        total_vendido: parseFloat(row.total_vendido) || 0,
        ingresos_generados: parseFloat(row.ingresos_generados) || 0,
        veces_vendido: parseInt(row.veces_vendido) || 0,
      })),
      metricas_eficiencia: {
        tasa_conversion: parseFloat(metricasEficiencia.tasa_conversion) || 0,
        ticket_promedio: parseFloat(metricasEficiencia.ticket_promedio) || 0,
        frecuencia_compra:
          parseFloat(metricasEficiencia.frecuencia_compra) || 0,
      },
      horarios_pico: horariosPico.map((row) => ({
        hora: parseInt(row.hora) || 0,
        total_ventas: parseInt(row.total_ventas) || 0,
        ingresos: parseFloat(row.ingresos) || 0,
      })),
    };

    // Calcular resumen
    estadisticasAvanzadas.resumen = {
      total_dias: estadisticasAvanzadas.ventas_por_dia.length,
      ventas_totales: estadisticasAvanzadas.ventas_por_dia.reduce(
        (sum, v) => sum + v.total_ventas,
        0
      ),
      ingresos_totales: estadisticasAvanzadas.ventas_por_dia.reduce(
        (sum, v) => sum + v.ingresos,
        0
      ),
    };

    return estadisticasAvanzadas;
  },

  async getAlertasDashboard() {
    const alertasRaw = await dashboardRepository.getAlertasDashboard();
    const alertas = alertasRaw.map((row) => Alerta.fromDatabaseRow(row));

    // Clasificar alertas (usando lógica del modelo si existe)
    const alertasClasificadas = {
      alta: alertas.filter((a) =>
        a.getPrioridad ? a.getPrioridad() === "ALTA" : a.tipo === "caducidad"
      ),
      media: alertas.filter((a) =>
        a.getPrioridad ? a.getPrioridad() === "MEDIA" : a.tipo === "stock_bajo"
      ),
      total: alertas.length,
    };

    return {
      alertas: alertasClasificadas,
      total: alertas.length,
      timestamp: new Date().toISOString(),
    };
  },

  async getDatosVentas(queryParams) {
    const {
      tipo_grafico = "lineas",
      periodo = "7d",
      agrupar_por = "dia",
    } = queryParams;
    const interval = _getInterval(periodo);
    const groupByClause = _getGroupByClause(agrupar_por);

    const [ventasResult, metodosPagoResult, ventasPorCategoriaResult] =
      await Promise.all([
        dashboardRepository.getVentasPorPeriodoAgrupado(
          interval,
          groupByClause
        ),
        dashboardRepository.getMetodosPago(interval),
        dashboardRepository.getVentasPorCategoria(interval),
      ]);

    const resumen = {
      total_ventas: ventasResult.reduce(
        (sum, v) => sum + parseInt(v.total_ventas),
        0
      ),
      ingresos_totales: ventasResult.reduce(
        (sum, v) => sum + parseFloat(v.ingresos),
        0
      ),
      ticket_promedio:
        ventasResult.reduce((sum, v) => sum + parseFloat(v.promedio_venta), 0) /
        (ventasResult.length || 1),
    };

    const metodos_pago = metodosPagoResult.map((row) => ({
      metodo: row.forma_pago,
      total_ventas: parseInt(row.total_ventas) || 0,
      ingresos: parseFloat(row.ingresos) || 0,
      porcentaje:
        resumen.ingresos_totales > 0
          ? (parseFloat(row.ingresos) / resumen.ingresos_totales) * 100
          : 0,
    }));

    return {
      configuracion: { tipo_grafico, periodo, agrupar_por },
      ventas_por_periodo: ventasResult.map((row) => ({
        periodo: row.periodo,
        total_ventas: parseInt(row.total_ventas) || 0,
        ingresos: parseFloat(row.ingresos) || 0,
        promedio_venta: parseFloat(row.promedio_venta) || 0,
        usuarios_unicos: parseInt(row.usuarios_unicos) || 0,
      })),
      metodos_pago: metodos_pago,
      ventas_por_categoria: ventasPorCategoriaResult.map((row) => ({
        categoria: row.categoria || "Sin categoría",
        total_ventas: parseInt(row.total_ventas) || 0,
        ingresos: parseFloat(row.ingresos) || 0,
        total_productos: parseInt(row.total_productos_vendidos) || 0,
      })),
      resumen: resumen,
    };
  },

  async getEstadoInventario() {
    const [
      inventarioStats,
      productosPorCategoria,
      productosValiososRaw,
      movimientosRecientes,
    ] = await Promise.all([
      dashboardRepository.getInventarioStats(),
      dashboardRepository.getProductosPorCategoriaStats(),
      dashboardRepository.getProductosValiosos(),
      dashboardRepository.getMovimientosInventarioRecientes(),
    ]);

    const estadisticas = {
      total_productos: parseInt(inventarioStats.total_productos) || 0,
      total_stock: parseFloat(inventarioStats.total_stock) || 0,
      valor_total: parseFloat(inventarioStats.valor_total) || 0,
      productos_agotados: parseInt(inventarioStats.productos_agotados) || 0,
      productos_stock_bajo: parseInt(inventarioStats.productos_stock_bajo) || 0,
      productos_por_caducar:
        parseInt(inventarioStats.productos_por_caducar) || 0,
    };

    return {
      estadisticas: estadisticas,
      por_categoria: productosPorCategoria.map((row) => ({
        categoria: row.categoria || "Sin categoría",
        total_productos: parseInt(row.total_productos) || 0,
        total_stock: parseFloat(row.total_stock) || 0,
        valor: parseFloat(row.valor_categoria) || 0,
      })),
      productos_valiosos: productosValiososRaw.map((row) => ({
        ...Producto.fromDatabaseRow(row).toJSON(),
        valor_inventario: parseFloat(row.valor_inventario) || 0,
        categoria_nombre: row.categoria_nombre,
      })),
      movimientos_recientes: movimientosRecientes.map((row) => ({
        ...row,
        total_movimientos: parseInt(row.total_movimientos) || 0,
        cantidad_total: parseFloat(row.cantidad_total) || 0,
      })),
      alertas: {
        necesita_atencion:
          estadisticas.productos_agotados +
          estadisticas.productos_stock_bajo +
          estadisticas.productos_por_caducar,
        nivel_riesgo: _calcularNivelRiesgoInventario(estadisticas),
      },
    };
  },

  async getMetricasFinancieras() {
    const [ingresosMensualesRaw, gastosMensualesRaw, margenGananciaRaw] =
      await Promise.all([
        dashboardRepository.getIngresosMensuales(),
        dashboardRepository.getGastosMensuales(),
        dashboardRepository.getMargenGananciaPorCategoria(),
      ]);

    const ingresos_mensuales = ingresosMensualesRaw.map((row) => {
      const gastos = _obtenerGastosParaMes(gastosMensualesRaw, row.mes);
      const ingresos = parseFloat(row.ingresos) || 0;
      return {
        mes: row.mes,
        total_ventas: parseInt(row.total_ventas) || 0,
        ingresos: ingresos,
        subtotal: parseFloat(row.subtotal) || 0,
        iva: parseFloat(row.iva) || 0,
        gastos: gastos,
        utilidad: ingresos - gastos,
      };
    });

    const margenes_ganancia = margenGananciaRaw.map((row) => ({
      categoria: row.categoria || "Sin categoría",
      ingresos: parseFloat(row.ingresos) || 0,
      costos: parseFloat(row.costos) || 0,
      margen_bruto:
        (parseFloat(row.ingresos) || 0) - (parseFloat(row.costos) || 0),
      margen_porcentaje: parseFloat(row.margen_porcentaje) || 0,
    }));

    return {
      ingresos_mensuales,
      margenes_ganancia,
      resumen: {
        ingresos_ultimo_mes: ingresos_mensuales[0]?.ingresos || 0,
        crecimiento_mensual: _calcularCrecimientoMensual(ingresos_mensuales),
        margen_promedio:
          margenes_ganancia.reduce(
            (sum, row) => sum + row.margen_porcentaje,
            0
          ) / (margenes_ganancia.length || 1),
        proyeccion_anual: _calcularProyeccionAnual(ingresos_mensuales),
      },
    };
  },

  async getEstadisticasUsuarios() {
    const [usuariosPorRol, actividadReciente] = await Promise.all([
      dashboardRepository.getUsuariosPorRol(),
      dashboardRepository.getActividadUsuarios(),
    ]);

    const resumen = {
      total_usuarios: usuariosPorRol.reduce(
        (sum, row) => sum + parseInt(row.total),
        0
      ),
      usuarios_activos: usuariosPorRol.reduce(
        (sum, row) => sum + parseInt(row.activos),
        0
      ),
      ventas_ultimo_mes: actividadReciente.reduce(
        (sum, row) => sum + parseInt(row.total_ventas),
        0
      ),
      ingresos_ultimo_mes: actividadReciente.reduce(
        (sum, row) => sum + parseFloat(row.ingresos_generados),
        0
      ),
    };

    return {
      por_rol: usuariosPorRol.map((row) => ({
        ...row,
        total: parseInt(row.total) || 0,
        activos: parseInt(row.activos) || 0,
        inactivos: parseInt(row.inactivos) || 0,
      })),
      actividad_reciente: actividadReciente.map((row) => ({
        ...row,
        total_ventas: parseInt(row.total_ventas) || 0,
        ingresos_generados: parseFloat(row.ingresos_generados) || 0,
        eficiencia:
          parseInt(row.total_ventas) > 0
            ? parseFloat(row.ingresos_generados) / parseInt(row.total_ventas)
            : 0,
      })),
      resumen: resumen,
    };
  },

  // --- Reportes Simples ---
  async getReporteVentasDiarias() {
    const ventasHoy = await dashboardRepository.getVentasHoyStats();
    return {
      fecha: new Date().toISOString().split("T")[0],
      total_ventas: parseInt(ventasHoy.total_ventas) || 0,
      ingresos_totales: parseFloat(ventasHoy.ingresos_totales) || 0,
      timestamp: new Date().toISOString(),
    };
  },

  async getReporteStock() {
    const stock = await dashboardRepository.getInventarioStats();
    return {
      total_productos: parseInt(stock.total_productos) || 0,
      productos_agotados: parseInt(stock.productos_agotados) || 0,
      productos_stock_bajo: parseInt(stock.productos_stock_bajo) || 0,
      valor_inventario: parseFloat(stock.valor_total) || 0,
      timestamp: new Date().toISOString(),
    };
  },

  async getReporteAlertas() {
    const alertas = await dashboardRepository.getReporteAlertas();
    return {
      alertas_por_tipo: alertas.map((row) => ({
        ...row,
        total: parseInt(row.total) || 0,
        pendientes: parseInt(row.pendientes) || 0,
      })),
      total_alertas: alertas.reduce((sum, row) => sum + parseInt(row.total), 0),
      alertas_pendientes: alertas.reduce(
        (sum, row) => sum + parseInt(row.pendientes),
        0
      ),
      timestamp: new Date().toISOString(),
    };
  },
};

// --- Funciones Helper Privadas ---

function _getInterval(periodo) {
  const intervalMap = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    ytd: "1 year",
  };
  return intervalMap[periodo] || "7 days";
}

function _getGroupByClause(agrupar_por) {
  switch (agrupar_por) {
    case "semana":
      return `DATE_TRUNC('week', fecha)`;
    case "mes":
      return `DATE_TRUNC('month', fecha)`;
    case "año":
      return `DATE_TRUNC('year', fecha)`;
    default:
      return `DATE(fecha)`;
  }
}

function _calcularNivelRiesgoInventario(estadisticas) {
  const productosProblema =
    (parseInt(estadisticas.productos_agotados) || 0) +
    (parseInt(estadisticas.productos_stock_bajo) || 0) +
    (parseInt(estadisticas.productos_por_caducar) || 0);

  const total_productos = parseInt(estadisticas.total_productos) || 0;
  if (total_productos === 0) return "MINIMO";

  const porcentajeProblema = (productosProblema / total_productos) * 100;
  if (porcentajeProblema > 20) return "ALTO";
  if (porcentajeProblema > 10) return "MEDIO";
  if (porcentajeProblema > 5) return "BAJO";
  return "MINIMO";
}

function _obtenerGastosParaMes(gastos, mes) {
  const gastoMes = gastos.find(
    (g) => new Date(g.mes).getTime() === new Date(mes).getTime()
  );
  return gastoMes ? parseFloat(gastoMes.gastos) : 0;
}

function _calcularCrecimientoMensual(ingresosMensuales) {
  if (ingresosMensuales.length < 2) return 0;
  const ingresoActual = ingresosMensuales[0].ingresos; // Ya son floats
  const ingresoAnterior = ingresosMensuales[1].ingresos;
  if (ingresoAnterior === 0) return ingresoActual > 0 ? 100 : 0;
  return ((ingresoActual - ingresoAnterior) / ingresoAnterior) * 100;
}

function _calcularProyeccionAnual(ingresosMensuales) {
  if (ingresosMensuales.length === 0) return 0;
  const ingresoPromedio =
    ingresosMensuales.reduce((sum, row) => sum + row.ingresos, 0) /
    ingresosMensuales.length;
  return ingresoPromedio * 12;
}

module.exports = dashboardService;

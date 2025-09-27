const db = require("../config/database");
const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const Producto = require("../models/Producto");
const Venta = require("../models/Venta");
const Alerta = require("../models/Alerta");
const Reporte = require("../models/Reporte");

const dashboardController = {
  async getResumenCompleto(req, res) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1. ESTADÍSTICAS BÁSICAS
      const [
        ventasHoyResult,
        totalProductosResult,
        totalUsuariosResult,
        totalVentasMesResult,
        alertasPendientesResult,
      ] = await Promise.all([
        client.query(`
                            SELECT 
                                COUNT(*) as total_ventas,
                                COALESCE(SUM(total), 0) as ingresos_totales,
                                COALESCE(AVG(total), 0) as promedio_venta,
                                MAX(total) as venta_maxima
                            FROM ventas 
                            WHERE DATE(fecha) = CURRENT_DATE
                        `),
        client.query("SELECT COUNT(*) as total FROM productos"),
        client.query(
          "SELECT COUNT(*) as total FROM usuarios WHERE activo = true"
        ),
        client.query(`
                            SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as ingresos
                            FROM ventas 
                            WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
                        `),
        client.query(
          "SELECT COUNT(*) as total FROM alertas WHERE atendida = FALSE"
        ),
      ]);

      const estadisticasBasicas = {
        ventas_hoy: {
          total: parseInt(ventasHoyResult.rows[0].total_ventas),
          ingresos: parseFloat(ventasHoyResult.rows[0].ingresos_totales),
          promedio: parseFloat(ventasHoyResult.rows[0].promedio_venta),
          maxima: parseFloat(ventasHoyResult.rows[0].venta_maxima),
        },
        total_productos: parseInt(totalProductosResult.rows[0].total),
        total_usuarios: parseInt(totalUsuariosResult.rows[0].total),
        ventas_mes: {
          total: parseInt(totalVentasMesResult.rows[0].total),
          ingresos: parseFloat(totalVentasMesResult.rows[0].ingresos),
        },
        alertas_pendientes: parseInt(alertasPendientesResult.rows[0].total),
      };

      // 2. VENTAS RECIENTES (últimas 5 ventas)
      const ventasRecientesResult = await client.query(`
                        SELECT v.*, u.nombre as usuario_nombre
                        FROM ventas v
                        LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                        ORDER BY v.fecha DESC
                        LIMIT 5
                    `);

      // ✅ USAR MODELO VENTA
      const ventasRecientes = ventasRecientesResult.rows.map((row) => {
        const venta = Venta.fromDatabaseRow(row);
        return venta.toJSON();
      });

      // 3. PRODUCTOS MÁS VENDIDOS (top 5)
      const productosPopularesResult = await client.query(`
                        SELECT p.*, SUM(dv.cantidad) as total_vendido
                        FROM productos p
                        LEFT JOIN detalle_venta dv ON p.id_producto = dv.id_producto
                        LEFT JOIN ventas v ON dv.id_venta = v.id_venta
                        WHERE v.fecha >= CURRENT_DATE - INTERVAL '7 days'
                        GROUP BY p.id_producto
                        ORDER BY total_vendido DESC NULLS LAST
                        LIMIT 5
                    `);

      // ✅ USAR MODELO PRODUCTO
      const productosPopulares = productosPopularesResult.rows.map((row) => {
        const producto = Producto.fromDatabaseRow(row);
        const productoEnriquecido = {
          ...(producto.toJSON ? producto.toJSON() : producto),
          total_vendido: parseInt(row.total_vendido) || 0,
          necesita_reposicion: producto.necesitaReposicion
            ? producto.necesitaReposicion()
            : false,
          por_caducar: producto.estaPorCaducar
            ? producto.estaPorCaducar()
            : false,
        };
        return productoEnriquecido;
      });

      // 4. ALERTAS RECIENTES
      const alertasRecientesResult = await client.query(`
                        SELECT a.*, p.nombre as producto_nombre, p.stock
                        FROM alertas a
                        JOIN productos p ON a.id_producto = p.id_producto
                        WHERE a.atendida = FALSE
                        ORDER BY a.fecha DESC
                        LIMIT 10
                    `);

      // ✅ USAR MODELO ALERTA
      const alertasRecientes = alertasRecientesResult.rows.map((row) => {
        const alerta = Alerta.fromDatabaseRow(row);
        return alerta.toJSON ? alerta.toJSON() : alerta;
      });

      // 5. ESTADÍSTICAS DE VENTAS POR DÍA (últimos 7 días)
      const ventasUltimaSemanaResult = await client.query(`
                        SELECT 
                            DATE(fecha) as fecha,
                            COUNT(*) as total_ventas,
                            COALESCE(SUM(total), 0) as ingresos_diarios
                        FROM ventas
                        WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
                        GROUP BY DATE(fecha)
                        ORDER BY fecha ASC
                    `);

      const ventasPorDia = ventasUltimaSemanaResult.rows.map((row) => ({
        fecha: row.fecha,
        total_ventas: parseInt(row.total_ventas),
        ingresos: parseFloat(row.ingresos_diarios),
      }));

      // 6. PRODUCTOS CON STOCK BAJO
      const stockBajoResult = await client.query(`
                        SELECT p.*, c.nombre as categoria_nombre
                        FROM productos p
                        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                        WHERE p.stock <= 5
                        ORDER BY p.stock ASC
                        LIMIT 10
                    `);

      const productosStockBajo = stockBajoResult.rows.map((row) => {
        const producto = Producto.fromDatabaseRow(row);
        return {
          ...(producto.toJSON ? producto.toJSON() : producto),
          categoria_nombre: row.categoria_nombre,
          estado: producto.stock === 0 ? "AGOTADO" : "STOCK BAJO",
        };
      });

      // 7. REPORTES RECIENTES
      const reportesRecientesResult = await client.query(`
                        SELECT r.*, u.nombre as usuario_nombre
                        FROM reportes r
                        LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
                        ORDER BY r.fecha_generado DESC
                        LIMIT 5
                    `);

      // ✅ USAR MODELO REPORTE
      const reportesRecientes = reportesRecientesResult.rows.map((row) => {
        const reporte = Reporte.fromDatabaseRow(row);
        return reporte.toJSON ? reporte.toJSON(false) : reporte; // No incluir contenido pesado
      });

      await client.query("COMMIT");

      // 8. CÁLCULOS ADICIONALES
      const tendenciaVentas = this.calcularTendenciaVentas(ventasPorDia);
      const metricasAdicionales =
        this.calcularMetricasAdicionales(estadisticasBasicas);

      const resumenCompleto = {
        estadisticas: {
          ...estadisticasBasicas,
          ...metricasAdicionales,
          tendencia_ventas: tendenciaVentas,
        },
        ventas_recientes: ventasRecientes,
        productos_populares: productosPopulares,
        alertas_recientes: alertasRecientes,
        productos_stock_bajo: productosStockBajo,
        reportes_recientes: reportesRecientes,
        ventas_ultima_semana: ventasPorDia,
        timestamp: new Date().toISOString(),
      };

      logger.api("Dashboard completo generado", {
        usuario: req.user?.id_usuario,
        estadisticas: {
          ventas_hoy: estadisticasBasicas.ventas_hoy.total,
          alertas_pendientes: estadisticasBasicas.alertas_pendientes,
          productos_stock_bajo: productosStockBajo.length,
        },
      });

      return responseHelper.success(
        res,
        resumenCompleto,
        "Dashboard generado exitosamente"
      );
    } catch (error) {
      await client.query("ROLLBACK");

      logger.error("Error en dashboardController.getResumenCompleto", {
        error: error.message,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(res, "Error generando dashboard", 500, error);
    } finally {
      client.release();
    }
  },

  async getMetricasRapidas(req, res) {
    const client = await db.connect();
    try {
      // Método optimizado para obtener solo las métricas más importantes
      const [
        ventasHoyResult,
        alertasPendientesResult,
        stockBajoResult,
        ingresosMesResult,
      ] = await Promise.all([
        client.query(`
                            SELECT 
                                COUNT(*) as total,
                                COALESCE(SUM(total), 0) as ingresos
                            FROM ventas 
                            WHERE DATE(fecha) = CURRENT_DATE
                        `),
        client.query(
          "SELECT COUNT(*) as total FROM alertas WHERE atendida = FALSE"
        ),
        client.query(
          "SELECT COUNT(*) as total FROM productos WHERE stock <= 5"
        ),
        client.query(`
                            SELECT COALESCE(SUM(total), 0) as ingresos
                            FROM ventas 
                            WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
                        `),
      ]);

      const metricasRapidas = {
        ventas_hoy: {
          total: parseInt(ventasHoyResult.rows[0].total),
          ingresos: parseFloat(ventasHoyResult.rows[0].ingresos),
        },
        alertas_pendientes: parseInt(alertasPendientesResult.rows[0].total),
        productos_stock_bajo: parseInt(stockBajoResult.rows[0].total),
        ingresos_mes_actual: parseFloat(ingresosMesResult.rows[0].ingresos),
        ultima_actualizacion: new Date().toISOString(),
      };

      logger.api("Métricas rápidas del dashboard obtenidas", {
        usuario: req.user?.id_usuario,
        ventas_hoy: metricasRapidas.ventas_hoy.total,
      });

      return responseHelper.success(res, metricasRapidas);
    } catch (error) {
      logger.error("Error en dashboardController.getMetricasRapidas", {
        error: error.message,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(
        res,
        "Error obteniendo métricas rápidas",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getEstadisticasAvanzadas(req, res) {
    const client = await db.connect();
    try {
      const { periodo = "7d" } = req.query; // 7d, 30d, 90d, ytd

      const intervalMap = {
        "7d": "7 days",
        "30d": "30 days",
        "90d": "90 days",
        ytd: "1 year",
      };

      const interval = intervalMap[periodo] || "7 days";

      // 1. VENTAS POR DÍA EN EL PERIODO
      const ventasPeriodoResult = await client.query(`
                        SELECT 
                            DATE(fecha) as fecha,
                            COUNT(*) as total_ventas,
                            COALESCE(SUM(total), 0) as ingresos,
                            COALESCE(AVG(total), 0) as promedio_venta
                        FROM ventas
                        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
                        GROUP BY DATE(fecha)
                        ORDER BY fecha ASC
                    `);

      // 2. PRODUCTOS MÁS VENDIDOS EN EL PERIODO
      const topProductosResult = await client.query(`
                        SELECT 
                            p.id_producto,
                            p.nombre,
                            p.codigo_barra,
                            SUM(dv.cantidad) as total_vendido,
                            SUM(dv.subtotal) as ingresos_generados,
                            COUNT(DISTINCT dv.id_venta) as veces_vendido
                        FROM productos p
                        JOIN detalle_venta dv ON p.id_producto = dv.id_producto
                        JOIN ventas v ON dv.id_venta = v.id_venta
                        WHERE v.fecha >= CURRENT_DATE - INTERVAL '${interval}'
                        GROUP BY p.id_producto, p.nombre, p.codigo_barra
                        ORDER BY total_vendido DESC
                        LIMIT 10
                    `);

      // 3. MÉTRICAS DE EFICIENCIA
      const metricasEficienciaResult = await client.query(`
                        SELECT 
                            -- Tasa de conversión (ventas/usuarios activos)
                            (SELECT COUNT(*) FROM ventas WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}')::float / 
                            NULLIF((SELECT COUNT(*) FROM usuarios WHERE activo = true), 0) as tasa_conversion,
                            
                            -- Valor promedio del ticket
                            COALESCE(AVG(total), 0) as ticket_promedio,
                            
                            -- Frecuencia de compra
                            COUNT(DISTINCT DATE(fecha))::float / 
                            NULLIF(COUNT(DISTINCT id_usuario), 0) as frecuencia_compra
                        FROM ventas
                        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
                    `);

      // 4. HORARIOS PICO DE VENTAS
      const horariosPicoResult = await client.query(`
                        SELECT 
                            EXTRACT(HOUR FROM fecha) as hora,
                            COUNT(*) as total_ventas,
                            COALESCE(SUM(total), 0) as ingresos
                        FROM ventas
                        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
                        GROUP BY EXTRACT(HOUR FROM fecha)
                        ORDER BY total_ventas DESC
                        LIMIT 5
                    `);

      const estadisticasAvanzadas = {
        periodo: periodo,
        intervalo: interval,
        ventas_por_dia: ventasPeriodoResult.rows.map((row) => ({
          fecha: row.fecha,
          total_ventas: parseInt(row.total_ventas),
          ingresos: parseFloat(row.ingresos),
          promedio_venta: parseFloat(row.promedio_venta),
        })),
        top_productos: topProductosResult.rows.map((row) => ({
          id_producto: row.id_producto,
          nombre: row.nombre,
          codigo_barra: row.codigo_barra,
          total_vendido: parseFloat(row.total_vendido),
          ingresos_generados: parseFloat(row.ingresos_generados),
          veces_vendido: parseInt(row.veces_vendido),
        })),
        metricas_eficiencia: {
          tasa_conversion:
            parseFloat(metricasEficienciaResult.rows[0].tasa_conversion) || 0,
          ticket_promedio: parseFloat(
            metricasEficienciaResult.rows[0].ticket_promedio
          ),
          frecuencia_compra:
            parseFloat(metricasEficienciaResult.rows[0].frecuencia_compra) || 0,
        },
        horarios_pico: horariosPicoResult.rows.map((row) => ({
          hora: parseInt(row.hora),
          total_ventas: parseInt(row.total_ventas),
          ingresos: parseFloat(row.ingresos),
        })),
        resumen: {
          total_dias: ventasPeriodoResult.rows.length,
          ventas_totales: ventasPeriodoResult.rows.reduce(
            (sum, v) => sum + v.total_ventas,
            0
          ),
          ingresos_totales: ventasPeriodoResult.rows.reduce(
            (sum, v) => sum + parseFloat(v.ingresos),
            0
          ),
        },
      };

      logger.api("Estadísticas avanzadas del dashboard generadas", {
        usuario: req.user?.id_usuario,
        periodo: periodo,
        total_dias_analizados: estadisticasAvanzadas.resumen.total_dias,
      });

      return responseHelper.success(res, estadisticasAvanzadas);
    } catch (error) {
      logger.error("Error en dashboardController.getEstadisticasAvanzadas", {
        error: error.message,
        periodo: req.query.periodo,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(
        res,
        "Error generando estadísticas avanzadas",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getAlertasDashboard(req, res) {
    const client = await db.connect();
    try {
      // Obtener alertas para el dashboard (prioridad alta)
      const alertasResult = await client.query(`
                        SELECT a.*, p.nombre as producto_nombre, p.stock, p.fecha_caducidad
                        FROM alertas a
                        JOIN productos p ON a.id_producto = p.id_producto
                        WHERE a.atendida = FALSE
                        ORDER BY 
                            CASE 
                                WHEN a.tipo = 'caducidad' THEN 1
                                WHEN a.tipo = 'stock_bajo' THEN 2
                                ELSE 3
                            END,
                            a.fecha DESC
                        LIMIT 20
                    `);

      // ✅ USAR MODELO ALERTA
      const alertas = alertasResult.rows.map((row) => {
        const alerta = Alerta.fromDatabaseRow(row);
        return alerta.toJSON ? alerta.toJSON() : alerta;
      });

      // Clasificar alertas por prioridad
      const alertasClasificadas = {
        alta: alertas.filter((a) =>
          a.getPrioridad ? a.getPrioridad() === "ALTA" : a.tipo === "caducidad"
        ),
        media: alertas.filter((a) =>
          a.getPrioridad
            ? a.getPrioridad() === "MEDIA"
            : a.tipo === "stock_bajo"
        ),
        total: alertas.length,
      };

      logger.api("Alertas para dashboard obtenidas", {
        usuario: req.user?.id_usuario,
        total_alertas: alertas.length,
        por_prioridad: {
          alta: alertasClasificadas.alta.length,
          media: alertasClasificadas.media.length,
        },
      });

      return responseHelper.success(res, {
        alertas: alertasClasificadas,
        total: alertas.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error en dashboardController.getAlertasDashboard", {
        error: error.message,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(
        res,
        "Error obteniendo alertas del dashboard",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  // ==================== MÉTODOS HELPER ====================

  /**
   * Calcula la tendencia de ventas comparando los últimos días
   */
  calcularTendenciaVentas(ventasPorDia) {
    if (ventasPorDia.length < 2) return "estable";

    const ultimosDias = ventasPorDia.slice(-7); // Últimos 7 días
    if (ultimosDias.length < 2) return "estable";

    const primerosIngresos = ultimosDias[0].ingresos;
    const ultimosIngresos = ultimosDias[ultimosDias.length - 1].ingresos;

    if (ultimosIngresos === 0) return "estable";

    const porcentajeCambio =
      ((ultimosIngresos - primerosIngresos) / primerosIngresos) * 100;

    if (porcentajeCambio > 10) return "ascendente";
    if (porcentajeCambio < -10) return "descendente";
    return "estable";
  },

  /**
   * Calcula métricas adicionales para el dashboard
   */
  calcularMetricasAdicionales(estadisticasBasicas) {
    const ingresosProyectados = estadisticasBasicas.ventas_mes.ingresos;
    const diasTranscurridos = new Date().getDate();
    const diasMes = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();

    const proyeccionMensual =
      diasTranscurridos > 0
        ? (ingresosProyectados / diasTranscurridos) * diasMes
        : 0;

    return {
      proyeccion_ingresos_mensual: proyeccionMensual,
      eficiencia_diaria:
        estadisticasBasicas.ventas_hoy.ingresos > 0
          ? (estadisticasBasicas.ventas_hoy.ingresos / proyeccionMensual) *
            diasMes
          : 0,
      valor_usuario:
        estadisticasBasicas.total_usuarios > 0
          ? estadisticasBasicas.ventas_mes.ingresos /
            estadisticasBasicas.total_usuarios
          : 0,
    };
  },

  async getDatosVentas(req, res) {
    const client = await db.connect();
    try {
      const {
        tipo_grafico = "lineas",
        periodo = "7d",
        agrupar_por = "dia",
      } = req.query;

      const intervalMap = {
        "7d": "7 days",
        "30d": "30 days",
        "90d": "90 days",
        ytd: "1 year",
      };
      const interval = intervalMap[periodo] || "7 days";

      // Ventas por período agrupadas
      let groupByClause;
      switch (agrupar_por) {
        case "semana":
          groupByClause = `DATE_TRUNC('week', fecha)`;
          break;
        case "mes":
          groupByClause = `DATE_TRUNC('month', fecha)`;
          break;
        case "año":
          groupByClause = `DATE_TRUNC('year', fecha)`;
          break;
        default:
          groupByClause = `DATE(fecha)`;
      }

      const ventasResult = await client.query(`
                        SELECT 
                            ${groupByClause} as periodo,
                            COUNT(*) as total_ventas,
                            COALESCE(SUM(total), 0) as ingresos,
                            COALESCE(AVG(total), 0) as promedio_venta,
                            COUNT(DISTINCT id_usuario) as usuarios_unicos
                        FROM ventas
                        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
                        GROUP BY ${groupByClause}
                        ORDER BY periodo ASC
                    `);

      // Métodos de pago más utilizados
      const metodosPagoResult = await client.query(`
                        SELECT 
                            forma_pago,
                            COUNT(*) as total_ventas,
                            COALESCE(SUM(total), 0) as ingresos
                        FROM ventas
                        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
                        GROUP BY forma_pago
                        ORDER BY ingresos DESC
                    `);

      // Ventas por categoría
      const ventasPorCategoriaResult = await client.query(`
                        SELECT 
                            c.nombre as categoria,
                            COUNT(DISTINCT v.id_venta) as total_ventas,
                            COALESCE(SUM(dv.subtotal), 0) as ingresos,
                            SUM(dv.cantidad) as total_productos_vendidos
                        FROM ventas v
                        JOIN detalle_venta dv ON v.id_venta = dv.id_venta
                        JOIN productos p ON dv.id_producto = p.id_producto
                        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                        WHERE v.fecha >= CURRENT_DATE - INTERVAL '${interval}'
                        GROUP BY c.id_categoria, c.nombre
                        ORDER BY ingresos DESC
                        LIMIT 10
                    `);

      const datosVentas = {
        configuracion: {
          tipo_grafico: tipo_grafico,
          periodo: periodo,
          agrupar_por: agrupar_por,
        },
        ventas_por_periodo: ventasResult.rows.map((row) => ({
          periodo: row.periodo,
          total_ventas: parseInt(row.total_ventas),
          ingresos: parseFloat(row.ingresos),
          promedio_venta: parseFloat(row.promedio_venta),
          usuarios_unicos: parseInt(row.usuarios_unicos),
        })),
        metodos_pago: metodosPagoResult.rows.map((row) => ({
          metodo: row.forma_pago,
          total_ventas: parseInt(row.total_ventas),
          ingresos: parseFloat(row.ingresos),
          porcentaje: 0, // Se calculará después
        })),
        ventas_por_categoria: ventasPorCategoriaResult.rows.map((row) => ({
          categoria: row.categoria || "Sin categoría",
          total_ventas: parseInt(row.total_ventas),
          ingresos: parseFloat(row.ingresos),
          total_productos: parseInt(row.total_productos_vendidos),
        })),
        resumen: {
          total_ventas: ventasResult.rows.reduce(
            (sum, v) => sum + parseInt(v.total_ventas),
            0
          ),
          ingresos_totales: ventasResult.rows.reduce(
            (sum, v) => sum + parseFloat(v.ingresos),
            0
          ),
          ticket_promedio:
            ventasResult.rows.reduce(
              (sum, v) => sum + parseFloat(v.promedio_venta),
              0
            ) / ventasResult.rows.length,
        },
      };

      // Calcular porcentajes de métodos de pago
      const totalIngresos = datosVentas.resumen.ingresos_totales;
      datosVentas.metodos_pago.forEach((metodo) => {
        metodo.porcentaje =
          totalIngresos > 0 ? (metodo.ingresos / totalIngresos) * 100 : 0;
      });

      logger.api("Datos de ventas para dashboard obtenidos", {
        usuario: req.user?.id_usuario,
        periodo: periodo,
        total_ventas: datosVentas.resumen.total_ventas,
      });

      return responseHelper.success(res, datosVentas);
    } catch (error) {
      logger.error("Error en dashboardController.getDatosVentas", {
        error: error.message,
        query: req.query,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(
        res,
        "Error obteniendo datos de ventas",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getEstadoInventario(req, res) {
    const client = await db.connect();
    try {
      // Estadísticas generales de inventario
      const inventarioResult = await client.query(`
                        SELECT 
                            COUNT(*) as total_productos,
                            COALESCE(SUM(stock), 0) as total_stock,
                            COALESCE(SUM(stock * precio_compra), 0) as valor_total,
                            COUNT(*) FILTER (WHERE stock = 0) as productos_agotados,
                            COUNT(*) FILTER (WHERE stock <= 5) as productos_stock_bajo,
                            COUNT(*) FILTER (WHERE fecha_caducidad IS NOT NULL AND fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days') as productos_por_caducar
                        FROM productos
                    `);

      // Productos por categoría
      const productosPorCategoriaResult = await client.query(`
                        SELECT 
                            c.nombre as categoria,
                            COUNT(p.id_producto) as total_productos,
                            COALESCE(SUM(p.stock), 0) as total_stock,
                            COALESCE(SUM(p.stock * p.precio_compra), 0) as valor_categoria
                        FROM categorias c
                        LEFT JOIN productos p ON c.id_categoria = p.id_categoria
                        GROUP BY c.id_categoria, c.nombre
                        ORDER BY valor_categoria DESC
                    `);

      // Productos más valiosos (por valor de inventario)
      const productosValiososResult = await client.query(`
                        SELECT 
                            p.nombre,
                            p.codigo_barra,
                            p.stock,
                            p.precio_compra,
                            (p.stock * p.precio_compra) as valor_inventario,
                            c.nombre as categoria_nombre
                        FROM productos p
                        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                        ORDER BY valor_inventario DESC
                        LIMIT 15
                    `);

      // Movimientos recientes de inventario
      const movimientosResult = await client.query(`
                        SELECT 
                            h.motivo,
                            COUNT(*) as total_movimientos,
                            ABS(SUM(h.cambio)) as cantidad_total
                        FROM historial_inventario h
                        WHERE h.fecha >= CURRENT_DATE - INTERVAL '7 days'
                        GROUP BY h.motivo
                        ORDER BY cantidad_total DESC
                    `);

      const estadoInventario = {
        estadisticas: {
          total_productos: parseInt(inventarioResult.rows[0].total_productos),
          total_stock: parseFloat(inventarioResult.rows[0].total_stock),
          valor_total: parseFloat(inventarioResult.rows[0].valor_total),
          productos_agotados: parseInt(
            inventarioResult.rows[0].productos_agotados
          ),
          productos_stock_bajo: parseInt(
            inventarioResult.rows[0].productos_stock_bajo
          ),
          productos_por_caducar: parseInt(
            inventarioResult.rows[0].productos_por_caducar
          ),
        },
        por_categoria: productosPorCategoriaResult.rows.map((row) => ({
          categoria: row.categoria || "Sin categoría",
          total_productos: parseInt(row.total_productos),
          total_stock: parseFloat(row.total_stock),
          valor: parseFloat(row.valor_categoria),
        })),
        productos_valiosos: productosValiososResult.rows.map((row) => {
          const producto = Producto.fromDatabaseRow(row);
          return {
            ...(producto.toJSON ? producto.toJSON() : producto),
            valor_inventario: parseFloat(row.valor_inventario),
            categoria_nombre: row.categoria_nombre,
          };
        }),
        movimientos_recientes: movimientosResult.rows.map((row) => ({
          motivo: row.motivo,
          total_movimientos: parseInt(row.total_movimientos),
          cantidad_total: parseFloat(row.cantidad_total),
        })),
        alertas: {
          necesita_atencion:
            parseInt(inventarioResult.rows[0].productos_agotados) +
            parseInt(inventarioResult.rows[0].productos_stock_bajo) +
            parseInt(inventarioResult.rows[0].productos_por_caducar),
          nivel_riesgo: this.calcularNivelRiesgoInventario(
            inventarioResult.rows[0]
          ),
        },
      };

      logger.api("Estado de inventario para dashboard obtenido", {
        usuario: req.user?.id_usuario,
        total_productos: estadoInventario.estadisticas.total_productos,
        valor_total: estadoInventario.estadisticas.valor_total,
      });

      return responseHelper.success(res, estadoInventario);
    } catch (error) {
      logger.error("Error en dashboardController.getEstadoInventario", {
        error: error.message,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(
        res,
        "Error obteniendo estado de inventario",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getMetricasFinancieras(req, res) {
    const client = await db.connect();
    try {
      const {
        moneda = "MXN",
        incluir_proyecciones = true,
        nivel_detalle = "basico",
      } = req.query;

      // Ingresos por mes (últimos 6 meses)
      const ingresosMensualesResult = await client.query(`
                        SELECT 
                            DATE_TRUNC('month', fecha) as mes,
                            COUNT(*) as total_ventas,
                            COALESCE(SUM(total), 0) as ingresos,
                            COALESCE(SUM(subtotal), 0) as subtotal,
                            COALESCE(SUM(iva), 0) as iva
                        FROM ventas
                        WHERE fecha >= CURRENT_DATE - INTERVAL '6 months'
                        GROUP BY DATE_TRUNC('month', fecha)
                        ORDER BY mes DESC
                        LIMIT 6
                    `);

      // Gastos (si tienes tabla de gastos)
      const gastosMensualesResult = await client.query(`
                        SELECT 
                            DATE_TRUNC('month', fecha) as mes,
                            COALESCE(SUM(monto), 0) as gastos
                        FROM gastos
                        WHERE fecha >= CURRENT_DATE - INTERVAL '6 months'
                        GROUP BY DATE_TRUNC('month', fecha)
                        ORDER BY mes DESC
                        LIMIT 6
                    `);

      // Margen de ganancia por categoría
      const margenGananciaResult = await client.query(`
                        SELECT 
                            c.nombre as categoria,
                            COALESCE(SUM(dv.subtotal), 0) as ingresos,
                            COALESCE(SUM(dv.cantidad * p.precio_compra), 0) as costos,
                            CASE 
                                WHEN COALESCE(SUM(dv.cantidad * p.precio_compra), 0) > 0 THEN
                                    ((COALESCE(SUM(dv.subtotal), 0) - COALESCE(SUM(dv.cantidad * p.precio_compra), 0)) / COALESCE(SUM(dv.cantidad * p.precio_compra), 0)) * 100
                                ELSE 0
                            END as margen_porcentaje
                        FROM detalle_venta dv
                        JOIN productos p ON dv.id_producto = p.id_producto
                        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                        JOIN ventas v ON dv.id_venta = v.id_venta
                        WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'
                        GROUP BY c.id_categoria, c.nombre
                        HAVING COALESCE(SUM(dv.subtotal), 0) > 0
                        ORDER BY margen_porcentaje DESC
                        LIMIT 10
                    `);

      const metricasFinancieras = {
        configuracion: {
          moneda: moneda,
          incluir_proyecciones: incluir_proyecciones === "true",
          nivel_detalle: nivel_detalle,
        },
        ingresos_mensuales: ingresosMensualesResult.rows.map((row) => ({
          mes: row.mes,
          total_ventas: parseInt(row.total_ventas),
          ingresos: parseFloat(row.ingresos),
          subtotal: parseFloat(row.subtotal),
          iva: parseFloat(row.iva),
          gastos: this.obtenerGastosParaMes(
            gastosMensualesResult.rows,
            row.mes
          ),
          utilidad:
            parseFloat(row.ingresos) -
            this.obtenerGastosParaMes(gastosMensualesResult.rows, row.mes),
        })),
        margenes_ganancia: margenGananciaResult.rows.map((row) => ({
          categoria: row.categoria || "Sin categoría",
          ingresos: parseFloat(row.ingresos),
          costos: parseFloat(row.costos),
          margen_bruto: parseFloat(row.ingresos) - parseFloat(row.costos),
          margen_porcentaje: parseFloat(row.margen_porcentaje),
        })),
        resumen: {
          ingresos_ultimo_mes: ingresosMensualesResult.rows[0]
            ? parseFloat(ingresosMensualesResult.rows[0].ingresos)
            : 0,
          crecimiento_mensual: this.calcularCrecimientoMensual(
            ingresosMensualesResult.rows
          ),
          margen_promedio:
            margenGananciaResult.rows.reduce(
              (sum, row) => sum + parseFloat(row.margen_porcentaje),
              0
            ) / margenGananciaResult.rows.length,
          proyeccion_anual: this.calcularProyeccionAnual(
            ingresosMensualesResult.rows
          ),
        },
      };

      logger.api("Métricas financieras para dashboard obtenidas", {
        usuario: req.user?.id_usuario,
        moneda: moneda,
        nivel_detalle: nivel_detalle,
      });

      return responseHelper.success(res, metricasFinancieras);
    } catch (error) {
      logger.error("Error en dashboardController.getMetricasFinancieras", {
        error: error.message,
        query: req.query,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(
        res,
        "Error obteniendo métricas financieras",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getEstadisticasUsuarios(req, res) {
    const client = await db.connect();
    try {
      // Estadísticas de usuarios
      const usuariosResult = await db.query(`
                        SELECT 
                            rol,
                            COUNT(*) as total,
                            COUNT(*) FILTER (WHERE activo = true) as activos,
                            COUNT(*) FILTER (WHERE activo = false) as inactivos
                        FROM usuarios
                        GROUP BY rol
                        ORDER BY total DESC
                    `);

      // Actividad de usuarios (últimos 30 días)
      const actividadResult = await db.query(`
                        SELECT 
                            u.id_usuario,
                            u.nombre,
                            u.rol,
                            COUNT(v.id_venta) as total_ventas,
                            COALESCE(SUM(v.total), 0) as ingresos_generados,
                            MAX(v.fecha) as ultima_venta
                        FROM usuarios u
                        LEFT JOIN ventas v ON u.id_usuario = v.id_usuario AND v.fecha >= CURRENT_DATE - INTERVAL '30 days'
                        WHERE u.activo = true
                        GROUP BY u.id_usuario, u.nombre, u.rol
                        ORDER BY ingresos_generados DESC
                    `);

      const estadisticasUsuarios = {
        por_rol: usuariosResult.rows.map((row) => ({
          rol: row.rol,
          total: parseInt(row.total),
          activos: parseInt(row.activos),
          inactivos: parseInt(row.inactivos),
        })),
        actividad_reciente: actividadResult.rows.map((row) => ({
          usuario: row.nombre,
          rol: row.rol,
          total_ventas: parseInt(row.total_ventas),
          ingresos_generados: parseFloat(row.ingresos_generados),
          ultima_actividad: row.ultima_venta,
          eficiencia:
            parseInt(row.total_ventas) > 0
              ? parseFloat(row.ingresos_generados) / parseInt(row.total_ventas)
              : 0,
        })),
        resumen: {
          total_usuarios: usuariosResult.rows.reduce(
            (sum, row) => sum + parseInt(row.total),
            0
          ),
          usuarios_activos: usuariosResult.rows.reduce(
            (sum, row) => sum + parseInt(row.activos),
            0
          ),
          ventas_ultimo_mes: actividadResult.rows.reduce(
            (sum, row) => sum + parseInt(row.total_ventas),
            0
          ),
          ingresos_ultimo_mes: actividadResult.rows.reduce(
            (sum, row) => sum + parseFloat(row.ingresos_generados),
            0
          ),
        },
      };

      logger.api("Estadísticas de usuarios para dashboard obtenidas", {
        usuario: req.user?.id_usuario,
        total_usuarios: estadisticasUsuarios.resumen.total_usuarios,
      });

      return responseHelper.success(res, estadisticasUsuarios);
    } catch (error) {
      logger.error("Error en dashboardController.getEstadisticasUsuarios", {
        error: error.message,
        usuario: req.user?.id_usuario,
      });

      return responseHelper.error(
        res,
        "Error obteniendo estadísticas de usuarios",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  // ==================== MÉTODOS HELPER ADICIONALES ====================

  calcularNivelRiesgoInventario(estadisticas) {
    const productosProblema =
      estadisticas.productos_agotados +
      estadisticas.productos_stock_bajo +
      estadisticas.productos_por_caducar;
    const porcentajeProblema =
      (productosProblema / estadisticas.total_productos) * 100;

    if (porcentajeProblema > 20) return "ALTO";
    if (porcentajeProblema > 10) return "MEDIO";
    if (porcentajeProblema > 5) return "BAJO";
    return "MINIMO";
  },

  obtenerGastosParaMes(gastos, mes) {
    const gastoMes = gastos.find(
      (g) => g.mes.getTime() === new Date(mes).getTime()
    );
    return gastoMes ? parseFloat(gastoMes.gastos) : 0;
  },

  calcularCrecimientoMensual(ingresosMensuales) {
    if (ingresosMensuales.length < 2) return 0;

    const ingresoActual = parseFloat(ingresosMensuales[0].ingresos);
    const ingresoAnterior = parseFloat(ingresosMensuales[1].ingresos);

    if (ingresoAnterior === 0) return ingresoActual > 0 ? 100 : 0;

    return ((ingresoActual - ingresoAnterior) / ingresoAnterior) * 100;
  },

  calcularProyeccionAnual(ingresosMensuales) {
    if (ingresosMensuales.length === 0) return 0;

    const ingresoPromedio =
      ingresosMensuales.reduce(
        (sum, row) => sum + parseFloat(row.ingresos),
        0
      ) / ingresosMensuales.length;
    return ingresoPromedio * 12;
  },

  async getReporteVentasDiarias(req, res) {
    const client = await db.connect();
    try {
      const ventasHoyResult = await client.query(`
            SELECT 
                COUNT(*) as total_ventas,
                COALESCE(SUM(total), 0) as ingresos_totales
            FROM ventas 
            WHERE DATE(fecha) = CURRENT_DATE
        `);

      const reporte = {
        fecha: new Date().toISOString().split("T")[0],
        total_ventas: parseInt(ventasHoyResult.rows[0].total_ventas),
        ingresos_totales: parseFloat(ventasHoyResult.rows[0].ingresos_totales),
        timestamp: new Date().toISOString(),
      };

      return responseHelper.success(
        res,
        reporte,
        "Reporte de ventas diarias generado"
      );
    } catch (error) {
      logger.error(
        "Error en dashboardController.getReporteVentasDiarias",
        error
      );
      return responseHelper.error(
        res,
        "Error generando reporte de ventas diarias",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getReporteStock(req, res) {
    const client = await db.connect();
    try {
      const stockResult = await client.query(`
            SELECT 
                COUNT(*) as total_productos,
                COUNT(*) FILTER (WHERE stock = 0) as agotados,
                COUNT(*) FILTER (WHERE stock <= 5) as stock_bajo,
                COALESCE(SUM(stock * precio_compra), 0) as valor_inventario
            FROM productos
        `);

      const reporte = {
        total_productos: parseInt(stockResult.rows[0].total_productos),
        productos_agotados: parseInt(stockResult.rows[0].agotados),
        productos_stock_bajo: parseInt(stockResult.rows[0].stock_bajo),
        valor_inventario: parseFloat(stockResult.rows[0].valor_inventario),
        timestamp: new Date().toISOString(),
      };

      return responseHelper.success(res, reporte, "Reporte de stock generado");
    } catch (error) {
      logger.error("Error en dashboardController.getReporteStock", error);
      return responseHelper.error(
        res,
        "Error generando reporte de stock",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async getReporteAlertas(req, res) {
    const client = await db.connect();
    try {
      const alertasResult = await client.query(`
            SELECT 
                tipo,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE atendida = false) as pendientes
            FROM alertas
            GROUP BY tipo
        `);

      const reporte = {
        alertas_por_tipo: alertasResult.rows.map((row) => ({
          tipo: row.tipo,
          total: parseInt(row.total),
          pendientes: parseInt(row.pendientes),
        })),
        total_alertas: alertasResult.rows.reduce(
          (sum, row) => sum + parseInt(row.total),
          0
        ),
        alertas_pendientes: alertasResult.rows.reduce(
          (sum, row) => sum + parseInt(row.pendientes),
          0
        ),
        timestamp: new Date().toISOString(),
      };

      return responseHelper.success(
        res,
        reporte,
        "Reporte de alertas generado"
      );
    } catch (error) {
      logger.error("Error en dashboardController.getReporteAlertas", error);
      return responseHelper.error(
        res,
        "Error generando reporte de alertas",
        500,
        error
      );
    } finally {
      client.release();
    }
  },

  async exportarDashboard(req, res) {
    try {
      return responseHelper.success(
        res,
        { mensaje: "Función de exportación en desarrollo" },
        "Exportación en desarrollo"
      );
    } catch (error) {
      logger.error("Error en dashboardController.exportarDashboard", error);
      return responseHelper.error(res, "Error en exportación", 500, error);
    }
  },

  async descargarPlantillaReporte(req, res) {
    try {
      const { tipo } = req.params;
      return responseHelper.success(
        res,
        {
          tipo: tipo,
          mensaje: "Descarga de plantilla en desarrollo",
        },
        "Plantilla en desarrollo"
      );
    } catch (error) {
      logger.error(
        "Error en dashboardController.descargarPlantillaReporte",
        error
      );
      return responseHelper.error(
        res,
        "Error descargando plantilla",
        500,
        error
      );
    }
  }
};

module.exports = dashboardController;

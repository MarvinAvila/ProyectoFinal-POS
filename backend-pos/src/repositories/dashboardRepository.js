// src/repositories/dashboardRepository.js

const db = require('../config/database');

/**
 * Repositorio para todas las consultas del Dashboard.
 * Cada método retorna los datos crudos de la BD (result.rows o rows[0]).
 * Todas son consultas de solo lectura, por lo que no se usa 'client' ni transacciones.
 */
const dashboardRepository = {

    // --- Consultas para getResumenCompleto ---
    getVentasHoyStats: () => db.query(`
        SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as ingresos_totales,
               COALESCE(AVG(total), 0) as promedio_venta, COALESCE(MAX(total), 0) as venta_maxima
        FROM ventas WHERE DATE(fecha) = CURRENT_DATE
    `).then(res => res.rows[0]),

    getTotalProductos: () => db.query("SELECT COUNT(*) as total FROM productos").then(res => res.rows[0]),
    getTotalUsuariosActivos: () => db.query("SELECT COUNT(*) as total FROM usuarios WHERE activo = true").then(res => res.rows[0]),
    
    getVentasMesStats: () => db.query(`
        SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as ingresos
        FROM ventas WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
    `).then(res => res.rows[0]),

    getTotalAlertasPendientes: () => db.query("SELECT COUNT(*) as total FROM alertas WHERE atendida = FALSE").then(res => res.rows[0]),
    getTotalCategorias: () => db.query("SELECT COUNT(*) as total FROM categorias").then(res => res.rows[0]),
    getTotalProveedores: () => db.query("SELECT COUNT(*) as total FROM proveedores").then(res => res.rows[0]),

    getVentasRecientes: () => db.query(`
        SELECT v.*, u.nombre as usuario_nombre
        FROM ventas v LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
        ORDER BY v.fecha DESC LIMIT 5
    `).then(res => res.rows),

    getProductosPopulares: (interval = '7 days') => db.query(`
        SELECT p.*, SUM(dv.cantidad) as total_vendido
        FROM productos p
        LEFT JOIN detalle_venta dv ON p.id_producto = dv.id_producto
        LEFT JOIN ventas v ON dv.id_venta = v.id_venta
        WHERE v.fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY p.id_producto
        ORDER BY total_vendido DESC NULLS LAST LIMIT 5
    `).then(res => res.rows),

    getProductosRentables: (interval = '30 days') => db.query(`
        SELECT p.id_producto, p.nombre, SUM(dv.cantidad) AS cantidad_vendida,
               SUM(dv.subtotal) AS ingresos, SUM(dv.cantidad * p.precio_compra) AS costos,
               (SUM(dv.subtotal) - SUM(dv.cantidad * p.precio_compra)) AS ganancia
        FROM detalle_venta dv
        JOIN productos p ON p.id_producto = dv.id_producto
        JOIN ventas v ON v.id_venta = dv.id_venta
        WHERE v.fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY p.id_producto, p.nombre
        HAVING SUM(dv.subtotal) > 0
        ORDER BY ganancia DESC LIMIT 5
    `).then(res => res.rows),

    getVentasPorEmpleado: (interval = '30 days') => db.query(`
        SELECT u.id_usuario, u.nombre AS empleado, COUNT(v.id_venta) AS total_ventas,
               COALESCE(SUM(v.total), 0) AS ingresos_generados
        FROM usuarios u
        LEFT JOIN ventas v ON u.id_usuario = v.id_usuario
        WHERE u.rol IN ('empleado', 'cajero', 'gerente') 
          AND v.fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY u.id_usuario, u.nombre
        HAVING COUNT(v.id_venta) > 0
        ORDER BY ingresos_generados DESC LIMIT 5
    `).then(res => res.rows),

    getDistribucionInventario: () => db.query(`
        SELECT c.nombre AS categoria, COUNT(p.id_producto) AS total_productos,
               COALESCE(SUM(p.stock), 0) AS total_stock,
               COALESCE(SUM(p.stock * p.precio_compra), 0) AS valor_inventario
        FROM categorias c
        LEFT JOIN productos p ON p.id_categoria = c.id_categoria
        GROUP BY c.id_categoria, c.nombre
        ORDER BY valor_inventario DESC
    `).then(res => res.rows),

    getAlertasRecientes: () => db.query(`
        SELECT a.*, p.nombre as producto_nombre, p.stock
        FROM alertas a JOIN productos p ON a.id_producto = p.id_producto
        WHERE a.atendida = FALSE
        ORDER BY a.fecha DESC LIMIT 10
    `).then(res => res.rows),

    getVentasUltimaSemana: () => db.query(`
        SELECT DATE(fecha) as fecha, COUNT(*) as total_ventas,
               COALESCE(SUM(total), 0) as ingresos_diarios
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(fecha)
        ORDER BY fecha ASC
    `).then(res => res.rows),

    getCrecimientoMensual: () => db.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'Mon') AS mes,
               COALESCE(SUM(total), 0) AS ingresos
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha)
        ORDER BY DATE_TRUNC('month', fecha)
    `).then(res => res.rows),

    // --- Consultas para getMetricasRapidas ---
    getProductosStockBajoCount: () => db.query("SELECT COUNT(*) as total FROM productos WHERE stock <= 5").then(res => res.rows[0]),
    getIngresosMes: () => db.query(`
        SELECT COALESCE(SUM(total), 0) as ingresos
        FROM ventas WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
    `).then(res => res.rows[0]),

    // --- Consultas para getEstadisticasAvanzadas ---
    getVentasPorDiaPeriodo: (interval) => db.query(`
        SELECT DATE(fecha) as fecha, COUNT(*) as total_ventas,
               COALESCE(SUM(total), 0) as ingresos,
               COALESCE(AVG(total), 0) as promedio_venta
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY DATE(fecha) ORDER BY fecha ASC
    `).then(res => res.rows),

    getTopProductosPeriodo: (interval) => db.query(`
        SELECT p.id_producto, p.nombre, p.codigo_barra, SUM(dv.cantidad) as total_vendido,
               SUM(dv.subtotal) as ingresos_generados,
               COUNT(DISTINCT dv.id_venta) as veces_vendido
        FROM productos p
        JOIN detalle_venta dv ON p.id_producto = dv.id_producto
        JOIN ventas v ON dv.id_venta = v.id_venta
        WHERE v.fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY p.id_producto, p.nombre, p.codigo_barra
        ORDER BY total_vendido DESC LIMIT 10
    `).then(res => res.rows),
    
    getMetricasEficiencia: (interval) => db.query(`
        SELECT 
            (SELECT COUNT(*) FROM ventas WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}')::float / 
            NULLIF((SELECT COUNT(*) FROM usuarios WHERE activo = true), 0) as tasa_conversion,
            COALESCE(AVG(total), 0) as ticket_promedio,
            COUNT(DISTINCT DATE(fecha))::float / 
            NULLIF(COUNT(DISTINCT id_usuario), 0) as frecuencia_compra
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
    `).then(res => res.rows[0]),

    getHorariosPico: (interval) => db.query(`
        SELECT EXTRACT(HOUR FROM fecha) as hora, COUNT(*) as total_ventas,
               COALESCE(SUM(total), 0) as ingresos
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY EXTRACT(HOUR FROM fecha)
        ORDER BY total_ventas DESC LIMIT 5
    `).then(res => res.rows),

    // --- Consulta para getAlertasDashboard ---
    getAlertasDashboard: () => db.query(`
        SELECT a.*, p.nombre as producto_nombre, p.stock, p.fecha_caducidad
        FROM alertas a JOIN productos p ON a.id_producto = p.id_producto
        WHERE a.atendida = FALSE
        ORDER BY CASE WHEN a.tipo = 'caducidad' THEN 1 WHEN a.tipo = 'stock_bajo' THEN 2 ELSE 3 END, a.fecha DESC
        LIMIT 20
    `).then(res => res.rows),

    // --- Consultas para getDatosVentas ---
    getVentasPorPeriodoAgrupado: (interval, groupByClause) => db.query(`
        SELECT ${groupByClause} as periodo, COUNT(*) as total_ventas,
               COALESCE(SUM(total), 0) as ingresos,
               COALESCE(AVG(total), 0) as promedio_venta,
               COUNT(DISTINCT id_usuario) as usuarios_unicos
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY ${groupByClause} ORDER BY periodo ASC
    `).then(res => res.rows),
    
    getMetodosPago: (interval) => db.query(`
        SELECT forma_pago, COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as ingresos
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY forma_pago ORDER BY ingresos DESC
    `).then(res => res.rows),

    getVentasPorCategoria: (interval) => db.query(`
        SELECT c.nombre as categoria, COUNT(DISTINCT v.id_venta) as total_ventas,
               COALESCE(SUM(dv.subtotal), 0) as ingresos,
               SUM(dv.cantidad) as total_productos_vendidos
        FROM ventas v
        JOIN detalle_venta dv ON v.id_venta = dv.id_venta
        JOIN productos p ON dv.id_producto = p.id_producto
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE v.fecha >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY c.id_categoria, c.nombre
        ORDER BY ingresos DESC LIMIT 10
    `).then(res => res.rows),

    // --- Consultas para getEstadoInventario ---
    getInventarioStats: () => db.query(`
        SELECT COUNT(*) as total_productos, COALESCE(SUM(stock), 0) as total_stock,
               COALESCE(SUM(stock * precio_compra), 0) as valor_total,
               COUNT(*) FILTER (WHERE stock = 0) as productos_agotados,
               COUNT(*) FILTER (WHERE stock <= 5) as productos_stock_bajo,
               COUNT(*) FILTER (WHERE fecha_caducidad IS NOT NULL AND fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days') as productos_por_caducar
        FROM productos
    `).then(res => res.rows[0]),

    getProductosPorCategoriaStats: () => db.query(`
        SELECT c.nombre as categoria, COUNT(p.id_producto) as total_productos,
               COALESCE(SUM(p.stock), 0) as total_stock,
               COALESCE(SUM(p.stock * p.precio_compra), 0) as valor_categoria
        FROM categorias c
        LEFT JOIN productos p ON c.id_categoria = c.id_categoria
        GROUP BY c.id_categoria, c.nombre
        ORDER BY valor_categoria DESC
    `).then(res => res.rows),

    getProductosValiosos: () => db.query(`
        SELECT p.*, (p.stock * p.precio_compra) as valor_inventario,
               c.nombre as categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        ORDER BY valor_inventario DESC LIMIT 15
    `).then(res => res.rows),

    getMovimientosInventarioRecientes: () => db.query(`
        SELECT h.motivo, COUNT(*) as total_movimientos,
               ABS(SUM(h.cambio)) as cantidad_total
        FROM historial_inventario h
        WHERE h.fecha >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY h.motivo ORDER BY cantidad_total DESC
    `).then(res => res.rows),

    // --- Consultas para getMetricasFinancieras ---
    getIngresosMensuales: () => db.query(`
        SELECT DATE_TRUNC('month', fecha) as mes, COUNT(*) as total_ventas,
               COALESCE(SUM(total), 0) as ingresos,
               COALESCE(SUM(subtotal), 0) as subtotal,
               COALESCE(SUM(iva), 0) as iva
        FROM ventas
        WHERE fecha >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha) ORDER BY mes DESC LIMIT 6
    `).then(res => res.rows),
    
    getGastosMensuales: () => db.query(`
        SELECT DATE_TRUNC('month', fecha) as mes, COALESCE(SUM(monto), 0) as gastos
        FROM gastos -- Asume que existe una tabla 'gastos'
        WHERE fecha >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha) ORDER BY mes DESC LIMIT 6
    `).then(res => res.rows).catch(() => []), // Previene error si 'gastos' no existe

    getMargenGananciaPorCategoria: () => db.query(`
        SELECT c.nombre as categoria, COALESCE(SUM(dv.subtotal), 0) as ingresos,
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
        ORDER BY margen_porcentaje DESC LIMIT 10
    `).then(res => res.rows),

    // --- Consultas para getEstadisticasUsuarios ---
    getUsuariosPorRol: () => db.query(`
        SELECT rol, COUNT(*) as total,
               COUNT(*) FILTER (WHERE activo = true) as activos,
               COUNT(*) FILTER (WHERE activo = false) as inactivos
        FROM usuarios
        GROUP BY rol ORDER BY total DESC
    `).then(res => res.rows),

    getActividadUsuarios: () => db.query(`
        SELECT u.id_usuario, u.nombre, u.rol, COUNT(v.id_venta) as total_ventas,
               COALESCE(SUM(v.total), 0) as ingresos_generados,
               MAX(v.fecha) as ultima_venta
        FROM usuarios u
        LEFT JOIN ventas v ON u.id_usuario = v.id_usuario AND v.fecha >= CURRENT_DATE - INTERVAL '30 days'
        WHERE u.activo = true
        GROUP BY u.id_usuario, u.nombre, u.rol
        ORDER BY ingresos_generados DESC
    `).then(res => res.rows),
    
    // --- Consultas para Reportes Simples ---
    getReporteAlertas: () => db.query(`
        SELECT tipo, COUNT(*) as total, COUNT(*) FILTER (WHERE atendida = false) as pendientes
        FROM alertas GROUP BY tipo
    `).then(res => res.rows),
};

module.exports = dashboardRepository;
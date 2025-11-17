// src/controllers/dashboardController.js

const responseHelper = require("../utils/responseHelper");
const logger = require("../utils/logger");
const dashboardService = require("../services/dashboardService");
// Ya no se necesita: db, Producto, Venta, Alerta, Reporte

/**
 * Manejador de errores centralizado
 */
const handleError = (res, error, context, requestData = {}) => {
    logger.error(`Error en ${context}`, {
        error: error.message,
        ...requestData,
    });
    return responseHelper.error(res, `Error en ${context}`, 500, error);
};

const dashboardController = {

    async getResumenCompleto(req, res) {
        try {
            const resumenCompleto = await dashboardService.getResumenCompleto();
            logger.api("✅ Dashboard completo generado correctamente", {
                usuario: req.user?.id_usuario,
            });
            return responseHelper.success(res, resumenCompleto, "Dashboard generado exitosamente");
        } catch (error) {
            return handleError(res, error, 'dashboardController.getResumenCompleto', {
                usuario: req.user?.id_usuario
            });
        }
    },

    async getMetricasRapidas(req, res) {
        try {
            const metricasRapidas = await dashboardService.getMetricasRapidas();
            logger.api("Métricas rápidas del dashboard obtenidas", {
                usuario: req.user?.id_usuario,
                ventas_hoy: metricasRapidas.ventas_hoy.total,
            });
            return responseHelper.success(res, metricasRapidas);
        } catch (error) {
            return handleError(res, error, 'dashboardController.getMetricasRapidas', {
                usuario: req.user?.id_usuario
            });
        }
    },

    async getEstadisticasAvanzadas(req, res) {
        try {
            const estadisticasAvanzadas = await dashboardService.getEstadisticasAvanzadas(req.query);
            logger.api("Estadísticas avanzadas del dashboard generadas", {
                usuario: req.user?.id_usuario,
                periodo: req.query.periodo,
                total_dias_analizados: estadisticasAvanzadas.resumen.total_dias,
            });
            return responseHelper.success(res, estadisticasAvanzadas);
        } catch (error) {
            return handleError(res, error, 'dashboardController.getEstadisticasAvanzadas', {
                query: req.query,
                usuario: req.user?.id_usuario,
            });
        }
    },

    async getAlertasDashboard(req, res) {
        try {
            const alertasData = await dashboardService.getAlertasDashboard();
            logger.api("Alertas para dashboard obtenidas", {
                usuario: req.user?.id_usuario,
                total_alertas: alertasData.total,
            });
            return responseHelper.success(res, alertasData);
        } catch (error) {
            return handleError(res, error, 'dashboardController.getAlertasDashboard', {
                usuario: req.user?.id_usuario
            });
        }
    },

    async getDatosVentas(req, res) {
        try {
            const datosVentas = await dashboardService.getDatosVentas(req.query);
            logger.api("Datos de ventas para dashboard obtenidos", {
                usuario: req.user?.id_usuario,
                periodo: req.query.periodo,
                total_ventas: datosVentas.resumen.total_ventas,
            });
            return responseHelper.success(res, datosVentas);
        } catch (error) {
            return handleError(res, error, 'dashboardController.getDatosVentas', {
                query: req.query,
                usuario: req.user?.id_usuario,
            });
        }
    },

    async getEstadoInventario(req, res) {
        try {
            const estadoInventario = await dashboardService.getEstadoInventario();
            logger.api("Estado de inventario para dashboard obtenido", {
                usuario: req.user?.id_usuario,
                total_productos: estadoInventario.estadisticas.total_productos,
                valor_total: estadoInventario.estadisticas.valor_total,
            });
            return responseHelper.success(res, estadoInventario);
        } catch (error) {
            return handleError(res, error, 'dashboardController.getEstadoInventario', {
                usuario: req.user?.id_usuario
            });
        }
    },

    async getMetricasFinancieras(req, res) {
        try {
            const metricasFinancieras = await dashboardService.getMetricasFinancieras();
            logger.api("Métricas financieras para dashboard obtenidas", {
                usuario: req.user?.id_usuario,
            });
            return responseHelper.success(res, metricasFinancieras);
        } catch (error) {
            // Nota: Este error puede saltar si la tabla 'gastos' no existe.
            // El repositorio la ignora, pero si hay otro error, se captura aquí.
            return handleError(res, error, 'dashboardController.getMetricasFinancieras', {
                query: req.query,
                usuario: req.user?.id_usuario,
            });
        }
    },

    async getEstadisticasUsuarios(req, res) {
        try {
            const estadisticasUsuarios = await dashboardService.getEstadisticasUsuarios();
            logger.api("Estadísticas de usuarios para dashboard obtenidas", {
                usuario: req.user?.id_usuario,
                total_usuarios: estadisticasUsuarios.resumen.total_usuarios,
            });
            return responseHelper.success(res, estadisticasUsuarios);
        } catch (error) {
            return handleError(res, error, 'dashboardController.getEstadisticasUsuarios', {
                usuario: req.user?.id_usuario
            });
        }
    },
    
    // --- Reportes simples ---
    async getReporteVentasDiarias(req, res) {
        try {
            const reporte = await dashboardService.getReporteVentasDiarias();
            return responseHelper.success(res, reporte, "Reporte de ventas diarias generado");
        } catch (error) {
            return handleError(res, error, 'dashboardController.getReporteVentasDiarias');
        }
    },

    async getReporteStock(req, res) {
        try {
            const reporte = await dashboardService.getReporteStock();
            return responseHelper.success(res, reporte, "Reporte de stock generado");
        } catch (error) {
            return handleError(res, error, 'dashboardController.getReporteStock');
        }
    },

    async getReporteAlertas(req, res) {
        try {
            const reporte = await dashboardService.getReporteAlertas();
            return responseHelper.success(res, reporte, "Reporte de alertas generado");
        } catch (error) {
            return handleError(res, error, 'dashboardController.getReporteAlertas');
        }
    },
    
    // --- Funciones sin lógica de BD ---
    async exportarDashboard(req, res) {
        return responseHelper.success(
            res,
            { mensaje: "Función de exportación en desarrollo" },
            "Exportación en desarrollo"
        );
    },

    async descargarPlantillaReporte(req, res) {
         return responseHelper.success(
            res,
            { tipo: req.params.tipo, mensaje: "Descarga de plantilla en desarrollo" },
            "Plantilla en desarrollo"
        );
    }
};

module.exports = dashboardController;
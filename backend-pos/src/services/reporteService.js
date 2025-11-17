// src/services/reporteService.js

const db = require('../config/database');
const { 
    reporteRepository, 
    usuarioRepository 
} = require('../repositories/reporteRepository'); // Asumimos que ambos se exportan
const Reporte = require('../models/Reporte');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.status = status;
        if (details) this.details = details;
    }
}

/**
 * Lógica de negocio para Reportes.
 */
const reporteService = {

    async getAllReportes(query) {
        const { tipo, fecha_inicio, fecha_fin } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        
        const whereConditions = [];
        const params = [];
        let paramIndex = 1;

        if (tipo) {
            whereConditions.push(`r.tipo = $${paramIndex++}`);
            params.push(tipo);
        }
        if (fecha_inicio) {
            whereConditions.push(`r.fecha_generado >= $${paramIndex++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            whereConditions.push(`r.fecha_generado <= $${paramIndex++}`);
            params.push(fecha_fin + ' 23:59:59');
        }

        const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const { reportes, total } = await reporteRepository.findAll({
            whereSQL, params, limit: limitNum, offset
        });
        
        // Lógica de negocio (estadísticas del modelo)
        const estadisticas = Reporte.generarEstadisticas(reportes);
        const reportesRecientes = Reporte.getReportesRecientes(reportes);

        return {
            data: reportes.map(reporte => reporte.toJSON(false)), // Sin contenido
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
                estadisticas: estadisticas,
                resumen: {
                    recientes: reportesRecientes.length,
                    por_tipo: estadisticas.por_tipo
                }
            }
        };
    },

    async getReporteById(id) {
        const validId = QueryBuilder.validateId(id);
        const reporte = await reporteRepository.findById(validId);
        if (!reporte) {
            throw new BusinessError("Reporte no encontrado", 404);
        }
        return reporte.toJSON(true); // Incluir contenido
    },
    
    async deleteReporte(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const reporte = await reporteRepository.findById(validId);
            if (!reporte) {
                throw new BusinessError('Reporte no encontrado', 404);
            }
            
            await reporteRepository.delete(validId, client);
            
            await client.query('COMMIT');
            return reporte; // Devolver para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getEstadisticas(query) {
        const { fecha_inicio, fecha_fin, tipo } = query;
        const whereConditions = [];
        const params = [];
        let paramIndex = 1;

        if (fecha_inicio) {
            whereConditions.push(`fecha_generado >= $${paramIndex++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            whereConditions.push(`fecha_generado <= $${paramIndex++}`);
            params.push(fecha_fin + ' 23:59:59');
        }
        const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const reportes = await reporteRepository.findAllForStats({ whereSQL, params });
        
        // Lógica de negocio del modelo
        const estadisticas = Reporte.generarEstadisticas(reportes);
        const reportesRecientes = Reporte.getReportesRecientes(reportes);
        const reportesPorTipo = Reporte.filtrarPorTipo(reportes, tipo);

        const usuariosActivos = [...new Set(reportes.map(r => r.id_usuario))].length;
        const reporteMasGrande = reportes.reduce((largest, current) => 
            current.getTamanio() > (largest?.getTamanio() || 0) ? current : largest, null
        );

        return {
            ...estadisticas,
            usuarios_activos: usuariosActivos,
            reporte_mas_grande: reporteMasGrande ? {
                id: reporteMasGrande.id_reporte,
                tipo: reporteMasGrande.tipo,
                tamanio: reporteMasGrande.getTamanio(),
                fecha: reporteMasGrande.fecha_generado
            } : null,
            periodo: fecha_inicio && fecha_fin ? `${fecha_inicio} a ${fecha_fin}` : 'Todo el histórico'
        };
    },

    async generarReporte(data, userId) {
        const { tipo, id_usuario, parametros = {} } = data;

        if (!tipo) throw new BusinessError('Tipo de reporte requerido', 400);
        const validUserId = QueryBuilder.validateId(id_usuario || userId); // Usar el logueado si no se provee
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const usuario = await usuarioRepository.findById(validUserId, client);
            if (!usuario) {
                throw new BusinessError('Usuario no encontrado', 404);
            }

            let contenido = {};
            let tituloReporte = '';
            let descripcion = '';

            switch (tipo) {
                case "ventas_dia":
                    const { fecha = new Date().toISOString().split('T')[0] } = parametros;
                    const ventasResult = await reporteRepository.getReporteVentasDia(fecha, client);
                    contenido = {
                        fecha: fecha,
                        total_ventas: ventasResult.length,
                        ventas: ventasResult,
                        resumen: {
                            total_ingresos: ventasResult.reduce((sum, v) => sum + parseFloat(v.total), 0),
                            promedio_venta: ventasResult.length > 0 ? 
                                ventasResult.reduce((sum, v) => sum + parseFloat(v.total), 0) / ventasResult.length : 0
                        }
                    };
                    tituloReporte = `Reporte de Ventas - ${fecha}`;
                    descripcion = `Reporte detallado de ventas del día ${fecha}`;
                    break;

                case "top_productos":
                    const { limite = 10, fecha_inicio, fecha_fin } = parametros;
                    let whereCondition = '';
                    let queryParams = [limite];
                    let paramIndex = 2;

                    if (fecha_inicio && fecha_fin) {
                        whereCondition = `WHERE DATE(v.fecha) BETWEEN $${paramIndex++} AND $${paramIndex++}`;
                        queryParams.push(fecha_inicio, fecha_fin);
                    }
                    const topProductosResult = await reporteRepository.getReporteTopProductos(whereCondition, queryParams, client);
                    contenido = {
                        periodo: fecha_inicio && fecha_fin ? `${fecha_inicio} a ${fecha_fin}` : 'Todo el período',
                        total_productos: topProductosResult.length,
                        productos: topProductosResult,
                        parametros: { limite, fecha_inicio, fecha_fin }
                    };
                    tituloReporte = 'Productos Más Vendidos';
                    descripcion = `Top ${limite} productos más vendidos`;
                    break;

                case "stock_bajo":
                    const { stock_minimo = 5 } = parametros;
                    const stockBajoResult = await reporteRepository.getReporteStockBajo(stock_minimo, client);
                    contenido = {
                        stock_minimo: stock_minimo,
                        total_productos: stockBajoResult.length,
                        productos: stockBajoResult,
                        resumen: {
                            agotados: stockBajoResult.filter(p => parseFloat(p.stock) === 0).length,
                            stock_bajo: stockBajoResult.filter(p => parseFloat(p.stock) > 0).length
                        }
                    };
                    tituloReporte = 'Productos con Stock Bajo';
                    descripcion = `Productos con stock igual o menor a ${stock_minimo} unidades`;
                    break;

                case "inventario":
                    const inventarioResult = await reporteRepository.getReporteInventario(client);
                    contenido = {
                        fecha_generacion: new Date().toISOString(),
                        total_productos: inventarioResult.length,
                        productos: inventarioResult,
                        resumen: {
                            valor_total_inventario: inventarioResult.reduce((sum, p) => 
                                sum + (parseFloat(p.stock) * parseFloat(p.precio_compra)), 0),
                            ganancia_potencial: inventarioResult.reduce((sum, p) => 
                                sum + (parseFloat(p.ganancia_total_stock) || 0), 0)
                        }
                    };
                    tituloReporte = 'Reporte de Inventario Completo';
                    descripcion = 'Inventario completo con valoración y ganancias potenciales';
                    break;

                default:
                    throw new BusinessError(`Tipo de reporte no válido: ${tipo}`, 400);
            }

            const reporteData = {
                tipo: tipo,
                id_usuario: validUserId,
                contenido: JSON.stringify(contenido) // El modelo espera string
            };

            const validationErrors = Reporte.validate(reporteData);
            if (validationErrors.length > 0) {
                throw new BusinessError(validationErrors.join(', '), 400);
            }

            const nuevoReporte = Reporte.crear(
                tipo, 
                validUserId, 
                reporteData.contenido,
                tituloReporte // Usar el título como descripción
            );
            
            const reporteCreado = await reporteRepository.create(nuevoReporte, descripcion, client);
            
            await client.query('COMMIT');
            
            reporteCreado.usuario_nombre = usuario.nombre;
            return reporteCreado;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = reporteService;
const db = require('../config/database');
const Reporte = require('../models/Reporte');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');

const reporteController = {
    async getAll(req, res) {
        const client = await db.getClient();
        try {
            const { tipo, fecha_inicio, fecha_fin, page = 1, limit = 20 } = req.query;
            
            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.min(parseInt(limit), 50);
            const offset = (pageNum - 1) * limitNum;

            const whereConditions = [];
            const params = [];
            let paramIndex = 1;

            if (tipo) {
                whereConditions.push(`r.tipo = $${paramIndex}`);
                params.push(tipo);
                paramIndex++;
            }

            if (fecha_inicio) {
                whereConditions.push(`r.fecha_generado >= $${paramIndex}`);
                params.push(fecha_inicio);
                paramIndex++;
            }

            if (fecha_fin) {
                whereConditions.push(`r.fecha_generado <= $${paramIndex}`);
                params.push(fecha_fin + ' 23:59:59');
                paramIndex++;
            }

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
            params.push(limitNum, offset);

            // Obtener total
            const countRes = await client.query(
                `SELECT COUNT(*)::int AS total FROM reportes r ${whereSQL}`,
                params.slice(0, -2)
            );
            const total = countRes.rows[0].total;

            // Obtener datos con información de usuario
            const result = await client.query(
                `SELECT r.*, u.nombre as usuario_nombre
                 FROM reportes r
                 LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
                 ${whereSQL}
                 ORDER BY r.fecha_generado DESC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                params
            );

            // ✅ USAR MODELO REPORTE
            const reportes = result.rows.map(row => Reporte.fromDatabaseRow(row));
            
            // ✅ USAR MÉTODOS DEL MODELO PARA ESTADÍSTICAS
            const estadisticas = Reporte.generarEstadisticas(reportes);
            const reportesRecientes = Reporte.getReportesRecientes(reportes);

            logger.api("Listado de reportes obtenido", {
                total: total,
                filtros: { tipo, fecha_inicio, fecha_fin },
                estadisticas: estadisticas,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                data: reportes.map(reporte => reporte.toJSON(false)), // No incluir contenido pesado
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
            });

        } catch (error) {
            logger.error("Error en reporteController.getAll", {
                error: error.message,
                query: req.query,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo reportes", 500, error);
        } finally {
            client.release();
        }
    },

    async getById(req, res) {
        const client = await db.getClient();
        try {
            const { id } = req.params;

            // Validar ID
            QueryBuilder.validateId(id);

            const result = await client.query(
                `SELECT r.*, u.nombre as usuario_nombre
                 FROM reportes r
                 LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
                 WHERE r.id_reporte = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return responseHelper.notFound(res, "Reporte");
            }

            // ✅ USAR MODELO REPORTE
            const reporte = Reporte.fromDatabaseRow(result.rows[0]);

            logger.api("Reporte obtenido por ID", {
                reporteId: id,
                tipo: reporte.tipo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, 
                reporte.toJSON(true) // Incluir contenido completo
            );

        } catch (error) {
            logger.error("Error en reporteController.getById", {
                error: error.message,
                reporteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error obteniendo reporte", 500, error);
        } finally {
            client.release();
        }
    },

    async generarReporte(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { tipo, id_usuario, parametros = {} } = req.body;

            // Validaciones
            if (!tipo) {
                throw new Error('Tipo de reporte requerido');
            }

            if (!id_usuario || isNaN(id_usuario)) {
                throw new Error('ID de usuario inválido');
            }

            // Verificar que el usuario existe
            const usuarioExists = await client.query(
                'SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = $1',
                [id_usuario]
            );
            if (usuarioExists.rowCount === 0) {
                throw new Error('Usuario no encontrado');
            }

            let contenido = {};
            let tituloReporte = '';
            let descripcion = '';

            // ✅ GENERAR REPORTE SEGÚN EL TIPO
            switch (tipo) {
                case "ventas_dia":
                    const { fecha = new Date().toISOString().split('T')[0] } = parametros;
                    const ventasResult = await client.query(
                        `SELECT v.*, u.nombre as usuario_nombre,
                                COUNT(dv.id_detalle) as total_items,
                                JSON_AGG(
                                    JSON_BUILD_OBJECT(
                                        'producto_nombre', p.nombre,
                                        'cantidad', dv.cantidad,
                                        'precio_unitario', dv.precio_unitario,
                                        'subtotal', dv.subtotal
                                    )
                                ) as items
                         FROM ventas v
                         LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                         LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
                         LEFT JOIN productos p ON dv.id_producto = p.id_producto
                         WHERE DATE(v.fecha) = $1
                         GROUP BY v.id_venta, u.nombre
                         ORDER BY v.fecha DESC`,
                        [fecha]
                    );
                    
                    contenido = {
                        fecha: fecha,
                        total_ventas: ventasResult.rows.length,
                        ventas: ventasResult.rows,
                        resumen: {
                            total_ingresos: ventasResult.rows.reduce((sum, v) => sum + parseFloat(v.total), 0),
                            promedio_venta: ventasResult.rows.length > 0 ? 
                                ventasResult.rows.reduce((sum, v) => sum + parseFloat(v.total), 0) / ventasResult.rows.length : 0
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
                        whereCondition = `WHERE DATE(v.fecha) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                        queryParams.push(fecha_inicio, fecha_fin);
                    }

                    const topProductosResult = await client.query(
                        `SELECT p.nombre, p.codigo_barra, 
                                SUM(dv.cantidad) as total_vendido,
                                SUM(dv.subtotal) as total_ingresos,
                                COUNT(DISTINCT dv.id_venta) as veces_vendido
                         FROM detalle_venta dv
                         JOIN productos p ON dv.id_producto = p.id_producto
                         JOIN ventas v ON dv.id_venta = v.id_venta
                         ${whereCondition}
                         GROUP BY p.id_producto, p.nombre, p.codigo_barra
                         ORDER BY total_vendido DESC
                         LIMIT $1`,
                        queryParams
                    );

                    contenido = {
                        periodo: fecha_inicio && fecha_fin ? 
                            `${fecha_inicio} a ${fecha_fin}` : 'Todo el período',
                        total_productos: topProductosResult.rows.length,
                        productos: topProductosResult.rows,
                        parametros: { limite, fecha_inicio, fecha_fin }
                    };
                    tituloReporte = 'Productos Más Vendidos';
                    descripcion = `Top ${limite} productos más vendidos`;
                    break;

                case "stock_bajo":
                    const { stock_minimo = 5 } = parametros;
                    
                    const stockBajoResult = await client.query(
                        `SELECT p.*, c.nombre as categoria_nombre,
                                CASE 
                                    WHEN p.stock = 0 THEN 'AGOTADO'
                                    WHEN p.stock <= $1 THEN 'STOCK BAJO'
                                    ELSE 'SUFICIENTE'
                                END as estado_stock
                         FROM productos p
                         LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                         WHERE p.stock <= $1
                         ORDER BY p.stock ASC, p.nombre ASC`,
                        [stock_minimo]
                    );

                    contenido = {
                        stock_minimo: stock_minimo,
                        total_productos: stockBajoResult.rows.length,
                        productos: stockBajoResult.rows,
                        resumen: {
                            agotados: stockBajoResult.rows.filter(p => p.stock === 0).length,
                            stock_bajo: stockBajoResult.rows.filter(p => p.stock > 0 && p.stock <= stock_minimo).length
                        }
                    };
                    tituloReporte = 'Productos con Stock Bajo';
                    descripcion = `Productos con stock igual o menor a ${stock_minimo} unidades`;
                    break;

                case "inventario":
                    const inventarioResult = await client.query(
                        `SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre,
                                (p.precio_venta - p.precio_compra) as ganancia_unitaria,
                                (p.stock * (p.precio_venta - p.precio_compra)) as ganancia_total_stock
                         FROM productos p
                         LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                         LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                         ORDER BY p.nombre ASC`
                    );

                    contenido = {
                        fecha_generacion: new Date().toISOString(),
                        total_productos: inventarioResult.rows.length,
                        productos: inventarioResult.rows,
                        resumen: {
                            valor_total_inventario: inventarioResult.rows.reduce((sum, p) => 
                                sum + (parseFloat(p.stock) * parseFloat(p.precio_compra)), 0),
                            ganancia_potencial: inventarioResult.rows.reduce((sum, p) => 
                                sum + parseFloat(p.ganancia_total_stock || 0), 0)
                        }
                    };
                    tituloReporte = 'Reporte de Inventario Completo';
                    descripcion = 'Inventario completo con valoración y ganancias potenciales';
                    break;

                default:
                    throw new Error(`Tipo de reporte no válido: ${tipo}`);
            }

            // ✅ USAR MODELO REPORTE PARA VALIDAR
            const reporteData = {
                tipo: tipo,
                id_usuario: parseInt(id_usuario),
                contenido: JSON.stringify(contenido)
            };

            const validationErrors = Reporte.validate(reporteData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // ✅ USAR MÉTODO DEL MODELO PARA CREAR REPORTE
            const nuevoReporte = Reporte.crear(
                tipo, 
                parseInt(id_usuario), 
                JSON.stringify(contenido),
                tituloReporte
            );

            // Insertar en base de datos
            const result = await client.query(
                `INSERT INTO reportes (tipo, id_usuario, descripcion, contenido, fecha_generado)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [nuevoReporte.tipo, nuevoReporte.id_usuario, descripcion, nuevoReporte.contenido, nuevoReporte.fecha_generado]
            );

            await client.query('COMMIT');

            // ✅ CREAR INSTANCIA COMPLETA
            const reporteCreado = Reporte.fromDatabaseRow(result.rows[0]);
            reporteCreado.usuario_nombre = usuarioExists.rows[0].nombre;
            reporteCreado.titulo = tituloReporte;

            logger.audit("Reporte generado", req.user?.id_usuario, "CREATE", {
                reporteId: reporteCreado.id_reporte,
                tipo: tipo,
                titulo: tituloReporte,
                usuarioGenerador: id_usuario
            });

            return responseHelper.success(res, 
                reporteCreado.toJSON(true), // Incluir contenido del reporte
                `Reporte "${tituloReporte}" generado correctamente`, 
                201
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error("Error en reporteController.generarReporte", {
                error: error.message,
                tipo: req.body.tipo,
                usuarioGenerador: req.body.id_usuario,
                usuarioSolicitante: req.user?.id_usuario
            });
            
            if (error.message.includes('requerido') || 
                error.message.includes('inválido') ||
                error.message.includes('no encontrado') ||
                error.message.includes('no válido')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error generando reporte", 500, error);
        } finally {
            client.release();
        }
    },

    async getEstadisticasReportes(req, res) {
        const client = await db.getClient();
        try {
            const { fecha_inicio, fecha_fin } = req.query;

            const whereConditions = [];
            const params = [];
            let paramIndex = 1;

            if (fecha_inicio) {
                whereConditions.push(`fecha_generado >= $${paramIndex}`);
                params.push(fecha_inicio);
                paramIndex++;
            }

            if (fecha_fin) {
                whereConditions.push(`fecha_generado <= $${paramIndex}`);
                params.push(fecha_fin + ' 23:59:59');
                paramIndex++;
            }

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Obtener todos los reportes en el período
            const result = await client.query(
                `SELECT r.*, u.nombre as usuario_nombre
                 FROM reportes r
                 LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
                 ${whereSQL}
                 ORDER BY r.fecha_generado DESC`,
                params
            );

            // ✅ USAR MODELO REPORTE PARA ANÁLISIS
            const reportes = result.rows.map(row => Reporte.fromDatabaseRow(row));
            
            const estadisticas = Reporte.generarEstadisticas(reportes);
            const reportesRecientes = Reporte.getReportesRecientes(reportes);
            const reportesPorTipo = Reporte.filtrarPorTipo(reportes, req.query.tipo);

            // Estadísticas avanzadas
            const usuariosActivos = [...new Set(reportes.map(r => r.id_usuario))].length;
            const reporteMasGrande = reportes.reduce((largest, current) => 
                current.getTamanio() > largest.getTamanio() ? current : largest, reportes[0] || null
            );

            const estadisticasAvanzadas = {
                ...estadisticas,
                usuarios_activos: usuariosActivos,
                reporte_mas_grande: reporteMasGrande ? {
                    id: reporteMasGrande.id_reporte,
                    tipo: reporteMasGrande.tipo,
                    tamanio: reporteMasGrande.getTamanio(),
                    fecha: reporteMasGrande.fecha_generado
                } : null,
                periodo: fecha_inicio && fecha_fin ? 
                    `${fecha_inicio} a ${fecha_fin}` : 'Todo el histórico'
            };

            logger.api("Estadísticas de reportes generadas", {
                total_reportes: reportes.length,
                periodo: estadisticasAvanzadas.periodo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticasAvanzadas);

        } catch (error) {
            logger.error("Error en reporteController.getEstadisticasReportes", {
                error: error.message,
                query: req.query,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error generando estadísticas de reportes", 500, error);
        } finally {
            client.release();
        }
    },

    async delete(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { id } = req.params;

            // Validar ID
            QueryBuilder.validateId(id);

            // Verificar que el reporte existe
            const reporteExistente = await client.query(
                `SELECT r.*, u.nombre as usuario_nombre
                 FROM reportes r
                 LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
                 WHERE r.id_reporte = $1`,
                [id]
            );

            if (reporteExistente.rowCount === 0) {
                throw new Error('Reporte no encontrado');
            }

            // ✅ USAR MODELO REPORTE
            const reporte = Reporte.fromDatabaseRow(reporteExistente.rows[0]);

            // Eliminar reporte
            const result = await client.query(
                'DELETE FROM reportes WHERE id_reporte = $1 RETURNING id_reporte',
                [id]
            );

            await client.query('COMMIT');

            logger.audit("Reporte eliminado", req.user?.id_usuario, "DELETE", {
                reporteId: id,
                tipo: reporte.tipo,
                titulo: reporte.getTitulo(),
                usuarioOriginal: reporte.id_usuario
            });

            return responseHelper.success(res, null, "Reporte eliminado correctamente");

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error("Error en reporteController.delete", {
                error: error.message,
                reporteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido') || error.message.includes('no encontrado')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error eliminando reporte", 500, error);
        } finally {
            client.release();
        }
    }
};

module.exports = reporteController;
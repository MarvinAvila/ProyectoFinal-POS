const db = require('../config/database');
const Alerta = require('../models/Alerta');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

const alertaController = {
    async getAll(req, res) {
        const client = await db.getClient();
        try {
            const { tipo, atendida, page = 1, limit = 50 } = req.query;
            const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);

            const whereConditions = [];
            const params = [];
            let paramIndex = 1;

            if (tipo) {
                whereConditions.push(`a.tipo = $${paramIndex}`);
                params.push(tipo);
                paramIndex++;
            }

            if (atendida !== undefined) {
                whereConditions.push(`a.atendida = $${paramIndex}`);
                params.push(atendida === 'true');
                paramIndex++;
            }

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
            params.push(limitNum, offset);

            // Obtener total
            const countRes = await client.query(
                `SELECT COUNT(*)::int AS total FROM alertas a ${whereSQL}`,
                params.slice(0, -2)
            );
            const total = countRes.rows[0].total;

            // Obtener datos con información de producto       ---------- ------------------------alertas aqui mero le movi 
           const result = await client.query(
  `SELECT a.*, p.nombre AS producto_nombre, p.codigo_barra, p.stock, p.fecha_caducidad
   FROM alertas a
   JOIN productos p ON a.id_producto = p.id_producto
   ${whereSQL}
   -- 🔹 Solo mostrar alertas aún válidas
   AND (
     (a.tipo = 'stock_bajo' AND p.stock <= 5)
     OR (a.tipo = 'caducidad' AND p.fecha_caducidad <= CURRENT_DATE + INTERVAL '7 days')
     OR (a.tipo NOT IN ('stock_bajo', 'caducidad'))
   )
   ORDER BY a.fecha DESC
   LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
  params
);
//---------------------------------

            const alertas = result.rows.map(row => Alerta.fromDatabaseRow(row));
            const estadisticas = Alerta.calcularEstadisticas(alertas);
            const clasificadas = Alerta.clasificarAlertas(alertas);

            logger.api("Listado de alertas obtenido", {
                total: total,
                filtros: { tipo, atendida },
                estadisticas: estadisticas,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                alertas: alertas.map(alerta => alerta.toJSON()),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                },
                estadisticas: estadisticas,
                resumen: {
                    pendientes: clasificadas.pendientes.length,
                    atendidas: clasificadas.atendidas.length,
                    caducidad: clasificadas.caducidad.length,
                    stock_bajo: clasificadas.stock_bajo.length
                }
            });

        } catch (error) {
            logger.error("Error en alertaController.getAll", {
                error: error.message,
                query: req.query,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo alertas", 500, error);
        } finally {
            client.release();
        }
    },

    async getPendientes(req, res) {
        const client = await db.getClient();
        try {
            const result = await client.query(
                `SELECT a.*, p.nombre as producto_nombre, p.codigo_barra, p.stock, p.fecha_caducidad
                 FROM alertas a
                 JOIN productos p ON a.id_producto = p.id_producto
                 WHERE a.atendida = FALSE
                 ORDER BY 
                   CASE WHEN a.tipo = 'caducidad' THEN 1 ELSE 2 END,
                   a.fecha DESC`
            );

            const alertas = result.rows.map(row => Alerta.fromDatabaseRow(row));
            const estadisticas = Alerta.calcularEstadisticas(alertas);

            logger.api("Alertas pendientes obtenidas", {
                total: alertas.length,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                alertas: alertas.map(alerta => alerta.toJSON()),
                estadisticas: estadisticas
            });

        } catch (error) {
            logger.error("Error en alertaController.getPendientes", {
                error: error.message,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo alertas pendientes", 500, error);
        } finally {
            client.release();
        }
    },

    async getById(req, res) {
        const client = await db.getClient();
        try {
            const id = QueryBuilder.validateId(req.params.id);

            const result = await client.query(
                `SELECT a.*, p.nombre as producto_nombre, p.codigo_barra, p.stock, p.fecha_caducidad
                 FROM alertas a
                 JOIN productos p ON a.id_producto = p.id_producto
                 WHERE a.id_alerta = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return responseHelper.notFound(res, 'Alerta');
            }

            const alerta = Alerta.fromDatabaseRow(result.rows[0]);

            logger.api("Alerta obtenida por ID", {
                alertaId: id,
                tipo: alerta.tipo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, alerta.toJSON());

        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de alerta inválido', 400);
            }
            
            logger.error("Error en alertaController.getById", {
                error: error.message,
                alertaId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo alerta", 500, error);
        } finally {
            client.release();
        }
    },

    async marcarAtendida(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const id = QueryBuilder.validateId(req.params.id);

            // Verificar que la alerta existe y obtener información
            const alertaExistente = await client.query(
                `SELECT a.*, p.nombre as producto_nombre 
                 FROM alertas a 
                 JOIN productos p ON a.id_producto = p.id_producto 
                 WHERE a.id_alerta = $1`,
                [id]
            );

            if (alertaExistente.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Alerta');
            }

            const alerta = Alerta.fromDatabaseRow(alertaExistente.rows[0]);

            if (alerta.atendida) {
                await client.query('ROLLBACK');
                return responseHelper.error(res, 'La alerta ya está atendida', 400);
            }

            // Marcar como atendida
            const result = await client.query(
                'UPDATE alertas SET atendida = TRUE, fecha_atendida = CURRENT_TIMESTAMP WHERE id_alerta = $1 RETURNING *',
                [id]
            );

            await client.query('COMMIT');

            const alertaActualizada = Alerta.fromDatabaseRow(result.rows[0]);
            alertaActualizada.producto_nombre = alerta.producto_nombre;

            // ✅ FIX: La llamada a logger.audit debe tener 3 argumentos, no 4.
            logger.audit("Alerta marcada como atendida", req.user?.id_usuario, {
                alertaId: id,
                action: "UPDATE", // Se puede incluir la acción dentro de los detalles
                tipo: alerta.tipo,
                producto: alerta.producto_nombre
            });

            return responseHelper.success(res, 
                alertaActualizada.toJSON(), 
                "Alerta marcada como atendida correctamente"
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de alerta inválido', 400);
            }
            
            logger.error("Error en alertaController.marcarAtendida", {
                error: error.message,
                alertaId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error actualizando alerta", 500, error);
        } finally {
            client.release();
        }
    },

    async crearAlertaStockBajo(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { id_producto, stock_minimo = 5 } = req.body;

            // Validaciones
            if (!id_producto) {
                await client.query('ROLLBACK');
                return responseHelper.error(res, 'ID de producto es requerido', 400);
            }

            const productoId = QueryBuilder.validateId(id_producto);

            // Verificar producto
            const producto = await client.query(
                'SELECT id_producto, nombre, stock FROM productos WHERE id_producto = $1',
                [productoId]
            );

            if (producto.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Producto');
            }

            const stockActual = parseFloat(producto.rows[0].stock);
            
            if (stockActual > stock_minimo) {
                await client.query('ROLLBACK');
                return responseHelper.error(res, `El producto tiene suficiente stock (${stockActual} unidades)`, 400);
            }

            // Verificar si ya existe alerta pendiente para este producto
            const alertaExistente = await client.query(
                'SELECT id_alerta FROM alertas WHERE id_producto = $1 AND tipo = $2 AND atendida = FALSE',
                [productoId, 'stock_bajo']
            );

            if (alertaExistente.rows.length > 0) {
                await client.query('ROLLBACK');
                return responseHelper.conflict(res, 'Ya existe una alerta de stock bajo pendiente para este producto');
            }

            // Crear alerta usando el modelo
            const nuevaAlerta = Alerta.crearAlertaStockBajo(productoId, stockActual, stock_minimo);

            // Insertar en base de datos
            const result = await client.query(
                `INSERT INTO alertas (id_producto, tipo, mensaje, fecha, atendida)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [nuevaAlerta.id_producto, nuevaAlerta.tipo, nuevaAlerta.mensaje, nuevaAlerta.fecha, nuevaAlerta.atendida]
            );

            await client.query('COMMIT');

            const alertaCreada = Alerta.fromDatabaseRow(result.rows[0]);
            alertaCreada.producto_nombre = producto.rows[0].nombre;

            logger.audit("Alerta de stock bajo creada", req.user?.id_usuario, "CREATE", {
                productoId: productoId,
                productoNombre: producto.rows[0].nombre,
                stockActual: stockActual,
                stockMinimo: stock_minimo
            });

            return responseHelper.success(res, 
                alertaCreada.toJSON(), 
                "Alerta de stock bajo creada correctamente", 
                201
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de producto inválido', 400);
            }
            
            logger.error("Error en alertaController.crearAlertaStockBajo", {
                error: error.message,
                datos: req.body,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error creando alerta", 500, error);
        } finally {
            client.release();
        }
    },

    async delete(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const id = QueryBuilder.validateId(req.params.id);

            // Verificar que la alerta existe
            const alertaExistente = await client.query(
                'SELECT * FROM alertas WHERE id_alerta = $1',
                [id]
            );

            if (alertaExistente.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Alerta');
            }

            const alerta = Alerta.fromDatabaseRow(alertaExistente.rows[0]);

            // Eliminar alerta
            await client.query('DELETE FROM alertas WHERE id_alerta = $1', [id]);

            await client.query('COMMIT');

            logger.audit("Alerta eliminada", req.user?.id_usuario, "DELETE", {
                alertaId: id,
                tipo: alerta.tipo,
                productoId: alerta.id_producto
            });

            return responseHelper.success(res, null, "Alerta eliminada correctamente");

        } catch (error) {
            await client.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de alerta inválido', 400);
            }
            
            logger.error("Error en alertaController.delete", {
                error: error.message,
                alertaId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error eliminando alerta", 500, error);
        } finally {
            client.release();
        }
    },

    async getEstadisticas(req, res) {
        const client = await db.getClient();
        try {
            const { dias = 30 } = req.query;

            // Estadísticas generales
            const estadisticasResult = await client.query(`
                SELECT 
                    COUNT(*) as total_alertas,
                    COUNT(*) FILTER (WHERE atendida = TRUE) as alertas_atendidas,
                    COUNT(*) FILTER (WHERE atendida = FALSE) as alertas_pendientes,
                    COUNT(*) FILTER (WHERE tipo = 'caducidad') as alertas_caducidad,
                    COUNT(*) FILTER (WHERE tipo = 'stock_bajo') as alertas_stock_bajo
                FROM alertas
                WHERE fecha >= CURRENT_DATE - INTERVAL '${dias} days'
            `);

            // Alertas por día (últimos 15 días)
            const alertasPorDia = await client.query(`
                SELECT 
                    DATE(fecha) as fecha,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE tipo = 'caducidad') as caducidad,
                    COUNT(*) FILTER (WHERE tipo = 'stock_bajo') as stock_bajo
                FROM alertas
                WHERE fecha >= CURRENT_DATE - INTERVAL '15 days'
                GROUP BY DATE(fecha)
                ORDER BY fecha DESC
            `);

            // Productos con más alertas
            const productosConAlertas = await client.query(`
                SELECT 
                    p.nombre as producto_nombre,
                    COUNT(a.id_alerta) as total_alertas,
                    COUNT(a.id_alerta) FILTER (WHERE a.tipo = 'caducidad') as alertas_caducidad,
                    COUNT(a.id_alerta) FILTER (WHERE a.tipo = 'stock_bajo') as alertas_stock
                FROM productos p
                JOIN alertas a ON p.id_producto = a.id_producto
                WHERE a.fecha >= CURRENT_DATE - INTERVAL '${dias} days'
                GROUP BY p.id_producto, p.nombre
                ORDER BY total_alertas DESC
                LIMIT 10
            `);

            const estadisticas = {
                general: {
                    total_alertas: parseInt(estadisticasResult.rows[0].total_alertas) || 0,
                    alertas_atendidas: parseInt(estadisticasResult.rows[0].alertas_atendidas) || 0,
                    alertas_pendientes: parseInt(estadisticasResult.rows[0].alertas_pendientes) || 0,
                    alertas_caducidad: parseInt(estadisticasResult.rows[0].alertas_caducidad) || 0,
                    alertas_stock_bajo: parseInt(estadisticasResult.rows[0].alertas_stock_bajo) || 0
                },
                alertas_por_dia: alertasPorDia.rows,
                productos_con_mas_alertas: productosConAlertas.rows
            };

            logger.api("Estadísticas de alertas obtenidas", {
                dias: dias,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            logger.error("Error en alertaController.getEstadisticas", {
                error: error.message,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo estadísticas de alertas", 500, error);
        } finally {
            client.release();
        }
    }
};

module.exports = alertaController;
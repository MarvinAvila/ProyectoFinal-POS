// src/controllers/inventarioController.js - Actualizado
const db = require('../config/database');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const HistorialInventario = require('../models/HistorialInventario');

const inventarioController = {
    async historial(req, res) {
        const client = await db.connect();
        try {
            const { id_producto, page = 1, limit = 50, motivo, tipo, fecha_inicio, fecha_fin } = req.query;
            
            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.min(parseInt(limit), 100);
            const offset = (pageNum - 1) * limitNum;

            const whereConditions = [];
            const params = [];
            let paramIndex = 1;

            if (id_producto) {
                QueryBuilder.validateId(id_producto);
                whereConditions.push(`hi.id_producto = $${paramIndex}`);
                params.push(id_producto);
                paramIndex++;
            }

            if (motivo) {
                whereConditions.push(`hi.motivo = $${paramIndex}`);
                params.push(motivo);
                paramIndex++;
            }

            if (tipo) {
                if (tipo === 'entrada') {
                    whereConditions.push(`hi.cambio > 0`);
                } else if (tipo === 'salida') {
                    whereConditions.push(`hi.cambio < 0`);
                }
            }

            if (fecha_inicio) {
                whereConditions.push(`hi.fecha >= $${paramIndex}`);
                params.push(fecha_inicio);
                paramIndex++;
            }

            if (fecha_fin) {
                whereConditions.push(`hi.fecha <= $${paramIndex}`);
                params.push(fecha_fin + ' 23:59:59');
                paramIndex++;
            }

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
            params.push(limitNum, offset);

            // Obtener total
            const countRes = await client.query(
                `SELECT COUNT(*)::int AS total FROM historial_inventario hi ${whereSQL}`,
                params.slice(0, -2)
            );
            const total = countRes.rows[0].total;

            // Obtener datos con información relacionada
            const result = await client.query(
                `SELECT hi.*, p.nombre as producto_nombre, p.codigo_barra, u.nombre as usuario_nombre
                 FROM historial_inventario hi
                 LEFT JOIN productos p ON hi.id_producto = p.id_producto
                 LEFT JOIN usuarios u ON hi.id_usuario = u.id_usuario
                 ${whereSQL}
                 ORDER BY hi.fecha DESC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                params
            );

            // ✅ USAR MODELO PARA TRANSFORMAR RESULTADOS
            const movimientos = result.rows.map(row => HistorialInventario.fromDatabaseRow(row));
            
            // ✅ USAR MÉTODOS DEL MODELO PARA ESTADÍSTICAS
            const estadisticas = HistorialInventario.calcularEstadisticas(movimientos);
            const clasificados = HistorialInventario.clasificarMovimientos(movimientos);

            logger.api("Historial de inventario consultado", {
                total_movimientos: total,
                filtros: { id_producto, motivo, tipo },
                estadisticas: estadisticas,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                data: movimientos.map(m => m.toJSON()), // ✅ Serializar con toJSON()
                meta: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum),
                    estadisticas: estadisticas,
                    resumen: {
                        entradas: clasificados.entradas.length,
                        salidas: clasificados.salidas.length,
                        ventas: clasificados.ventas.length,
                        compras: clasificados.compras.length
                    }
                }
            });

        } catch (error) {
            logger.error("Error en inventarioController.historial", {
                error: error.message,
                query: req.query,
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error obteniendo historial de inventario", 500, error);
        } finally {
            client.release();
        }
    },

    async ajuste(req, res) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const { id_producto, cambio, motivo, id_usuario, nota } = req.body;
            
            // ✅ USAR VALIDACIÓN DEL MODELO
            const movimientoData = {
                id_producto,
                cambio,
                motivo: motivo || 'ajuste',
                id_usuario: id_usuario || req.user?.id_usuario
            };
            
            const validationErrors = HistorialInventario.validate(movimientoData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // Verificar que el producto existe
            const productoExists = await client.query(
                'SELECT id_producto, nombre, stock FROM productos WHERE id_producto = $1', 
                [id_producto]
            );
            
            if (productoExists.rowCount === 0) {
                throw new Error('Producto no encontrado');
            }

            // Verificar que el stock resultante no sea negativo
            const nuevoStock = parseFloat(productoExists.rows[0].stock) + parseFloat(cambio);
            if (nuevoStock < 0) {
                throw new Error(`Stock insuficiente. Stock actual: ${productoExists.rows[0].stock}, cambio solicitado: ${cambio}`);
            }

            // ✅ USAR MÉTODO DEL MODELO PARA CREAR MOVIMIENTO
            const movimiento = HistorialInventario.crearAjuste(
                id_producto, 
                cambio, 
                id_usuario || req.user?.id_usuario,
                nota
            );

            // Insertar en historial
            const insertHist = await client.query(
                `INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [movimiento.id_producto, movimiento.cambio, movimiento.motivo, movimiento.id_usuario]
            );

            // Actualizar stock del producto
            await client.query(
                `UPDATE productos SET stock = stock + $1 WHERE id_producto = $2`,
                [cambio, id_producto]
            );

            // Obtener stock actualizado
            const productoActualizado = await client.query(
                'SELECT stock FROM productos WHERE id_producto = $1',
                [id_producto]
            );

            await client.query('COMMIT');

            // ✅ CREAR INSTANCIA COMPLETA DEL MOVIMIENTO
            const movimientoCompleto = HistorialInventario.fromDatabaseRow(insertHist.rows[0]);
            movimientoCompleto.producto_nombre = productoExists.rows[0].nombre;

            logger.audit("Ajuste de inventario realizado", req.user?.id_usuario, "UPDATE", {
                productoId: id_producto,
                productoNombre: productoExists.rows[0].nombre,
                cambio: cambio,
                stockAnterior: productoExists.rows[0].stock,
                stockNuevo: productoActualizado.rows[0].stock,
                motivo: movimiento.motivo
            });

            return responseHelper.success(res, 
                movimientoCompleto.toJSON(), 
                `Ajuste de inventario realizado para ${productoExists.rows[0].nombre}`, 
                201
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error("Error en inventarioController.ajuste", {
                error: error.message,
                datos: req.body,
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido') || 
                error.message.includes('obligatorio') || 
                error.message.includes('no encontrado') ||
                error.message.includes('Stock insuficiente')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error registrando ajuste de inventario", 500, error);
        } finally {
            client.release();
        }
    },

    async estadisticas(req, res) {
        const client = await db.connect();
        try {
            const { fecha_inicio, fecha_fin } = req.query;
            
            const whereConditions = [];
            const params = [];
            let paramIndex = 1;

            if (fecha_inicio) {
                whereConditions.push(`hi.fecha >= $${paramIndex}`);
                params.push(fecha_inicio);
                paramIndex++;
            }

            if (fecha_fin) {
                whereConditions.push(`hi.fecha <= $${paramIndex}`);
                params.push(fecha_fin + ' 23:59:59');
                paramIndex++;
            }

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Obtener todos los movimientos en el rango
            const result = await client.query(
                `SELECT hi.*, p.nombre as producto_nombre, u.nombre as usuario_nombre
                 FROM historial_inventario hi
                 LEFT JOIN productos p ON hi.id_producto = p.id_producto
                 LEFT JOIN usuarios u ON hi.id_usuario = u.id_usuario
                 ${whereSQL}
                 ORDER BY hi.fecha DESC`,
                params
            );

            // ✅ USAR MODELO PARA ANÁLISIS
            const movimientos = result.rows.map(row => HistorialInventario.fromDatabaseRow(row));
            
            const estadisticas = HistorialInventario.calcularEstadisticas(movimientos);
            const resumenProductos = HistorialInventario.resumenPorProducto(movimientos);

            logger.api("Estadísticas de inventario generadas", {
                total_movimientos: movimientos.length,
                rango_fechas: { fecha_inicio, fecha_fin },
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                estadisticas: estadisticas,
                resumen_por_producto: resumenProductos.map(p => ({
                    ...p,
                    movimientos: p.movimientos.map(m => m.toJSON())
                })),
                movimientos_recientes: movimientos.slice(0, 10).map(m => m.toJSON())
            });

        } catch (error) {
            logger.error("Error en inventarioController.estadisticas", error);
            return responseHelper.error(res, "Error generando estadísticas", 500, error);
        } finally {
            client.release();
        }
    }
};

module.exports = inventarioController;
const db = require('../config/database');
const ProductoOferta = require('../models/ProductoOferta');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

const productoOfertaController = {
    async getAll(req, res) {
        const client = await db.getClient();
        try {
            const { activa, page = 1, limit = 50 } = req.query;
            const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);

            const whereConditions = [];
            const params = [];
            let paramIndex = 1;

            if (activa !== undefined) {
                whereConditions.push(`o.activo = $${paramIndex}`);
                params.push(activa === 'true');
                paramIndex++;
            }

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
            params.push(limitNum, offset);

            const result = await db.query(`
                SELECT po.*, p.nombre as producto_nombre, p.precio_venta, 
                       o.nombre as oferta_nombre, o.porcentaje_descuento, o.activo,
                       o.fecha_inicio, o.fecha_fin
                FROM producto_oferta po
                LEFT JOIN productos p ON p.id_producto = po.id_producto
                LEFT JOIN ofertas o ON o.id_oferta = po.id_oferta
                ${whereSQL}
                ORDER BY o.fecha_inicio DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, params);

            // Obtener total para paginación
            const countResult = await db.query(
                `SELECT COUNT(*) FROM producto_oferta po 
                 LEFT JOIN ofertas o ON o.id_oferta = po.id_oferta 
                 ${whereSQL}`,
                params.slice(0, params.length - 2)
            );
            const total = parseInt(countResult.rows[0].count);

            const relaciones = result.rows.map(row => ProductoOferta.fromDatabaseRow(row));
            
            logger.api("Relaciones producto-oferta obtenidas", {
                total: relaciones.length,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                relaciones: relaciones.map(rel => rel.toJSON()),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });

        } catch (error) {
            logger.error('Error en productoOfertaController.getAll', {
                error: error.message,
                query: req.query,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, 'Error obteniendo relaciones producto-oferta', 500, error);
        } finally {
            client.release();
        }
    },

    async getOffersByProduct(req, res) {
        const client = await db.getClient();
        try {
            const { id_producto } = req.params;
            const { page = 1, limit = 50, solo_activas } = req.query;
            const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);

            // Validar ID
            const productoId = QueryBuilder.validateId(id_producto);

            const whereConditions = ['po.id_producto = $1'];
            const params = [productoId];
            let paramIndex = 2;

            if (solo_activas === 'true') {
                whereConditions.push(`o.activo = $${paramIndex}`);
                params.push(true);
                paramIndex++;
            }

            const whereSQL = `WHERE ${whereConditions.join(' AND ')}`;
            params.push(limitNum, offset);

            const result = await db.query(`
                SELECT po.*, o.*, p.nombre as producto_nombre, p.precio_venta,
                       (p.precio_venta * (1 - o.porcentaje_descuento / 100)) as precio_oferta
                FROM producto_oferta po
                JOIN ofertas o ON o.id_oferta = po.id_oferta
                JOIN productos p ON p.id_producto = po.id_producto
                ${whereSQL}
                ORDER BY o.fecha_inicio DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, params);

            // Obtener total
            const countResult = await db.query(
                `SELECT COUNT(*) FROM producto_oferta po 
                 JOIN ofertas o ON o.id_oferta = po.id_oferta 
                 ${whereSQL}`,
                params.slice(0, params.length - 2)
            );
            const total = parseInt(countResult.rows[0].count);

            const relaciones = result.rows.map(row => ProductoOferta.fromDatabaseRow(row));

            logger.api("Ofertas por producto obtenidas", {
                productoId: productoId,
                totalOfertas: total,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                producto_id: productoId,
                relaciones: relaciones.map(rel => rel.toJSON()),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });

        } catch (error) {
            logger.error('Error en productoOfertaController.getOffersByProduct', {
                error: error.message,
                productoId: req.params.id_producto,
                usuario: req.user?.id_usuario
            });
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de producto inválido', 400, error);
            }
            
            return responseHelper.error(res, 'Error obteniendo ofertas del producto', 500, error);
        } finally {
            client.release();
        }
    },

    async getProductsByOffer(req, res) {
        const client = await db.getClient();
        try {
            const { id_oferta } = req.params;
            const { page = 1, limit = 50, con_precio = 'true' } = req.query;
            const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(req.query);

            // Validar ID
            const ofertaId = QueryBuilder.validateId(id_oferta);

            const params = [ofertaId];
            params.push(limitNum, offset);

            let precioSelect = '';
            if (con_precio === 'true') {
                precioSelect = ', (p.precio_venta * (1 - o.porcentaje_descuento / 100)) as precio_oferta';
            }

            const result = await db.query(`
                SELECT po.*, p.*, o.nombre as oferta_nombre, o.porcentaje_descuento
                       ${precioSelect}
                FROM producto_oferta po
                JOIN productos p ON p.id_producto = po.id_producto
                JOIN ofertas o ON o.id_oferta = po.id_oferta
                WHERE po.id_oferta = $1
                ORDER BY p.nombre
                LIMIT $2 OFFSET $3
            `, params);

            // Obtener total
            const countResult = await db.query(
                'SELECT COUNT(*) FROM producto_oferta WHERE id_oferta = $1',
                [ofertaId]
            );
            const total = parseInt(countResult.rows[0].count);

            const relaciones = result.rows.map(row => ProductoOferta.fromDatabaseRow(row));

            // Obtener información de la oferta
            const ofertaResult = await db.query(
                'SELECT * FROM ofertas WHERE id_oferta = $1',
                [ofertaId]
            );

            logger.api("Productos por oferta obtenidos", {
                ofertaId: ofertaId,
                totalProductos: total,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                oferta: ofertaResult.rows[0] || null,
                relaciones: relaciones.map(rel => rel.toJSON()),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });

        } catch (error) {
            logger.error('Error en productoOfertaController.getProductsByOffer', {
                error: error.message,
                ofertaId: req.params.id_oferta,
                usuario: req.user?.id_usuario
            });
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de oferta inválido', 400, error);
            }
            
            return responseHelper.error(res, 'Error obteniendo productos de la oferta', 500, error);
        } finally {
            client.release();
        }
    },

    async assign(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { id_producto, id_oferta } = req.body;

            // Validar IDs
            const productoId = QueryBuilder.validateId(id_producto);
            const ofertaId = QueryBuilder.validateId(id_oferta);

            // Verificar que el producto existe
            const productoExists = await client.query(
                'SELECT id_producto, nombre FROM productos WHERE id_producto = $1',
                [productoId]
            );
            if (productoExists.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Producto');
            }

            // Verificar que la oferta existe y está activa
            const ofertaExists = await client.query(
                'SELECT id_oferta, nombre, activo FROM ofertas WHERE id_oferta = $1',
                [ofertaId]
            );
            if (ofertaExists.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Oferta');
            }
            if (!ofertaExists.rows[0].activo) {
                await client.query('ROLLBACK');
                return responseHelper.error(res, 'No se pueden asignar productos a ofertas inactivas', 400);
            }

            // Verificar que no existe ya la relación
            const relacionExists = await client.query(
                'SELECT id_producto FROM producto_oferta WHERE id_producto = $1 AND id_oferta = $2',
                [productoId, ofertaId]
            );
            if (relacionExists.rows.length > 0) {
                await client.query('ROLLBACK');
                return responseHelper.conflict(res, 'El producto ya está asignado a esta oferta');
            }

            // Crear relación
            const result = await client.query(
                'INSERT INTO producto_oferta (id_producto, id_oferta) VALUES ($1, $2) RETURNING *',
                [productoId, ofertaId]
            );

            await client.query('COMMIT');

            const relacionCreada = ProductoOferta.fromDatabaseRow(result.rows[0]);
            relacionCreada.producto_nombre = productoExists.rows[0].nombre;
            relacionCreada.oferta_nombre = ofertaExists.rows[0].nombre;

            logger.audit("Producto asignado a oferta", req.user?.id_usuario, "CREATE", {
                productoId: productoId,
                productoNombre: productoExists.rows[0].nombre,
                ofertaId: ofertaId,
                ofertaNombre: ofertaExists.rows[0].nombre
            });

            return responseHelper.success(res, 
                relacionCreada.toJSON(),
                "Producto asignado a oferta correctamente", 
                201
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error('Error en productoOfertaController.assign', {
                error: error.message,
                datos: req.body,
                usuario: req.user?.id_usuario
            });
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID inválido en los datos proporcionados', 400);
            }
            
            if (error.code === '23505') {
                return responseHelper.conflict(res, 'La relación producto-oferta ya existe');
            }
            
            return responseHelper.error(res, 'Error asignando producto a oferta', 500, error);
        } finally {
            client.release();
        }
    },

    async unassign(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { id_producto, id_oferta } = req.body;

            // Validar IDs
            const productoId = QueryBuilder.validateId(id_producto);
            const ofertaId = QueryBuilder.validateId(id_oferta);

            // Verificar que la relación existe
            const relacionExists = await client.query(
                `SELECT po.*, p.nombre as producto_nombre, o.nombre as oferta_nombre 
                 FROM producto_oferta po
                 JOIN productos p ON po.id_producto = p.id_producto
                 JOIN ofertas o ON po.id_oferta = o.id_oferta
                 WHERE po.id_producto = $1 AND po.id_oferta = $2`,
                [productoId, ofertaId]
            );
            
            if (relacionExists.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Relación producto-oferta');
            }

            // Eliminar relación
            await client.query(
                'DELETE FROM producto_oferta WHERE id_producto = $1 AND id_oferta = $2',
                [productoId, ofertaId]
            );

            await client.query('COMMIT');

            const relacion = relacionExists.rows[0];
            
            logger.audit("Producto desasignado de oferta", req.user?.id_usuario, "DELETE", {
                productoId: productoId,
                productoNombre: relacion.producto_nombre,
                ofertaId: ofertaId,
                ofertaNombre: relacion.oferta_nombre
            });

            return responseHelper.success(res, null, 'Producto desasignado de la oferta correctamente');

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error('Error en productoOfertaController.unassign', {
                error: error.message,
                datos: req.body,
                usuario: req.user?.id_usuario
            });
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID inválido en los datos proporcionados', 400);
            }
            
            return responseHelper.error(res, 'Error desasignando producto de oferta', 500, error);
        } finally {
            client.release();
        }
    },

    async getActiveOffersByProduct(req, res) {
        const client = await db.getClient();
        try {
            const { id_producto } = req.params;

            // Validar ID
            const productoId = QueryBuilder.validateId(id_producto);

            const result = await db.query(`
                SELECT po.*, o.*, p.nombre as producto_nombre, p.precio_venta,
                       (p.precio_venta * (1 - o.porcentaje_descuento / 100)) as precio_oferta
                FROM producto_oferta po
                JOIN ofertas o ON o.id_oferta = po.id_oferta
                JOIN productos p ON p.id_producto = po.id_producto
                WHERE po.id_producto = $1 
                AND o.activo = true 
                AND o.fecha_inicio <= CURRENT_DATE 
                AND o.fecha_fin >= CURRENT_DATE
                ORDER BY o.porcentaje_descuento DESC
            `, [productoId]);

            const relaciones = result.rows.map(row => ProductoOferta.fromDatabaseRow(row));

            logger.api("Ofertas activas por producto obtenidas", {
                productoId: productoId,
                totalOfertasActivas: relaciones.length,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, 
                relaciones.map(rel => rel.toJSON())
            );

        } catch (error) {
            logger.error('Error en productoOfertaController.getActiveOffersByProduct', {
                error: error.message,
                productoId: req.params.id_producto,
                usuario: req.user?.id_usuario
            });
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de producto inválido', 400, error);
            }
            
            return responseHelper.error(res, 'Error obteniendo ofertas activas del producto', 500, error);
        } finally {
            client.release();
        }
    }
};

module.exports = productoOfertaController;
const db = require('../config/database');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');
const Producto = require('../models/Producto');
const ModelMapper = require('../utils/modelMapper');

const productoController = {
    async getAll(req, res) {
        const client = await db.connect();
        try {
            const { q, categoria, page = 1, limit = 50 } = req.query;
            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.min(parseInt(limit), 100);
            const offset = (pageNum - 1) * limitNum;
            
            const searchTerm = q ? QueryBuilder.sanitizeSearchTerm(q) : null;
            
            const params = [];
            const whereConditions = [];
            let paramIndex = 1;

            if (searchTerm) {
                whereConditions.push(`(p.nombre ILIKE $${paramIndex} OR p.descripcion ILIKE $${paramIndex})`);
                params.push(searchTerm);
                paramIndex++;
            }
            
            if (categoria && !isNaN(categoria)) {
                whereConditions.push(`p.id_categoria = $${paramIndex}`);
                params.push(parseInt(categoria));
                paramIndex++;
            }

            const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
            params.push(limitNum, offset);

            const sql = `
                SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                ${whereSQL}
                ORDER BY p.nombre ASC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            
            const result = await client.query(sql, params);

            // ✅ USAR MODELOS en lugar de rows directamente
            const productos = ModelMapper.toProductoList(result.rows);

            // ✅ Ahora podemos usar métodos del modelo
            const productosConAlerta = productos.map(producto => {
                return {
                    ...producto,
                    necesita_reposicion: producto.necesitaReposicion(),
                    por_caducar: producto.estaPorCaducar(),
                    margen_ganancia: producto.margenGanancia()
                };
            });

            logger.api("Listado de productos obtenido", {
                total: productos.length,
                con_alerta_stock: productos.filter(p => p.necesitaReposicion()).length
            });

            return responseHelper.success(res, productosConAlerta);

        } catch (error) {
            logger.error("Error en productoController.getAll", error);
            return responseHelper.error(res, "Error obteniendo productos", 500, error);
        } finally {
            client.release();
        }
    },

    async getById(req, res) {
        const client = await db.connect();
        try {
            const { id } = req.params;
            QueryBuilder.validateId(id);

            const result = await client.query(
                `SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
                 FROM productos p
                 LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                 LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                 WHERE p.id_producto = $1`,
                [id]
            );
            
            if (result.rowCount === 0) {
                return responseHelper.notFound(res, "Producto");
            }

            // ✅ USAR MODELO
            const producto = ModelMapper.toProducto(result.rows[0]);

            // ✅ Añadir información calculada
            const productoEnriquecido = {
                ...producto,
                necesita_reposicion: producto.necesitaReposicion(),
                por_caducar: producto.estaPorCaducar(),
                margen_ganancia: producto.margenGanancia(),
                ganancia: producto.calcularGanancia()
            };

            return responseHelper.success(res, productoEnriquecido);

        } catch (error) {
            logger.error("Error en productoController.getById", error);
            return responseHelper.error(res, "Error obteniendo producto", 500, error);
        } finally {
            client.release();
        }
    },

    async create(req, res) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const { id_categoria, id_proveedor, nombre, codigo_barra, precio_compra, precio_venta, stock, unidad, fecha_caducidad } = req.body;
            
            // ✅ USAR VALIDACIÓN DEL MODELO
            const validationErrors = Producto.validate(req.body);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // Generar código de barras si no se proporciona
            const codigoFinal = codigo_barra || `BC${Date.now()}${Math.floor(Math.random() * 1000)}`;

            const result = await client.query(
                `INSERT INTO productos (id_categoria, id_proveedor, nombre, codigo_barra, precio_compra, precio_venta, stock, unidad, fecha_caducidad)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [id_categoria, id_proveedor, nombre.trim(), codigoFinal, precio_compra, precio_venta, stock, unidad, fecha_caducidad]
            );

            await client.query('COMMIT');

            // ✅ USAR MODELO en la respuesta
            const nuevoProducto = ModelMapper.toProducto(result.rows[0]);

            logger.audit("Producto creado", req.user?.id_usuario, "CREATE", {
                productoId: nuevoProducto.id_producto,
                nombre: nuevoProducto.nombre,
                precio: nuevoProducto.precio_venta
            });

            return responseHelper.success(res, nuevoProducto, "Producto creado exitosamente", 201);

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error("Error en productoController.create", error);
            
            if (error.message.includes('inválido') || error.message.includes('debe ser')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error creando producto", 500, error);
        } finally {
            client.release();
        }
    }
};

module.exports = productoController;
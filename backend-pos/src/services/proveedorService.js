// src/services/proveedorService.js

const db = require('../config/database');
const proveedorRepository = require('../repositories/proveedorRepository');
const Proveedor = require('../models/Proveedor');
const helpers = require('../utils/helpers');
const QueryBuilder = require('../utils/queryBuilder');
const ModelMapper = require('../utils/modelMapper'); // Necesario para productos

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.status = status;
        if (details) this.details = details;
    }
}

/**
 * Lógica de negocio para Proveedores.
 */
const proveedorService = {

    async getAllProveedores(query) {
        const { q, activo } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);

        const params = [];
        const where = [];
        let idx = 1;

        if (q) {
            const searchTerm = QueryBuilder.sanitizeSearchTerm(q);
            where.push(`(p.nombre ILIKE $${idx} OR p.direccion ILIKE $${idx})`);
            params.push(searchTerm);
            idx++;
        }
        if (activo !== undefined) {
            where.push(`p.activo = $${idx++}`);
            params.push(activo === 'true' || activo === '1');
        }

        const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
        
        const { proveedores, total } = await proveedorRepository.findAll({
            whereSQL, params, limit: limitNum, offset
        });

        return {
            proveedores,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    },

    async getProveedorById(id, includeProductos = false) {
        const validId = QueryBuilder.validateId(id);
        const proveedor = await proveedorRepository.findByIdWithStats(validId);
        if (!proveedor) {
            throw new BusinessError('Proveedor no encontrado', 404);
        }

        if (includeProductos) {
            // Cargar todos los productos, sin paginación (como en el controller original)
            proveedor.productos = await proveedorRepository.findProductosByProveedorId(validId);
        }

        return proveedor;
    },

    async createProveedor(data) {
        const { nombre, telefono, direccion, email } = data;

        if (!nombre || !nombre.trim()) {
            throw new BusinessError('El nombre del proveedor es obligatorio', 400);
        }
        
        const emailSanitizado = email ? helpers.sanitizeInput(email) : null;
        if (emailSanitizado && !helpers.isValidEmail(emailSanitizado)) {
            throw new BusinessError('El formato del email no es válido', 400);
        }

        const proveedor = new Proveedor(
            null,
            helpers.sanitizeInput(nombre),
            telefono ? helpers.sanitizeInput(telefono) : null,
            emailSanitizado,
            direccion ? helpers.sanitizeInput(direccion) : null
        );

        const validationErrors = Proveedor.validate(proveedor);
        if (validationErrors.length > 0) {
            throw new BusinessError('Errores de validación', 400, { errors: validationErrors });
        }
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const existente = await proveedorRepository.findByName(proveedor.nombre, client);
            if (existente) {
                throw new BusinessError('Ya existe un proveedor con ese nombre', 409);
            }

            const proveedorCreado = await proveedorRepository.create(proveedor, client);
            
            await client.query('COMMIT');
            return proveedorCreado;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async updateProveedor(id, data) {
        const validId = QueryBuilder.validateId(id);
        
        const updates = {};
        if (data.nombre !== undefined) updates.nombre = helpers.sanitizeInput(data.nombre);
        if (data.telefono !== undefined) updates.telefono = data.telefono ? helpers.sanitizeInput(data.telefono) : null;
        if (data.direccion !== undefined) updates.direccion = data.direccion ? helpers.sanitizeInput(data.direccion) : null;
        if (data.email !== undefined) updates.email = data.email ? helpers.sanitizeInput(data.email) : null;

        if (Object.keys(updates).length === 0) {
            throw new BusinessError('No hay campos para actualizar', 400);
        }

        if (updates.email && !helpers.isValidEmail(updates.email)) {
            throw new BusinessError('El formato del email no es válido', 400);
        }
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const proveedorActual = await proveedorRepository.findByIdSimple(validId, client);
            if (!proveedorActual) {
                throw new BusinessError('Proveedor no encontrado', 404);
            }

            if (updates.nombre) {
                const nombreExistente = await proveedorRepository.findByNameAndNotId(updates.nombre, validId, client);
                if (nombreExistente) {
                    throw new BusinessError('Ya existe otro proveedor con ese nombre', 409);
                }
            }
            
            // Validar objeto final
            const proveedorTemp = new Proveedor(
                validId,
                updates.nombre || proveedorActual.nombre,
                updates.telefono !== undefined ? updates.telefono : proveedorActual.telefono,
                updates.email !== undefined ? updates.email : proveedorActual.email,
                updates.direccion !== undefined ? updates.direccion : proveedorActual.direccion
            );
            const validationErrors = Proveedor.validate(proveedorTemp);
            if (validationErrors.length > 0) {
                throw new BusinessError('Errores de validación', 400, { errors: validationErrors });
            }

            const proveedorActualizado = await proveedorRepository.update(validId, updates, client);
            
            await client.query('COMMIT');
            return proveedorActualizado;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async deleteProveedor(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            const proveedor = await proveedorRepository.findByIdSimple(validId, client);
            if (!proveedor) {
                throw new BusinessError('Proveedor no encontrado', 404);
            }

            const countProductos = await proveedorRepository.countProductosByProveedorId(validId, client);
            if (countProductos > 0) {
                throw new BusinessError(
                    `No se puede eliminar el proveedor porque tiene ${countProductos} producto(s) asociado(s)`,
                    409
                );
            }

            await proveedorRepository.delete(validId, client);
            
            await client.query('COMMIT');
            return proveedor; // Devolver para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getProductosByProveedor(id, queryParams) {
        const validId = QueryBuilder.validateId(id);
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(queryParams);
        
        const proveedor = await proveedorRepository.findByIdSimple(validId);
        if (!proveedor) {
            throw new BusinessError('Proveedor no encontrado', 404);
        }

        const { productos, total } = await proveedorRepository.findPaginatedProductosByProveedorId(
            validId, 
            { limit: limitNum, offset }
        );

        return {
            proveedor,
            productos,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    },

    async getEstadisticas(id) {
        const validId = QueryBuilder.validateId(id);
        
        const proveedor = await proveedorRepository.findByIdSimple(validId);
        if (!proveedor) {
            throw new BusinessError('Proveedor no encontrado', 404);
        }
        
        const stats = await proveedorRepository.getEstadisticas(validId);

        return {
            proveedor,
            estadisticas: {
                total_productos: parseInt(stats.total_productos) || 0,
                total_stock: parseFloat(stats.total_stock) || 0,
                precio_compra_promedio: parseFloat(stats.precio_compra_promedio) || 0,
                precio_venta_promedio: parseFloat(stats.precio_venta_promedio) || 0,
                productos_bajo_stock: parseInt(stats.productos_bajo_stock) || 0,
                productos_por_caducar: parseInt(stats.productos_por_caducar) || 0
            }
        };
    }
};

module.exports = proveedorService;
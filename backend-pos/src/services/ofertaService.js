// src/services/ofertaService.js

const db = require('../config/database');
const { 
    ofertaRepository, 
    productoRepository 
} = require('../repositories/ofertaRepository'); // Asumimos que ambos se exportan desde aquí
const Oferta = require('../models/Oferta');
const ProductoOferta = require('../models/ProductoOferta');
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

const ofertaService = {

    async getAllOfertas(query) {
        const { estado, activo } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        
        const params = [];
        const where = [];
        let idx = 1;

        if (activo !== undefined) {
            where.push(`o.activo = $${idx++}`);
            params.push(activo === 'true' || activo === '1');
        }
        const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
        
        // 1. Obtener datos de la BD
        const { ofertas, total } = await ofertaRepository.findAll({
            whereSQL, params, limit: limitNum, offset
        });
        
        // 2. Aplicar lógica de negocio (filtro de estado)
        let ofertasFiltradas = ofertas;
        if (estado) {
            const estadoValidos = ['ACTIVA', 'INACTIVA', 'PROGRAMADA', 'EXPIRADA'];
            const estadoQuery = estado.toUpperCase();
            if (!estadosValidos.includes(estadoQuery)) {
                throw new BusinessError(`Estado inválido. Válidos: ${estadosValidos.join(', ')}`, 400);
            }
            ofertasFiltradas = ofertas.filter(oferta => oferta.getEstado() === estadoQuery);
        }

        return {
            ofertas: ofertasFiltradas, // Devuelve las filtradas por el servicio
            pagination: {
                page: pageNum,
                limit: limitNum,
                total, // El total de la BD, no el filtrado (para paginación correcta)
                pages: Math.ceil(total / limitNum)
            }
        };
    },

    async getOfertaById(id, includeProductos = false) {
        const validId = QueryBuilder.validateId(id);
        const oferta = await ofertaRepository.findById(validId);
        if (!oferta) {
            throw new BusinessError('Oferta no encontrada', 404);
        }

        if (includeProductos) {
            // No necesitamos paginación aquí, asumimos que queremos todos los productos de una oferta
            // Si se necesita paginación, se pasaría queryParams
            const { page, limit, offset } = helpers.getPaginationParams({}); 
            const { productos } = await ofertaRepository.findProductosByOfertaId(validId, { limit: 1000, offset: 0 }); // Límite alto
            oferta.productos_asociados = productos;
        }

        return oferta;
    },

    async createOferta(data) {
        const { nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin } = data;

        const nombreSanitizado = helpers.sanitizeInput(nombre);
        const descripcionSanitizada = descripcion ? helpers.sanitizeInput(descripcion) : null;

        const oferta = Oferta.crear(
            nombreSanitizado,
            descripcionSanitizada,
            parseFloat(porcentaje_descuento),
            new Date(fecha_inicio),
            new Date(fecha_fin)
        );

        const validationErrors = Oferta.validate(oferta);
        if (validationErrors.length > 0) {
            throw new BusinessError('Errores de validación', 400, { errors: validationErrors });
        }
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const ofertaExistente = await ofertaRepository.findByName(nombreSanitizado, client);
            if (ofertaExistente) {
                throw new BusinessError('Ya existe una oferta con ese nombre', 409);
            }

            const ofertaCreada = await ofertaRepository.create(oferta, client);
            
            await client.query('COMMIT');
            return ofertaCreada;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async updateOferta(id, data) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');

            const ofertaActual = await ofertaRepository.findByIdSimple(validId, client);
            if (!ofertaActual) {
                throw new BusinessError('Oferta no encontrada', 404);
            }

            // Preparar updates
            const updates = {};
            if (data.nombre !== undefined) updates.nombre = helpers.sanitizeInput(data.nombre);
            if (data.descripcion !== undefined) updates.descripcion = data.descripcion ? helpers.sanitizeInput(data.descripcion) : null;
            if (data.porcentaje_descuento !== undefined) updates.porcentaje_descuento = parseFloat(data.porcentaje_descuento);
            if (data.fecha_inicio !== undefined) updates.fecha_inicio = new Date(data.fecha_inicio);
            if (data.fecha_fin !== undefined) updates.fecha_fin = new Date(data.fecha_fin);
            if (data.activo !== undefined) updates.activo = data.activo;
            
            if (Object.keys(updates).length === 0) {
                throw new BusinessError('No hay campos para actualizar', 400);
            }

            if (updates.nombre) {
                const nombreExistente = await ofertaRepository.findByNameAndNotId(updates.nombre, validId, client);
                if (nombreExistente) {
                    throw new BusinessError('Ya existe otra oferta con ese nombre', 409);
                }
            }
            
            // Validar objeto final
            const ofertaTemp = Oferta.fromDatabaseRow({ ...ofertaActual, ...updates });
            const validationErrors = Oferta.validate(ofertaTemp);
            if (validationErrors.length > 0) {
                throw new BusinessError('Errores de validación', 400, { errors: validationErrors });
            }

            const ofertaActualizada = await ofertaRepository.update(validId, updates, client);
            
            await client.query('COMMIT');
            return ofertaActualizada;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async deleteOferta(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');

            const oferta = await ofertaRepository.findByIdSimple(validId, client);
            if (!oferta) {
                throw new BusinessError('Oferta no encontrada', 404);
            }

            const countProductos = await ofertaRepository.countProductosAsociados(validId, client);
            if (countProductos > 0) {
                throw new BusinessError(
                    `No se puede eliminar la oferta porque tiene ${countProductos} producto(s) asociado(s). Desasigne los productos primero.`, 
                    409
                );
            }

            await ofertaRepository.delete(validId, client);
            await client.query('COMMIT');
            
            return oferta; // Devolver la oferta eliminada para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async asignarProducto(id_producto, id_oferta) {
        const productoId = QueryBuilder.validateId(id_producto);
        const ofertaId = QueryBuilder.validateId(id_oferta);
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const [producto, oferta, relacion] = await Promise.all([
                productoRepository.findById(productoId, client),
                ofertaRepository.findByIdSimple(ofertaId, client),
                ofertaRepository.findRelacion(productoId, ofertaId, client)
            ]);

            if (!producto) throw new BusinessError('Producto no encontrado', 404);
            if (!oferta) throw new BusinessError('Oferta no encontrada', 404);
            if (!oferta.activo) {
                throw new BusinessError('No se pueden asignar productos a ofertas inactivas', 400);
            }
            if (relacion) {
                throw new BusinessError('El producto ya está asignado a esta oferta', 409);
            }

            await ofertaRepository.createRelacion(productoId, ofertaId, client);
            
            await client.query('COMMIT');
            return { producto, oferta }; // Devolver para el log

        } catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23505') { // Error de unique constraint
                throw new BusinessError('El producto ya está asignado a esta oferta', 409);
            }
            throw error;
        } finally {
            client.release();
        }
    },

    async desasignarProducto(id_producto, id_oferta) {
        const productoId = QueryBuilder.validateId(id_producto);
        const ofertaId = QueryBuilder.validateId(id_oferta);

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const relacion = await ofertaRepository.findRelacionWithNames(productoId, ofertaId, client);
            if (!relacion) {
                throw new BusinessError('Relación producto-oferta no encontrada', 404);
            }

            await ofertaRepository.deleteRelacion(productoId, ofertaId, client);
            
            await client.query('COMMIT');
            return relacion; // Devolver para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getProductosAsociados(id_oferta, queryParams) {
        const validId = QueryBuilder.validateId(id_oferta);
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(queryParams);
        
        const oferta = await ofertaRepository.findByIdSimple(validId);
        if (!oferta) {
            throw new BusinessError('Oferta no encontrada', 404);
        }

        const { productos, total } = await ofertaRepository.findProductosByOfertaId(validId, { limit: limitNum, offset });

        return {
            oferta,
            productos,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    }
};

module.exports = ofertaService;
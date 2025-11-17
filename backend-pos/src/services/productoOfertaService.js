// src/services/productoOfertaService.js

const db = require('../config/database');
const {
    productoOfertaRepository,
    productoRepository,
    ofertaRepository
} = require('../repositories/productoOfertaRepository'); // Asumimos que todos se exportan desde aquí
const ProductoOferta = require('../models/ProductoOferta');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

/**
 * Lógica de negocio para la relación Producto-Oferta.
 */
const productoOfertaService = {

    async getAll(query) {
        const { activa } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        
        const params = [];
        const whereConditions = [];
        let paramIndex = 1;

        if (activa !== undefined) {
            whereConditions.push(`o.activo = $${paramIndex++}`);
            params.push(activa === 'true');
        }

        const whereSQL = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const { relaciones, total } = await productoOfertaRepository.findAll({
            whereSQL, params, limit: limitNum, offset
        });
        
        return {
            relaciones: relaciones.map(rel => rel.toJSON()),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    },

    async getOffersByProduct(id_producto, query) {
        const { solo_activas } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        const productoId = QueryBuilder.validateId(id_producto);

        const whereConditions = ['po.id_producto = $1'];
        const params = [productoId];
        let paramIndex = 2;

        if (solo_activas === 'true') {
            whereConditions.push(`o.activo = $${paramIndex++}`);
            params.push(true);
        }

        const whereSQL = `WHERE ${whereConditions.join(' AND ')}`;

        const { relaciones, total } = await productoOfertaRepository.findOffersByProductId({
            whereSQL, params, limit: limitNum, offset
        });
        
        return {
            producto_id: productoId,
            relaciones: relaciones.map(rel => rel.toJSON()),
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        };
    },
    
    async getProductsByOffer(id_oferta, query) {
        const { con_precio = 'true' } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        const ofertaId = QueryBuilder.validateId(id_oferta);

        const params = [ofertaId];
        let paramIndex = 2;
        
        // El repositorio manejará la lógica de `con_precio`
        if(con_precio === 'true') {
            params.push('con_precio'); 
        }

        const whereSQL = `WHERE po.id_oferta = $1`;
        
        const { relaciones, total } = await productoOfertaRepository.findProductsByOfferId({
            whereSQL, params, limit: limitNum, offset
        });

        // Obtener la oferta (para la respuesta)
        const oferta = await ofertaRepository.findByIdSimple(ofertaId);
        if (!oferta) throw new BusinessError("Oferta no encontrada", 404);

        return {
            oferta: oferta,
            relaciones: relaciones.map(rel => rel.toJSON()),
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        };
    },

    async assignProducto(id_producto, id_oferta) {
        const productoId = QueryBuilder.validateId(id_producto);
        const ofertaId = QueryBuilder.validateId(id_oferta);
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            // Validar que ambos existen
            const producto = await productoRepository.findById(productoId, client);
            if (!producto) throw new BusinessError('Producto no encontrado', 404);

            const oferta = await ofertaRepository.findByIdSimple(ofertaId, client);
            if (!oferta) throw new BusinessError('Oferta no encontrada', 404);

            // Lógica de negocio: No asignar a ofertas inactivas
            if (!oferta.activo) {
                throw new BusinessError('No se pueden asignar productos a ofertas inactivas', 400);
            }

            // Validar que la relación no existe
            const relacionExists = await productoOfertaRepository.findRelacion(productoId, ofertaId, client);
            if (relacionExists) {
                throw new BusinessError('El producto ya está asignado a esta oferta', 409);
            }

            // Crear relación
            const relacionCreada = await productoOfertaRepository.createRelacion(productoId, ofertaId, client);
            
            await client.query('COMMIT');

            // Devolver datos para el log
            return {
                ...ProductoOferta.fromDatabaseRow(relacionCreada).toJSON(),
                producto_nombre: producto.nombre,
                oferta_nombre: oferta.nombre
            };

        } catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23505') { // Error de unique constraint
                throw new BusinessError('El producto ya está asignado a esta oferta', 409);
            }
            throw error; // Re-lanzar
        } finally {
            client.release();
        }
    },

    async unassignProducto(id_producto, id_oferta) {
        const productoId = QueryBuilder.validateId(id_producto);
        const ofertaId = QueryBuilder.validateId(id_oferta);
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const relacion = await productoOfertaRepository.findRelacionWithNames(productoId, ofertaId, client);
            if (!relacion) {
                throw new BusinessError('Relación producto-oferta no encontrada', 404);
            }

            await productoOfertaRepository.deleteRelacion(productoId, ofertaId, client);
            
            await client.query('COMMIT');
            return relacion; // Devolver datos para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getActiveOffersByProduct(id_producto) {
        const productoId = QueryBuilder.validateId(id_producto);
        const relaciones = await productoOfertaRepository.findActiveOffersByProductId(productoId);
        return relaciones.map(rel => rel.toJSON());
    }
};

module.exports = productoOfertaService;
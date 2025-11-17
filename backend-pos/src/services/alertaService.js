const db = require('../config/database');
const { alertaRepository, productoRepository } = require('../repositories/alertaRepository');
const Alerta = require('../models/Alerta');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

// Creamos una clase de error personalizada para manejar errores de negocio
class BusinessError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

const alertaService = {

    async getAllAlertas(queryParams) {
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);
        const { tipo, atendida } = queryParams;

        const { alertas, total } = await alertaRepository.findAll({ 
            tipo, 
            atendida, 
            limit, 
            offset 
        });

        const estadisticas = Alerta.calcularEstadisticas(alertas);
        const clasificadas = Alerta.clasificarAlertas(alertas);

        return {
            alertas: alertas.map(alerta => alerta.toJSON()),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            estadisticas: estadisticas,
            resumen: {
                pendientes: clasificadas.pendientes.length,
                atendidas: clasificadas.atendidas.length,
                caducidad: clasificadas.caducidad.length,
                stock_bajo: clasificadas.stock_bajo.length
            }
        };
    },

    async getAlertasPendientes() {
        const alertas = await alertaRepository.findPendientes();
        const estadisticas = Alerta.calcularEstadisticas(alertas);
        
        return {
            alertas: alertas.map(alerta => alerta.toJSON()),
            estadisticas: estadisticas
        };
    },

    async getAlertaById(id) {
        const validId = QueryBuilder.validateId(id);
        const alerta = await alertaRepository.findById(validId);

        if (!alerta) {
            throw new BusinessError('Alerta no encontrada', 404);
        }
        return alerta.toJSON();
    },

    async marcarAlertaAtendida(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const alerta = await alertaRepository.findByIdSimple(validId, client);
            if (!alerta) {
                throw new BusinessError('Alerta no encontrada', 404);
            }
            if (alerta.atendida) {
                throw new BusinessError('La alerta ya está atendida', 400);
            }

            const alertaActualizada = await alertaRepository.marcarAtendida(validId, client);
            
            // Necesitamos el nombre del producto para el log (como en el original)
            const producto = await productoRepository.findById(alerta.id_producto, client);
            
            await client.query('COMMIT');
            
            alertaActualizada.producto_nombre = producto ? producto.nombre : 'Producto no encontrado';
            return { data: alertaActualizada.toJSON(), logData: { tipo: alerta.tipo, producto_nombre: alertaActualizada.producto_nombre } };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error; // Re-lanza el error para que el controlador lo atrape
        } finally {
            client.release();
        }
    },

    async crearAlertaStockBajo(id_producto, stock_minimo = 5) {
        if (!id_producto) {
            throw new BusinessError('ID de producto es requerido', 400);
        }
        
        const productoId = QueryBuilder.validateId(id_producto);
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');

            const producto = await productoRepository.findById(productoId, client);
            if (!producto) {
                throw new BusinessError('Producto no encontrado', 404);
            }

            const stockActual = parseFloat(producto.stock);
            if (stockActual > stock_minimo) {
                throw new BusinessError(`El producto tiene suficiente stock (${stockActual} unidades)`, 400);
            }

            const alertaExistente = await alertaRepository.findPendienteByProductoId(productoId, client);
            if (alertaExistente) {
                throw new BusinessError('Ya existe una alerta de stock bajo pendiente para este producto', 409); // 409 Conflict
            }

            const nuevaAlertaData = Alerta.crearAlertaStockBajo(productoId, stockActual, stock_minimo);
            const alertaCreada = await alertaRepository.create(nuevaAlertaData, client);

            await client.query('COMMIT');

            alertaCreada.producto_nombre = producto.nombre;
            return { data: alertaCreada.toJSON(), logData: { ...producto, stockMinimo: stock_minimo } };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async deleteAlerta(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const alerta = await alertaRepository.findByIdSimple(validId, client);
            if (!alerta) {
                throw new BusinessError('Alerta no encontrada', 404);
            }

            await alertaRepository.delete(validId, client);
            await client.query('COMMIT');

            // Devuelve los datos de la alerta eliminada para el log
            return { logData: { tipo: alerta.tipo, productoId: alerta.id_producto } };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getEstadisticas(queryParams) {
        const { dias = 30 } = queryParams;
        return await alertaRepository.getEstadisticas(dias);
    }
};

module.exports = alertaService;
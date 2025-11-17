// src/services/inventarioService.js

const db = require('../config/database');
const inventarioRepository = require('../repositories/inventarioRepository');
// Importamos el repositorio de productos que ya creamos
const { productoRepository } = require('../repositories/productoRepository'); 
const HistorialInventario = require('../models/HistorialInventario');
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
 * Lógica de negocio para Inventario e Historial.
 */
const inventarioService = {

    async getHistorial(query) {
        const { id_producto, motivo, tipo, fecha_inicio, fecha_fin } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);

        const whereConditions = [];
        const params = [];
        let paramIndex = 1;

        if (id_producto) {
            whereConditions.push(`hi.id_producto = $${paramIndex++}`);
            params.push(QueryBuilder.validateId(id_producto));
        }
        if (motivo) {
            whereConditions.push(`hi.motivo = $${paramIndex++}`);
            params.push(motivo);
        }
        if (tipo) {
            if (tipo === 'entrada') whereConditions.push(`hi.cambio > 0`);
            else if (tipo === 'salida') whereConditions.push(`hi.cambio < 0`);
        }
        if (fecha_inicio) {
            whereConditions.push(`hi.fecha >= $${paramIndex++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            whereConditions.push(`hi.fecha <= $${paramIndex++}`);
            params.push(fecha_fin + ' 23:59:59');
        }

        const whereSQL = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const { movimientos, total } = await inventarioRepository.findAll({
            whereSQL, params, limit: limitNum, offset
        });
        
        // Lógica de negocio movida del controlador al servicio
        const estadisticas = HistorialInventario.calcularEstadisticas(movimientos);
        const clasificados = HistorialInventario.clasificarMovimientos(movimientos);

        return {
            data: movimientos.map(m => m.toJSON()),
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
        };
    },

    async crearAjuste(body, userId) {
        const { id_producto, cambio, motivo, nota } = body;
        
        const movimientoData = {
            id_producto,
            cambio,
            motivo: motivo || 'ajuste',
            id_usuario: userId
        };
        
        const validationErrors = HistorialInventario.validate(movimientoData);
        if (validationErrors.length > 0) {
            throw new BusinessError(validationErrors.join(', '), 400);
        }

        const cambioNum = parseFloat(cambio);
        const productoId = QueryBuilder.validateId(id_producto);
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            // 1. Bloquear el producto para evitar race conditions
            const producto = await productoRepository.findByIdForUpdate(productoId, client);
            if (!producto) {
                throw new BusinessError('Producto no encontrado', 404);
            }
            
            // 2. Validar stock
            const stockActual = parseFloat(producto.stock);
            const nuevoStock = stockActual + cambioNum;
            if (nuevoStock < 0) {
                throw new BusinessError(`Stock insuficiente. Stock actual: ${stockActual}, cambio solicitado: ${cambioNum}`, 400);
            }

            // 3. Crear movimiento
            const movimiento = HistorialInventario.crearAjuste(
                productoId, 
                cambioNum, 
                userId,
                nota
            );

            // 4. Insertar en historial
            const movimientoInsertado = await inventarioRepository.create(movimiento, client);

            // 5. Actualizar stock del producto
            // Usamos updateStock y pasamos el *opuesto* del 'cambio'
            // ya que updateStock resta el valor.
            await productoRepository.updateStock(productoId, -cambioNum, client);

            await client.query('COMMIT');
            
            // Devolver el movimiento completo con el nombre del producto
            movimientoInsertado.producto_nombre = producto.nombre;
            return {
                movimiento: movimientoInsertado.toJSON(),
                logData: {
                    productoNombre: producto.nombre,
                    stockAnterior: stockActual,
                    stockNuevo: nuevoStock
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error; // Re-lanzar para el controlador
        } finally {
            client.release();
        }
    },

    async getEstadisticas(query) {
        const { fecha_inicio, fecha_fin } = query;
        
        const whereConditions = [];
        const params = [];
        let paramIndex = 1;

        if (fecha_inicio) {
            whereConditions.push(`hi.fecha >= $${paramIndex++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            whereConditions.push(`hi.fecha <= $${paramIndex++}`);
            params.push(fecha_fin + ' 23:59:59');
        }
        
        const whereSQL = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // 1. Obtener todos los movimientos
        const movimientos = await inventarioRepository.findAllForStats({ whereSQL, params });
        
        // 2. Aplicar lógica de negocio
        const estadisticas = HistorialInventario.calcularEstadisticas(movimientos);
        const resumenProductos = HistorialInventario.resumenPorProducto(movimientos);

        // 3. Formatear respuesta
        return {
            estadisticas: estadisticas,
            resumen_por_producto: resumenProductos.map(p => ({
                ...p,
                movimientos: p.movimientos.map(m => m.toJSON()) // Serializar
            })),
            movimientos_recientes: movimientos.slice(0, 10).map(m => m.toJSON())
        };
    }
};

module.exports = inventarioService;
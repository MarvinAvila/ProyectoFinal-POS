// src/services/ventaService.js

const db = require('../config/database');
const {
    ventaRepository,
    usuarioRepository,
    productoRepository,
    detalleVentaRepository,
    historialInventarioRepository
} = require('../repositories/ventaRepository'); // Asumimos que todos se exportan desde aquí
const Venta = require('../models/Venta');
const DetalleVenta = require('../models/DetalleVenta');
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

const ventaService = {

    async getAllVentas(query) {
        const { fecha_inicio, fecha_fin, id_usuario } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        
        const params = [];
        const where = [];
        let idx = 1;

        if (fecha_inicio) {
            where.push(`v.fecha >= $${idx++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            where.push(`v.fecha <= $${idx++}`);
            params.push(fecha_fin + ' 23:59:59');
        }
        if (id_usuario) {
            where.push(`v.id_usuario = $${idx++}`);
            params.push(QueryBuilder.validateId(id_usuario));
        }

        const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
        
        const { ventas, total, estadisticas } = await ventaRepository.findAll({
            whereSQL, params, limit: limitNum, offset
        });

        return {
            ventas,
            estadisticas,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    },

    async getVentaCompletaById(id) {
        const validId = QueryBuilder.validateId(id);
        
        const venta = await ventaRepository.findById(validId);
        if (!venta) {
            throw new BusinessError('Venta no encontrada', 404);
        }
        
        const [detalles, comprobantes] = await Promise.all([
            ventaRepository.findDetallesByVentaId(validId),
            ventaRepository.findComprobantesByVentaId(validId)
        ]);

        venta.detalles = detalles;
        venta.comprobante = comprobantes.length > 0 ? comprobantes[0] : null;
        
        return venta;
    },

    async createVenta(data, userId) {
        const { id_usuario, detalles, forma_pago = "efectivo" } = data;
        
        if (!id_usuario) throw new BusinessError('El ID de usuario es obligatorio', 400);
        if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
            throw new BusinessError('La venta debe tener al menos un producto', 400);
        }
        
        const usuarioId = QueryBuilder.validateId(id_usuario);
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');

            if (!(await usuarioRepository.findById(usuarioId, client))) {
                throw new BusinessError('Usuario no encontrado', 404);
            }

            const venta = Venta.crearNueva(usuarioId, forma_pago);
            
            for (const detalleData of detalles) {
                const { id_producto, cantidad, precio_unitario } = detalleData;
                
                if (!id_producto || cantidad == null || precio_unitario == null) {
                    throw new BusinessError('Cada detalle debe tener id_producto, cantidad y precio_unitario', 400);
                }
                
                const productoId = QueryBuilder.validateId(id_producto);
                const cantidadNum = parseFloat(cantidad);
                const precioNum = parseFloat(precio_unitario);
                
                if (cantidadNum <= 0) throw new BusinessError('La cantidad debe ser mayor a 0', 400);
                if (precioNum < 0) throw new BusinessError('El precio unitario no puede ser negativo', 400); // <= 0 en el original

                // Bloquear la fila del producto para evitar race conditions
                const producto = await productoRepository.findByIdForUpdate(productoId, client);
                if (!producto) {
                    throw new BusinessError(`Producto con ID ${productoId} no encontrado`, 404);
                }
                if (parseFloat(producto.stock) < cantidadNum) {
                    throw new BusinessError(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`, 400);
                }
                
                // Usar el precio de la BD si no se provee (o si la lógica de negocio lo requiere)
                // En este caso, el controlador original exige un precio_unitario.
                
                const detalle = DetalleVenta.crearNuevo(null, productoId, cantidadNum, precioNum);
                venta.agregarDetalle(detalle);
            }

            venta.calcularTotales();
            
            const ventaInsertada = await ventaRepository.create(venta, client);
            const idVenta = ventaInsertada.id_venta;

            // Insertar detalles y actualizar stock
            for (const detalle of venta.detalles) {
                detalle.id_venta = idVenta; // Asignar el ID de la venta
                
                // 1. Insertar detalle
                await detalleVentaRepository.create(detalle, client);
                
                // 2. Actualizar stock
                await productoRepository.updateStock(detalle.id_producto, detalle.cantidad, client);

                // 3. Registrar historial
                const movimiento = HistorialInventario.crearVenta(detalle.id_producto, detalle.cantidad, usuarioId);
                await historialInventarioRepository.create(movimiento, client);
            }

            await client.query('COMMIT');
            
            // Devolver la venta completa
            return await this.getVentaCompletaById(idVenta);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error; // Re-lanzar para el controlador
        } finally {
            client.release();
        }
    },

    async deleteVenta(id, adminUserId) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            const venta = await ventaRepository.findById(validId);
            if (!venta) {
                throw new BusinessError('Venta no encontrada', 404);
            }

            const detalles = await ventaRepository.findDetallesByVentaId(validId);
            
            // Revertir stock
            for (const detalle of detalles) {
                await productoRepository.revertStock(detalle.id_producto, detalle.cantidad, client);
                
                const movimiento = HistorialInventario.crearMovimiento(
                    detalle.id_producto,
                    detalle.cantidad, // Positivo, se devuelve al stock
                    'cancelacion_venta',
                    adminUserId // Quién cancela
                );
                await historialInventarioRepository.create(movimiento, client);
            }

            // Eliminar dependencias
            await ventaRepository.deleteDetalles(validId, client);
            await ventaRepository.deleteComprobantes(validId, client);
            
            // Eliminar venta
            await ventaRepository.delete(validId, client);
            
            await client.query('COMMIT');
            return venta; // Devolver la venta eliminada para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getEstadisticas(query) {
        const { fecha_inicio, fecha_fin } = query;
        const params = [];
        const where = [];
        let idx = 1;

        if (fecha_inicio) {
            where.push(`v.fecha >= $${idx++}`);
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            where.push(`v.fecha <= $${idx++}`);
            params.push(fecha_fin + ' 23:59:59');
        }
        
        const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
        
        const { general, ventas_por_dia, productos_populares } = await ventaRepository.getEstadisticas(whereSQL, params);

        return {
            general: {
                total_ventas: parseInt(general.total_ventas) || 0,
                ingresos_totales: parseFloat(general.ingresos_totales) || 0,
                promedio_venta: parseFloat(general.promedio_venta) || 0,
                venta_minima: parseFloat(general.venta_minima) || 0,
                venta_maxima: parseFloat(general.venta_maxima) || 0
            },
            ventas_por_dia: ventas_por_dia,
            productos_populares: productos_populares
        };
    },

    async getTopProductos() {
        return await ventaRepository.getTopProductos();
    },

    async getVentasDelDia() {
        const hoy = new Date();
        const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

        const { ventas, resumen } = await ventaRepository.getVentasDelDia(inicioDia, finDia);

        return {
            total_ventas: parseInt(resumen.total_ventas),
            ingresos_totales: parseFloat(resumen.ingresos_totales),
            ventas,
        };
    }
};

module.exports = ventaService;
// src/services/detalleVentaService.js

const db = require('../config/database');
const {
    detalleVentaRepository,
    productoRepository,
    ventaRepository,
    historialInventarioRepository
} = require('../repositories/detalleVentaRepository'); // Asumimos que todos se exportan desde el repo de detalleVenta
const DetalleVenta = require('../models/DetalleVenta');
const HistorialInventario = require('../models/HistorialInventario');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.status = status;
        if (details) {
            this.details = details;
        }
    }
}

/**
 * Valida los datos numéricos básicos para un detalle.
 */
function validateDetalleData(cantidad, precio_unitario, requirePrecioPositivo = false) {
    const cantidadNum = parseFloat(cantidad);
    const precioNum = parseFloat(precio_unitario);

    if (isNaN(cantidadNum) || cantidadNum <= 0) {
        throw new BusinessError("La cantidad debe ser un número mayor a 0", 400);
    }
    
    const precioMinimo = requirePrecioPositivo ? 0.01 : 0;
    const errorMsg = `El precio unitario debe ser ${precioMinimo > 0 ? 'mayor a' : 'igual o mayor a'} 0`;
     if (isNaN(precioNum) || precioNum < precioMinimo) {
        throw new BusinessError(errorMsg, 400);
    }
    return { cantidadNum, precioNum };
}

/**
 * Lógica de negocio para Detalles de Venta.
 */
const detalleVentaService = {

    async getAllDetalles(queryParams) {
        const { id_venta, id_producto } = queryParams;
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);
        
        const filters = {
            id_venta: id_venta ? QueryBuilder.validateId(id_venta) : null,
            id_producto: id_producto ? QueryBuilder.validateId(id_producto) : null
        };

        const { detalles, total } = await detalleVentaRepository.findAll(filters, { limit, offset });
        
        return {
            detalles,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    },

    async getDetalleById(id) {
        const validId = QueryBuilder.validateId(id);
        const detalle = await detalleVentaRepository.findById(validId);
        if (!detalle) {
            throw new BusinessError("Detalle de venta no encontrado", 404);
        }
        return detalle;
    },

    async createDetalle(data, userId) {
        const { id_venta, id_producto, cantidad, precio_unitario } = data;
        
        if (!id_venta || !id_producto || cantidad == null || precio_unitario == null) {
             throw new BusinessError("Faltan datos obligatorios: id_venta, id_producto, cantidad, precio_unitario", 400);
        }
        
        const { cantidadNum, precioNum } = validateDetalleData(cantidad, precio_unitario, true);
        const ventaId = QueryBuilder.validateId(id_venta);
        const productoId = QueryBuilder.validateId(id_producto);
        
        const client = await db.getClient();
        try {
            await client.query("BEGIN");
            
            if (!(await ventaRepository.findById(ventaId, client))) {
                throw new BusinessError("Venta no encontrada", 404);
            }

            // Bloquear producto para evitar race conditions
            const producto = await productoRepository.findByIdForUpdate(productoId, client);
            if (!producto) throw new BusinessError("Producto no encontrado", 404);
            
            if (parseFloat(producto.stock) < cantidadNum) {
                throw new BusinessError(`Stock insuficiente. Disponible: ${producto.stock}`, 400);
            }

            const detalle = DetalleVenta.crearNuevo(ventaId, productoId, cantidadNum, precioNum);
            
            const validationErrors = DetalleVenta.validate?.(detalle) || [];
            if (validationErrors.length > 0) {
                throw new BusinessError("Errores de validación en el detalle", 400, { errors: validationErrors });
            }
            
            const detalleCreado = await detalleVentaRepository.create(detalle, client);
            
            // La lógica del trigger está en el controlador original, la replicamos
            await productoRepository.updateStock(productoId, cantidadNum, client);
            const movimiento = HistorialInventario.crearVenta(productoId, cantidadNum, userId || null);
            await historialInventarioRepository.create(movimiento, client);

            await client.query("COMMIT");
            
            detalleCreado.producto_nombre = producto.nombre;
            return detalleCreado;

        } catch (error) {
            await client.query("ROLLBACK");
            throw error; 
        } finally {
            client.release();
        }
    },

    async updateDetalle(id, data, userId) {
        const { id_producto: newProductoId, cantidad: newCantidad, precio_unitario: newPrecio } = data;
        const validId = QueryBuilder.validateId(id);

        const client = await db.getClient();
        try {
            await client.query("BEGIN");

            const oldDetalle = await detalleVentaRepository.findByIdSimple(validId, client);
            if (!oldDetalle) throw new BusinessError("Detalle de venta no encontrado", 404);

            const oldProductoId = oldDetalle.id_producto;
            const oldCantidad = parseFloat(oldDetalle.cantidad);
            
            const productoFinalId = newProductoId ? QueryBuilder.validateId(newProductoId) : oldProductoId;
            const { cantidadNum: cantidadFinal, precioNum: precioFinal } = validateDetalleData(
                newCantidad ?? oldDetalle.cantidad,
                newPrecio ?? oldDetalle.precio_unitario,
                true // Requerir precio > 0 en update
            );
            
            const subtotal = cantidadFinal * precioFinal;
            let productoNombre = '';

            if (productoFinalId === oldProductoId) {
                const delta = cantidadFinal - oldCantidad; // Cantidad a *quitar* del stock
                if (delta !== 0) {
                    const producto = await productoRepository.findByIdForUpdate(oldProductoId, client);
                    productoNombre = producto.nombre;
                    if (delta > 0 && parseFloat(producto.stock) < delta) {
                        throw new BusinessError(`Stock insuficiente. Disponible: ${producto.stock}`, 400);
                    }
                    await productoRepository.updateStock(oldProductoId, delta, client);
                    const mov = HistorialInventario.crearMovimiento(oldProductoId, -delta, "ajuste_detalle_venta", userId);
                    await historialInventarioRepository.create(mov, client);
                }
            } else {
                const nuevoProducto = await productoRepository.findByIdForUpdate(productoFinalId, client);
                if (!nuevoProducto) throw new BusinessError("Nuevo producto no encontrado", 404);
                if (parseFloat(nuevoProducto.stock) < cantidadFinal) {
                    throw new BusinessError(`Stock insuficiente en nuevo producto. Disponible: ${nuevoProducto.stock}`, 400);
                }
                productoNombre = nuevoProducto.nombre;

                // Revertir stock viejo (delta negativo)
                await productoRepository.updateStock(oldProductoId, -oldCantidad, client); 
                const movRevertir = HistorialInventario.crearMovimiento(oldProductoId, oldCantidad, "revertir_cambio_detalle", userId);
                await historialInventarioRepository.create(movRevertir, client);

                // Aplicar stock nuevo
                await productoRepository.updateStock(productoFinalId, cantidadFinal, client);
                const movAplicar = HistorialInventario.crearMovimiento(productoFinalId, -cantidadFinal, "aplicar_cambio_detalle", userId);
                await historialInventarioRepository.create(movAplicar, client);
            }

            const detalleActualizado = await detalleVentaRepository.update(validId, {
                id_producto: productoFinalId,
                cantidad: cantidadFinal,
                precio_unitario: precioFinal,
                subtotal: subtotal
            }, client);

            await client.query("COMMIT");
            
            if(!productoNombre && productoFinalId === oldProductoId) {
                 const p = await productoRepository.findById(productoFinalId, null); // sin client, ya se hizo commit
                 productoNombre = p.nombre;
            }
            detalleActualizado.producto_nombre = productoNombre;

            return { 
                detalle: detalleActualizado, 
                cambios: { 
                    producto: productoFinalId !== oldProductoId,
                    cantidad: cantidadFinal !== oldCantidad
                }
            };

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async patchDetalle(id, data, userId) {
        const validId = QueryBuilder.validateId(id);
        const { cantidad, precio_unitario, comentario } = data; // Asumimos que comentario no está en BD

        if (cantidad === undefined && precio_unitario === undefined && comentario === undefined) {
             throw new BusinessError("No se proporcionaron campos para actualizar", 400);
        }

        const client = await db.getClient();
        try {
            await client.query("BEGIN");

            const oldDetalle = await detalleVentaRepository.findByIdSimple(validId, client);
            if (!oldDetalle) throw new BusinessError("Detalle de venta no encontrado", 404);

            const updates = {};
            const cambios = [];

            if (cantidad !== undefined) {
                const { cantidadNum } = validateDetalleData(cantidad, oldDetalle.precio_unitario, true);
                updates.cantidad = cantidadNum;
                cambios.push("cantidad");
            }
            if (precio_unitario !== undefined) {
                const { precioNum } = validateDetalleData(oldDetalle.cantidad, precio_unitario, true);
                updates.precio_unitario = precioNum;
                cambios.push("precio_unitario");
            }
            // if (comentario !== undefined) { updates.comentario = comentario; ... }
            
            const nuevaCantidad = updates.cantidad ?? oldDetalle.cantidad;
            const nuevoPrecio = updates.precio_unitario ?? oldDetalle.precio_unitario;
            updates.subtotal = nuevaCantidad * nuevoPrecio;
            
            if (updates.cantidad !== undefined) {
                const delta = nuevaCantidad - oldDetalle.cantidad;
                if (delta !== 0) {
                    const producto = await productoRepository.findByIdForUpdate(oldDetalle.id_producto, client);
                    if (delta > 0 && parseFloat(producto.stock) < delta) {
                        throw new BusinessError(`Stock insuficiente. Disponible: ${producto.stock}`, 400);
                    }
                    await productoRepository.updateStock(oldDetalle.id_producto, delta, client);
                    const mov = HistorialInventario.crearMovimiento(oldDetalle.id_producto, -delta, "ajuste_parcial_detalle", userId);
                    await historialInventarioRepository.create(mov, client);
                }
            }
            
            const detalleActualizado = await detalleVentaRepository.patch(validId, updates, client);
            
            await client.query("COMMIT");
            return { detalle: detalleActualizado, cambios };

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async deleteDetalle(id, userId) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        try {
            await client.query("BEGIN");
            
            const oldDetalle = await detalleVentaRepository.findByIdSimple(validId, client);
            if (!oldDetalle) throw new BusinessError("Detalle de venta no encontrado", 404);

            // Revertir stock (sumar)
            await productoRepository.updateStock(oldDetalle.id_producto, -oldDetalle.cantidad, client);

            const movimiento = HistorialInventario.crearMovimiento(
                oldDetalle.id_producto,
                oldDetalle.cantidad, // Positivo, se devuelve al stock
                "eliminar_detalle_venta",
                userId || null
            );
            await historialInventarioRepository.create(movimiento, client);

            await detalleVentaRepository.delete(validId, client);
            
            await client.query("COMMIT");
            return oldDetalle; // Devuelve para el log

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },
    
    async getDetallesByVenta(id_venta, queryParams) {
        const validId = QueryBuilder.validateId(id_venta);
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);
        
        // Validar que la venta existe
        if (!(await ventaRepository.findById(validId))) {
            throw new BusinessError("Venta no encontrada", 404);
        }

        const { detalles, total } = await detalleVentaRepository.findByVentaId(validId, { limit, offset });
        
        return {
            detalles,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    },

    async getDetallesByProducto(id_producto, queryParams) {
        const validId = QueryBuilder.validateId(id_producto);
        const { fecha_inicio, fecha_fin } = queryParams;
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);

        const { detalles, total, estadisticas } = await detalleVentaRepository.findByProductoId(
            { id_producto: validId, fecha_inicio, fecha_fin },
            { limit, offset }
        );

        return {
            detalles,
            estadisticas,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    },
    
    async createMultipleDetalles(id_venta, detalles, userId) {
        if (!id_venta || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
            throw new BusinessError("Datos inválidos para crear múltiples detalles", 400);
        }
        
        const ventaId = QueryBuilder.validateId(id_venta);
        const client = await db.getClient();
        
        try {
            await client.query("BEGIN");
            
            if (!(await ventaRepository.findById(ventaId, client))) {
                throw new BusinessError("Venta no encontrada", 404);
            }
            
            const detallesCreados = [];
            const errores = [];

            // Usar un Map para rastrear el stock actualizado *dentro* de la transacción
            const stockTemporal = new Map();
            
            for (let i = 0; i < detalles.length; i++) {
                const d = detalles[i];
                try {
                    const { id_producto, cantidad, precio_unitario } = d;
                    if (!id_producto || cantidad == null || precio_unitario == null) {
                        throw new Error(`Detalle ${i + 1}: Faltan datos`);
                    }
                    
                    const { cantidadNum, precioNum } = validateDetalleData(cantidad, precio_unitario, true);
                    const productoId = QueryBuilder.validateId(id_producto);
                    
                    // Consultar stock actual (real o temporal)
                    let stockActual;
                    if (stockTemporal.has(productoId)) {
                        stockActual = stockTemporal.get(productoId);
                    } else {
                        const producto = await productoRepository.findByIdForUpdate(productoId, client);
                        if (!producto) throw new Error(`Detalle ${i + 1}: Producto no encontrado`);
                        stockActual = parseFloat(producto.stock);
                    }

                    if (stockActual < cantidadNum) {
                        throw new Error(`Detalle ${i + 1}: Stock insuficiente. Disponible: ${stockActual}`);
                    }
                    
                    // Actualizar stock temporal
                    stockTemporal.set(productoId, stockActual - cantidadNum);

                    const detalle = DetalleVenta.crearNuevo(ventaId, productoId, cantidadNum, precioNum);
                    const detalleCreado = await detalleVentaRepository.create(detalle, client);
                    detallesCreados.push(detalleCreado);

                } catch (error) {
                    errores.push(error.message); // Recolectar errores
                }
            }

            // Si hay UN solo error, fallar toda la transacción
            if (errores.length > 0) {
                throw new BusinessError("Errores al crear detalles", 400, { errores });
            }

            // Si todos son exitosos, APLICAR cambios de stock e historial
            for (const detalle of detallesCreados) {
                const cantidadNum = parseFloat(detalle.cantidad);
                await productoRepository.updateStock(detalle.id_producto, cantidadNum, client);
                const mov = HistorialInventario.crearVenta(detalle.id_producto, cantidadNum, userId || null);
                await historialInventarioRepository.create(mov, client);
            }

            await client.query("COMMIT");
            return { detalles: detallesCreados, total: detallesCreados.length };

        } catch (error) {
            await client.query("ROLLBACK");
            throw error; // Re-lanzar con la lista de errores si existe
        } finally {
            client.release();
        }
    },
    
    async getReporteVentasProductos(queryParams) {
        const { fecha_inicio, fecha_fin, id_categoria, agrupar_por = "producto" } = queryParams;
        const params = [];
        let whereClause = "WHERE dv.id_detalle IS NOT NULL";
        let groupByClause = "";
        let selectFields = "";

        if (fecha_inicio) {
            params.push(fecha_inicio);
            whereClause += ` AND v.fecha >= $${params.length}`;
        }
        if (fecha_fin) {
            params.push(fecha_fin);
            whereClause += ` AND v.fecha <= $${params.length}`;
        }
        if (id_categoria) {
            params.push(QueryBuilder.validateId(id_categoria));
            whereClause += ` AND p.id_categoria = $${params.length}`;
        }

        switch (agrupar_por) {
            case "dia":
                selectFields = `TO_CHAR(v.fecha, 'YYYY-MM-DD') as periodo,`;
                groupByClause = "GROUP BY TO_CHAR(v.fecha, 'YYYY-MM-DD')";
                break;
            case "categoria":
                selectFields = `c.nombre as categoria_nombre, c.id_categoria,`;
                groupByClause = "GROUP BY c.id_categoria, c.nombre";
                break;
            default: // producto
                selectFields = `p.nombre as producto_nombre, p.id_producto,`;
                groupByClause = "GROUP BY p.id_producto, p.nombre";
        }
        
        const reporte = await detalleVentaRepository.getReporteVentasProductos(whereClause, groupByClause, selectFields, params);
        
        return {
            reporte,
            parametros: { fecha_inicio, fecha_fin, id_categoria, agrupar_por },
            total_registros: reporte.length,
        };
    },

    async getReporteTopProductos(queryParams) {
        const { limite = 10, periodo = "30d", ordenar_por = "ingresos" } = queryParams;
        const limitNum = Math.min(parseInt(limite) || 10, 50);
        
        let fechaFiltro = "v.fecha >= CURRENT_DATE - INTERVAL '30 days'";
        if (periodo === "7d") fechaFiltro = "v.fecha >= CURRENT_DATE - INTERVAL '7 days'";
        if (periodo === "90d") fechaFiltro = "v.fecha >= CURRENT_DATE - INTERVAL '90 days'";
        if (periodo === "ytd") fechaFiltro = "EXTRACT(YEAR FROM v.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)";
        
        let orderBy = "ingresos_totales DESC";
        if (ordenar_por === "cantidad") orderBy = "total_vendido DESC";
        if (ordenar_por === "utilidad") orderBy = "utilidad_total DESC";
        
        const top_productos = await detalleVentaRepository.getReporteTopProductos(fechaFiltro, orderBy, limitNum);
        
        return {
            top_productos,
            parametros: { limite: limitNum, periodo, ordenar_por },
            total_productos: top_productos.length,
        };
    },
    
    async validarStock(id_producto, cantidad, id_venta) {
        const productoId = QueryBuilder.validateId(id_producto);
        const { cantidadNum } = validateDetalleData(cantidad, 0, false);
        
        const producto = await productoRepository.findById(productoId);
        if (!producto) throw new BusinessError("Producto no encontrado", 404);
        
        const stockDisponible = parseFloat(producto.stock);
        let stockReservado = 0;

        if (id_venta) {
            const ventaId = QueryBuilder.validateId(id_venta);
            stockReservado = await detalleVentaRepository.getCantidadReservada(ventaId, productoId);
        }

        const stockRealDisponible = stockDisponible + stockReservado;
        const suficiente = stockRealDisponible >= cantidadNum;

        return {
            producto: { id: productoId, nombre: producto.nombre, stock_disponible: stockDisponible },
            validacion: {
                cantidad_solicitada: cantidadNum,
                stock_real_disponible: stockRealDisponible,
                suficiente,
                diferencia: stockRealDisponible - cantidadNum,
            },
            detalles: { stock_reservado: stockReservado, excluye_venta: !!id_venta },
        };
    },
    
    async getEstadisticasProducto(id_producto) {
        const validId = QueryBuilder.validateId(id_producto);
        const stats = await detalleVentaRepository.getEstadisticasProducto(validId);
        if(!stats.total_ventas) {
            // Lanza un error o devuelve ceros si el producto no tiene ventas
             return { total_ventas: 0, total_vendido: 0, ingresos_totales: 0, ...stats };
        }
        return stats;
    },

    async getEstadisticasVenta(id_venta) {
        const validId = QueryBuilder.validateId(id_venta);
        return await detalleVentaRepository.getEstadisticasVenta(validId);
    }
};

module.exports = detalleVentaService;
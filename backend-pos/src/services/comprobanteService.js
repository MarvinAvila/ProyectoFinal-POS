// src/services/comprobanteService.js

const db = require('../config/database');
const { comprobanteRepository, ventaRepository } = require('../repositories/comprobanteRepository');
const Comprobante = require('../models/Comprobante');
const QueryBuilder = require('../utils/queryBuilder');
const helpers = require('../utils/helpers');

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

const comprobanteService = {

    async getComprobantesByVenta(id_venta) {
        const validId = QueryBuilder.validateId(id_venta);
        const comprobantes = await comprobanteRepository.findByVentaId(validId);
        return comprobantes.map(comp => comp.toJSON(false)); // No incluir contenido
    },

    async getComprobanteContenido(id) {
        const validId = QueryBuilder.validateId(id);
        const comprobante = await comprobanteRepository.findById(validId);
        if (!comprobante) {
            throw new BusinessError("Comprobante no encontrado", 404);
        }
        return comprobante.toJSON(true); // Incluir contenido
    },

    async createComprobante(data) {
        const { id_venta, tipo, contenido } = data;
        
        if (!id_venta || isNaN(id_venta)) throw new BusinessError('ID de venta inválido', 400);
        if (!contenido) throw new BusinessError('El contenido del comprobante es obligatorio', 400);

        const comprobanteData = {
            id_venta: parseInt(id_venta),
            tipo: tipo || 'ticket',
            contenido: contenido
        };
        
        const validationErrors = Comprobante.validate(comprobanteData);
        if (validationErrors.length > 0) {
            throw new BusinessError(validationErrors.join(', '), 400);
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const venta = await ventaRepository.findById(id_venta, client);
            if (!venta) {
                throw new BusinessError('Venta no encontrada', 404);
            }

            const nuevoComprobante = Comprobante.crear(id_venta, tipo, contenido);
            const comprobanteCreado = await comprobanteRepository.create(nuevoComprobante, client);
            
            await client.query('COMMIT');
            
            comprobanteCreado.venta_total = venta.total; // Adjuntar info extra
            return comprobanteCreado;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async generarTicket(id_venta) {
        const validId = QueryBuilder.validateId(id_venta);
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const venta = await ventaRepository.findById(validId, client);
            if (!venta) {
                throw new BusinessError('Venta no encontrada', 404);
            }

            const detalles = await ventaRepository.findDetallesByVentaId(validId, client);
            
            // Lógica de negocio movida del controlador al servicio
            const contenidoTicket = Comprobante.generarContenidoTicket(venta, detalles);

            const nuevoComprobante = Comprobante.crear(validId, 'ticket', contenidoTicket);
            const comprobanteCreado = await comprobanteRepository.create(nuevoComprobante, client);

            await client.query('COMMIT');
            return comprobanteCreado;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getAllComprobantes(queryParams) {
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);
        const { tipo, fecha_inicio, fecha_fin } = queryParams;
        
        const { comprobantes, total } = await comprobanteRepository.findAll(
            { tipo, fecha_inicio, fecha_fin },
            { limit, offset }
        );

        return {
            comprobantes: comprobantes.map(comp => comp.toJSON(false)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    },

    async getComprobanteById(id) {
        const validId = QueryBuilder.validateId(id);
        const comprobante = await comprobanteRepository.findById(validId);
        if (!comprobante) {
            throw new BusinessError("Comprobante no encontrado", 404);
        }
        return comprobante.toJSON(false); // Sin contenido
    },

    async getComprobantesByTipo(tipo, queryParams) {
        const tiposPermitidos = ['ticket', 'factura', 'nota_credito'];
        if (!tiposPermitidos.includes(tipo)) {
            throw new BusinessError(`Tipo de comprobante no válido. Permitidos: ${tiposPermitidos.join(', ')}`, 400);
        }
        
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);
        const { comprobantes, total } = await comprobanteRepository.findByTipo(tipo, { limit, offset });

        return {
            comprobantes: comprobantes.map(comp => comp.toJSON(false)),
            tipo: tipo,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    },

    async getComprobanteParaDescarga(id) {
        const validId = QueryBuilder.validateId(id);
        const comprobante = await comprobanteRepository.findById(validId);
        if (!comprobante) {
            throw new BusinessError("Comprobante no encontrado", 404);
        }

        const extension = comprobante.getExtension();
        const formato = comprobante.getFormatoContenido();
        const filename = `comprobante-${comprobante.tipo}-${comprobante.id_comprobante}${extension}`;
        
        const contentTypes = {
            'pdf': 'application/pdf',
            'html': 'text/html',
            'json': 'application/json',
            'texto': 'text/plain'
        };
        const contentType = contentTypes[formato] || 'application/octet-stream';

        return {
            filename,
            contentType,
            contenido: comprobante.contenido,
            logData: {
                tipo: comprobante.tipo,
                formato: formato,
                ventaId: comprobante.id_venta
            }
        };
    },
    
    _generarContenidoFactura(venta, detalles, datosFactura) {
        // (Helper privado)
        const contenido = {
            tipo: 'factura',
            folio: `FAC-${venta.id_venta}-${Date.now()}`,
            fecha: new Date().toISOString(),
            venta: { id: venta.id_venta, fecha: venta.fecha, total: venta.total, /*...*/ },
            emisor: { razon_social: 'Mi Empresa S.A. de C.V.', rfc: 'MEM123456789', /*...*/ },
            receptor: { razon_social: datosFactura.razon_social, rfc: datosFactura.rfc, /*...*/ },
            items: detalles.map(d => ({ producto: d.producto_nombre, cantidad: d.cantidad, /*...*/ })),
            totales: { subtotal: venta.subtotal, iva: venta.iva, total: venta.total }
        };
        return JSON.stringify(contenido);
    },

    async generarFactura(id_venta, datos_factura) {
        const validId = QueryBuilder.validateId(id_venta);
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const venta = await ventaRepository.findById(validId, client);
            if (!venta) {
                throw new BusinessError('Venta no encontrada', 404);
            }
            const detalles = await ventaRepository.findDetallesByVentaId(validId, client);

            const contenidoFactura = this._generarContenidoFactura(venta, detalles, datos_factura);
            
            const nuevoComprobante = Comprobante.crear(validId, 'factura', contenidoFactura);
            const facturaCreada = await comprobanteRepository.create(nuevoComprobante, client);

            await client.query('COMMIT');
            return {
                data: facturaCreada.toJSON(false),
                logData: { rfc: datos_factura.rfc, total: venta.total }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async deleteComprobante(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const comprobante = await comprobanteRepository.findById(validId);
             if (!comprobante) {
                throw new BusinessError("Comprobante no encontrado", 404);
            }
            
            const comprobanteEliminado = await comprobanteRepository.delete(validId, client);
            
            await client.query('COMMIT');
            return comprobanteEliminado; // Para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    async _simularEnvioEmail(comprobante, email) {
        // Simulación
        console.log(`Simulando envío de ${comprobante.tipo} ${comprobante.id_comprobante} a ${email}`);
        return true;
    },

    async reenviarEmail(id, email) {
        const validId = QueryBuilder.validateId(id);
        if (!email) {
            throw new BusinessError("Email es requerido", 400);
        }
        
        const comprobante = await comprobanteRepository.findById(validId);
        if (!comprobante) {
            throw new BusinessError("Comprobante no encontrado", 404);
        }

        const emailEnviado = await this._simularEnvioEmail(comprobante, email);
        if (!emailEnviado) {
            throw new BusinessError("Error al enviar el comprobante por email", 500);
        }
        
        return { 
            logData: { 
                tipo: comprobante.tipo, 
                emailDestino: email, 
                ventaId: comprobante.id_venta 
            }
        };
    },
    
    async getEstadisticas(queryParams) {
        const { fecha_inicio, fecha_fin } = queryParams;
        const { statsPorTipo, comprobantesPorDia } = await comprobanteRepository.getEstadisticas({ fecha_inicio, fecha_fin });

        return {
            por_tipo: statsPorTipo,
            por_dia: comprobantesPorDia,
            totales: {
                total_comprobantes: statsPorTipo.reduce((sum, row) => sum + parseInt(row.cantidad), 0),
                total_tickets: parseInt(statsPorTipo.find(row => row.tipo === 'ticket')?.cantidad || 0),
                total_facturas: parseInt(statsPorTipo.find(row => row.tipo === 'factura')?.cantidad || 0)
            }
        };
    }
};

module.exports = comprobanteService;
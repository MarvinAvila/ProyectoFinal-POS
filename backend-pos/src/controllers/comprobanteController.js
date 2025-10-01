const db = require('../config/database');
const Comprobante = require('../models/Comprobante');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const QueryBuilder = require('../utils/queryBuilder');

const comprobanteController = {
    async getByVenta(req, res) {
        const client = await db.getClient();
        try {
            const { id_venta } = req.params;

            // Validar ID
            QueryBuilder.validateId(id_venta);

            const result = await client.query(
                `SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
                 FROM comprobantes c
                 JOIN ventas v ON c.id_venta = v.id_venta
                 LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                 WHERE c.id_venta = $1
                 ORDER BY c.generado_en DESC`,
                [id_venta]
            );

            // ✅ USAR MODELO COMPROBANTE
            const comprobantes = result.rows.map(row => Comprobante.fromDatabaseRow(row));

            logger.api("Comprobantes obtenidos por venta", {
                ventaId: id_venta,
                totalComprobantes: comprobantes.length,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, 
                comprobantes.map(comp => comp.toJSON(false)) // No incluir contenido por defecto
            );

        } catch (error) {
            logger.error("Error en comprobanteController.getByVenta", {
                error: error.message,
                ventaId: req.params.id_venta,
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error obteniendo comprobantes", 500, error);
        } finally {
            client.release();
        }
    },

    async getContenido(req, res) {
        const client = await db.getClient();
        try {
            const { id } = req.params;

            // Validar ID
            QueryBuilder.validateId(id);

            const result = await client.query(
                `SELECT c.*, v.total as venta_total
                 FROM comprobantes c
                 JOIN ventas v ON c.id_venta = v.id_venta
                 WHERE c.id_comprobante = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return responseHelper.notFound(res, "Comprobante");
            }

            // ✅ USAR MODELO COMPROBANTE
            const comprobante = Comprobante.fromDatabaseRow(result.rows[0]);

            logger.api("Contenido de comprobante obtenido", {
                comprobanteId: id,
                tipo: comprobante.tipo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, 
                comprobante.toJSON(true) // Incluir contenido
            );

        } catch (error) {
            logger.error("Error en comprobanteController.getContenido", {
                error: error.message,
                comprobanteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error obteniendo contenido del comprobante", 500, error);
        } finally {
            client.release();
        }
    },

    async create(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { id_venta, tipo, contenido } = req.body;

            // Validaciones
            if (!id_venta || isNaN(id_venta)) {
                throw new Error('ID de venta inválido');
            }

            if (!contenido) {
                throw new Error('El contenido del comprobante es obligatorio');
            }

            // Verificar que la venta existe
            const ventaExists = await client.query(
                'SELECT id_venta, total FROM ventas WHERE id_venta = $1',
                [id_venta]
            );

            if (ventaExists.rowCount === 0) {
                throw new Error('Venta no encontrada');
            }

            // ✅ USAR MODELO COMPROBANTE PARA VALIDAR
            const comprobanteData = {
                id_venta: parseInt(id_venta),
                tipo: tipo || 'ticket',
                contenido: contenido
            };

            const validationErrors = Comprobante.validate(comprobanteData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // ✅ USAR MÉTODO DEL MODELO PARA CREAR COMPROBANTE
            const nuevoComprobante = Comprobante.crear(
                parseInt(id_venta), 
                tipo || 'ticket', 
                contenido
            );

            // Insertar en base de datos
            const result = await client.query(
                `INSERT INTO comprobantes (id_venta, tipo, contenido, generado_en)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [nuevoComprobante.id_venta, nuevoComprobante.tipo, nuevoComprobante.contenido, nuevoComprobante.generado_en]
            );

            await client.query('COMMIT');

            // ✅ CREAR INSTANCIA COMPLETA
            const comprobanteCreado = Comprobante.fromDatabaseRow(result.rows[0]);
            comprobanteCreado.venta_total = ventaExists.rows[0].total;

            logger.audit("Comprobante creado", req.user?.id_usuario, "CREATE", {
                comprobanteId: comprobanteCreado.id_comprobante,
                ventaId: id_venta,
                tipo: comprobanteCreado.tipo,
                formato: comprobanteCreado.getFormatoContenido()
            });

            return responseHelper.success(res, 
                comprobanteCreado.toJSON(false), // No incluir contenido en respuesta de creación
                "Comprobante creado correctamente", 
                201
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error("Error en comprobanteController.create", {
                error: error.message,
                datos: { id_venta: req.body.id_venta, tipo: req.body.tipo },
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido') || 
                error.message.includes('obligatorio') ||
                error.message.includes('no encontrada')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error creando comprobante", 500, error);
        } finally {
            client.release();
        }
    },

    async generarTicketAutomatico(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { id_venta } = req.body;

            // Validar ID
            QueryBuilder.validateId(id_venta);

            // Obtener información de la venta
            const venta = await client.query(
                `SELECT v.*, u.nombre as usuario_nombre
                 FROM ventas v
                 LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                 WHERE v.id_venta = $1`,
                [id_venta]
            );

            if (venta.rowCount === 0) {
                throw new Error('Venta no encontrada');
            }

            // Obtener detalles de la venta
            const detalles = await client.query(
                `SELECT dv.*, p.nombre as producto_nombre
                 FROM detalle_venta dv
                 JOIN productos p ON dv.id_producto = p.id_producto
                 WHERE dv.id_venta = $1`,
                [id_venta]
            );

            // ✅ USAR MÉTODO DEL MODELO PARA GENERAR CONTENIDO
            const contenidoTicket = Comprobante.generarContenidoTicket(
                venta.rows[0], 
                detalles.rows
            );

            // Crear comprobante
            const result = await client.query(
                `INSERT INTO comprobantes (id_venta, tipo, contenido, generado_en)
                 VALUES ($1, 'ticket', $2, $3) RETURNING *`,
                [id_venta, contenidoTicket, new Date()]
            );

            await client.query('COMMIT');

            const comprobanteCreado = Comprobante.fromDatabaseRow(result.rows[0]);

            logger.audit("Ticket generado automáticamente", req.user?.id_usuario, "CREATE", {
                comprobanteId: comprobanteCreado.id_comprobante,
                ventaId: id_venta,
                total: venta.rows[0].total
            });

            return responseHelper.success(res, 
                comprobanteCreado.toJSON(false),
                "Ticket generado automáticamente",
                201
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error("Error en comprobanteController.generarTicketAutomatico", {
                error: error.message,
                ventaId: req.body.id_venta,
                usuario: req.user?.id_usuario
            });
            
            if (error.message.includes('inválido') || error.message.includes('no encontrada')) {
                return responseHelper.error(res, error.message, 400, error);
            }
            
            return responseHelper.error(res, "Error generando ticket", 500, error);
        } finally {
            client.release();
        }
    },

    async getAll(req, res) {
        const client = await db.getClient();
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const { tipo, fecha_inicio, fecha_fin } = req.query;
            
            const params = [];
            const where = [];
            let idx = 1;

            // Filtros
            if (tipo) {
                where.push(`c.tipo = $${idx}`);
                params.push(tipo);
                idx++;
            }

            if (fecha_inicio) {
                where.push(`c.generado_en >= $${idx}`);
                params.push(fecha_inicio);
                idx++;
            }

            if (fecha_fin) {
                where.push(`c.generado_en <= $${idx}`);
                params.push(fecha_fin + ' 23:59:59');
                idx++;
            }

            const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

            const sql = `
                SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
                FROM comprobantes c
                JOIN ventas v ON c.id_venta = v.id_venta
                LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                ${whereSQL}
                ORDER BY c.generado_en DESC
                LIMIT $${idx} OFFSET $${idx + 1}
            `;
            
            params.push(limit, offset);
            
            const result = await db.query(sql, params);
            const comprobantes = result.rows.map(row => Comprobante.fromDatabaseRow(row));

            // Contar total
            const countSQL = `SELECT COUNT(*) FROM comprobantes c ${whereSQL}`;
            const countResult = await db.query(countSQL, params.slice(0, params.length - 2));
            const total = parseInt(countResult.rows[0].count);

            logger.api("Listado de comprobantes obtenido", {
                total: total,
                filtros: { tipo, fecha_inicio, fecha_fin },
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                comprobantes: comprobantes.map(comp => comp.toJSON(false)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            logger.error("Error en comprobanteController.getAll", {
                error: error.message,
                query: req.query,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo comprobantes", 500, error);
        } finally {
            client.release();
        }
    },

    async getById(req, res) {
        const client = await db.getClient();
        try {
            const id = QueryBuilder.validateId(req.params.id);

            const result = await client.query(
                `SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
                 FROM comprobantes c
                 JOIN ventas v ON c.id_venta = v.id_venta
                 LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                 WHERE c.id_comprobante = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return responseHelper.notFound(res, "Comprobante");
            }

            const comprobante = Comprobante.fromDatabaseRow(result.rows[0]);

            logger.api("Comprobante obtenido por ID", {
                comprobanteId: id,
                tipo: comprobante.tipo,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, comprobante.toJSON(false));

        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de comprobante inválido', 400);
            }
            
            logger.error("Error en comprobanteController.getById", {
                error: error.message,
                comprobanteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo comprobante", 500, error);
        } finally {
            client.release();
        }
    },

    async getByTipo(req, res) {
        const client = await db.getClient();
        try {
            const { tipo } = req.params;
            const { page, limit, offset } = helpers.getPaginationParams(req.query);

            const tiposPermitidos = ['ticket', 'factura', 'nota_credito'];
            if (!tiposPermitidos.includes(tipo)) {
                return responseHelper.error(res, `Tipo de comprobante no válido. Permitidos: ${tiposPermitidos.join(', ')}`, 400);
            }

            const sql = `
                SELECT c.*, v.total as venta_total, v.fecha as venta_fecha, u.nombre as usuario_nombre
                FROM comprobantes c
                JOIN ventas v ON c.id_venta = v.id_venta
                LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                WHERE c.tipo = $1
                ORDER BY c.generado_en DESC
                LIMIT $2 OFFSET $3
            `;
            
            const result = await db.query(sql, [tipo, limit, offset]);
            const comprobantes = result.rows.map(row => Comprobante.fromDatabaseRow(row));

            // Contar total
            const countResult = await db.query(
                'SELECT COUNT(*) FROM comprobantes WHERE tipo = $1',
                [tipo]
            );
            const total = parseInt(countResult.rows[0].count);

            logger.api("Comprobantes obtenidos por tipo", {
                tipo: tipo,
                total: total,
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, {
                comprobantes: comprobantes.map(comp => comp.toJSON(false)),
                tipo: tipo,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            logger.error("Error en comprobanteController.getByTipo", {
                error: error.message,
                tipo: req.params.tipo,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo comprobantes por tipo", 500, error);
        } finally {
            client.release();
        }
    },

    async descargarComprobante(req, res) {
        const client = await db.getClient();
        try {
            const id = QueryBuilder.validateId(req.params.id);

            const result = await client.query(
                `SELECT c.*, v.total as venta_total, v.fecha as venta_fecha
                 FROM comprobantes c
                 JOIN ventas v ON c.id_venta = v.id_venta
                 WHERE c.id_comprobante = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return responseHelper.notFound(res, "Comprobante");
            }

            const comprobante = Comprobante.fromDatabaseRow(result.rows[0]);

            // Configurar headers para descarga
            const extension = comprobante.getExtension();
            const filename = `comprobante-${comprobante.tipo}-${comprobante.id_comprobante}${extension}`;

            res.setHeader('Content-Type', this.getContentType(comprobante.getFormatoContenido()));
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', Buffer.byteLength(comprobante.contenido));

            logger.audit("Comprobante descargado", req.user?.id_usuario, "DOWNLOAD", {
                comprobanteId: id,
                tipo: comprobante.tipo,
                formato: comprobante.getFormatoContenido()
            });

            // Enviar contenido directamente
            return res.send(comprobante.contenido);

        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de comprobante inválido', 400);
            }
            
            logger.error("Error en comprobanteController.descargarComprobante", {
                error: error.message,
                comprobanteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error descargando comprobante", 500, error);
        } finally {
            client.release();
        }
    },

    async generarFactura(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { id_venta, datos_factura } = req.body;

            const ventaId = QueryBuilder.validateId(id_venta);

            // Verificar que la venta existe
            const venta = await client.query(
                `SELECT v.*, u.nombre as usuario_nombre
                 FROM ventas v
                 LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                 WHERE v.id_venta = $1`,
                [ventaId]
            );

            if (venta.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, 'Venta');
            }

            // Obtener detalles de la venta
            const detalles = await client.query(
                `SELECT dv.*, p.nombre as producto_nombre, p.codigo_barra
                 FROM detalle_venta dv
                 JOIN productos p ON dv.id_producto = p.id_producto
                 WHERE dv.id_venta = $1`,
                [ventaId]
            );

            // Generar contenido de factura
            const contenidoFactura = this.generarContenidoFactura(
                venta.rows[0], 
                detalles.rows,
                datos_factura
            );

            // Crear comprobante de factura
            const result = await client.query(
                `INSERT INTO comprobantes (id_venta, tipo, contenido, generado_en)
                 VALUES ($1, 'factura', $2, $3) RETURNING *`,
                [ventaId, contenidoFactura, new Date()]
            );

            await client.query('COMMIT');

            const facturaCreada = Comprobante.fromDatabaseRow(result.rows[0]);

            logger.audit("Factura generada", req.user?.id_usuario, "CREATE", {
                comprobanteId: facturaCreada.id_comprobante,
                ventaId: ventaId,
                rfc: datos_factura.rfc,
                total: venta.rows[0].total
            });

            return responseHelper.success(res, 
                facturaCreada.toJSON(false),
                "Factura generada correctamente",
                201
            );

        } catch (error) {
            await client.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de venta inválido', 400);
            }
            
            logger.error("Error en comprobanteController.generarFactura", {
                error: error.message,
                ventaId: req.body.id_venta,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error generando factura", 500, error);
        } finally {
            client.release();
        }
    },

    async delete(req, res) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const id = QueryBuilder.validateId(req.params.id);

            // Verificar que el comprobante existe
            const comprobanteExistente = await client.query(
                'SELECT * FROM comprobantes WHERE id_comprobante = $1',
                [id]
            );

            if (comprobanteExistente.rows.length === 0) {
                await client.query('ROLLBACK');
                return responseHelper.notFound(res, "Comprobante");
            }

            const comprobante = Comprobante.fromDatabaseRow(comprobanteExistente.rows[0]);

            // Eliminar comprobante
            await client.query('DELETE FROM comprobantes WHERE id_comprobante = $1', [id]);

            await client.query('COMMIT');

            logger.audit("Comprobante eliminado", req.user?.id_usuario, "DELETE", {
                comprobanteId: id,
                tipo: comprobante.tipo,
                ventaId: comprobante.id_venta
            });

            return responseHelper.success(res, null, "Comprobante eliminado correctamente");

        } catch (error) {
            await client.query('ROLLBACK');
            
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de comprobante inválido', 400);
            }
            
            logger.error("Error en comprobanteController.delete", {
                error: error.message,
                comprobanteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error eliminando comprobante", 500, error);
        } finally {
            client.release();
        }
    },

    async reenviarComprobante(req, res) {
        const client = await db.getClient();
        try {
            const id = QueryBuilder.validateId(req.params.id);
            const { email } = req.body;

            // Verificar que el comprobante existe
            const comprobanteResult = await client.query(
                `SELECT c.*, v.total, v.fecha, u.nombre as usuario_nombre
                 FROM comprobantes c
                 JOIN ventas v ON c.id_venta = v.id_venta
                 LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                 WHERE c.id_comprobante = $1`,
                [id]
            );

            if (comprobanteResult.rows.length === 0) {
                return responseHelper.notFound(res, "Comprobante");
            }

            const comprobante = Comprobante.fromDatabaseRow(comprobanteResult.rows[0]);

            // Aquí iría la lógica real de envío de email
            // Por ahora simulamos el envío
            const emailEnviado = await this.simularEnvioEmail(comprobante, email);

            if (emailEnviado) {
                logger.audit("Comprobante reenviado por email", req.user?.id_usuario, "RESEND", {
                    comprobanteId: id,
                    tipo: comprobante.tipo,
                    emailDestino: email,
                    ventaId: comprobante.id_venta
                });

                return responseHelper.success(res, null, "Comprobante reenviado correctamente");
            } else {
                return responseHelper.error(res, "Error al enviar el comprobante por email", 500);
            }

        } catch (error) {
            if (error.message === 'ID inválido') {
                return responseHelper.error(res, 'ID de comprobante inválido', 400);
            }
            
            logger.error("Error en comprobanteController.reenviarComprobante", {
                error: error.message,
                comprobanteId: req.params.id,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error reenviando comprobante", 500, error);
        } finally {
            client.release();
        }
    },

    async getEstadisticas(req, res) {
        try {
            const { fecha_inicio, fecha_fin } = req.query;

            const params = [];
            const where = [];
            let idx = 1;

            if (fecha_inicio) {
                where.push(`generado_en >= $${idx}`);
                params.push(fecha_inicio);
                idx++;
            }

            if (fecha_fin) {
                where.push(`generado_en <= $${idx}`);
                params.push(fecha_fin + ' 23:59:59');
                idx++;
            }

            const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

            // Estadísticas por tipo
            const statsPorTipo = await db.query(`
                SELECT 
                    tipo,
                    COUNT(*) as cantidad,
                    AVG(LENGTH(contenido)) as tamanio_promedio
                FROM comprobantes
                ${whereSQL}
                GROUP BY tipo
                ORDER BY cantidad DESC
            `, params);

            // Comprobantes por día (últimos 30 días)
            const comprobantesPorDia = await db.query(`
                SELECT 
                    DATE(generado_en) as fecha,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE tipo = 'ticket') as tickets,
                    COUNT(*) FILTER (WHERE tipo = 'factura') as facturas
                FROM comprobantes
                WHERE generado_en >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(generado_en)
                ORDER BY fecha DESC
            `);

            const estadisticas = {
                por_tipo: statsPorTipo.rows,
                por_dia: comprobantesPorDia.rows,
                totales: {
                    total_comprobantes: statsPorTipo.rows.reduce((sum, row) => sum + parseInt(row.cantidad), 0),
                    total_tickets: statsPorTipo.rows.find(row => row.tipo === 'ticket')?.cantidad || 0,
                    total_facturas: statsPorTipo.rows.find(row => row.tipo === 'factura')?.cantidad || 0
                }
            };

            logger.api("Estadísticas de comprobantes obtenidas", {
                filtros: { fecha_inicio, fecha_fin },
                usuarioConsulta: req.user?.id_usuario
            });

            return responseHelper.success(res, estadisticas);

        } catch (error) {
            logger.error("Error en comprobanteController.getEstadisticas", {
                error: error.message,
                usuario: req.user?.id_usuario
            });
            
            return responseHelper.error(res, "Error obteniendo estadísticas de comprobantes", 500, error);
        }
    },

    // ==================== MÉTODOS HELPER ====================

    getContentType(formato) {
        const contentTypes = {
            'pdf': 'application/pdf',
            'html': 'text/html',
            'json': 'application/json',
            'texto': 'text/plain'
        };
        return contentTypes[formato] || 'application/octet-stream';
    },

    generarContenidoFactura(venta, detalles, datosFactura) {
        const contenido = {
            tipo: 'factura',
            folio: `FAC-${venta.id_venta}-${Date.now()}`,
            fecha: new Date().toISOString(),
            venta: {
                id: venta.id_venta,
                fecha: venta.fecha,
                total: venta.total,
                subtotal: venta.subtotal,
                iva: venta.iva
            },
            emisor: {
                // Datos de la empresa (deberían venir de configuración)
                razon_social: 'Mi Empresa S.A. de C.V.',
                rfc: 'MEM123456789',
                direccion: 'Calle Principal #123, Ciudad, Estado'
            },
            receptor: {
                razon_social: datosFactura.razon_social,
                rfc: datosFactura.rfc,
                direccion: datosFactura.direccion || '',
                email: datosFactura.email || ''
            },
            items: detalles.map(detalle => ({
                producto: detalle.producto_nombre,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                importe: detalle.subtotal
            })),
            totales: {
                subtotal: venta.subtotal,
                iva: venta.iva,
                total: venta.total
            }
        };
        
        return JSON.stringify(contenido);
    },

    async simularEnvioEmail(comprobante, email) {
        // Simulación de envío de email
        // En una implementación real, aquí integrarías con un servicio de email
        logger.api("Simulación de envío de email", {
            comprobanteId: comprobante.id_comprobante,
            tipo: comprobante.tipo,
            emailDestino: email,
            tamanio: comprobante.getTamanio()
        });
        
        return true; // Simular éxito
    }

};

module.exports = comprobanteController;
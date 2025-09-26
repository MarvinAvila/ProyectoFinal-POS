class Comprobante {
    constructor(id_comprobante, id_venta, tipo = 'ticket', contenido, generado_en) {
        this.id_comprobante = id_comprobante;
        this.id_venta = id_venta;
        this.tipo = tipo; // 'ticket' | 'factura' | 'nota_credito'
        this.contenido = contenido; // JSON, base64 PDF, HTML
        this.generado_en = generado_en;
        
        // Campos para joins
        this.venta_total = null;
        this.venta_fecha = null;
        this.usuario_nombre = null;
    }

    // ==================== MÉTODOS DE INSTANCIA ====================

    /**
     * Verifica si el comprobante es una factura
     */
    esFactura() {
        return this.tipo === 'factura';
    }

    /**
     * Verifica si el comprobante es un ticket
     */
    esTicket() {
        return this.tipo === 'ticket';
    }

    /**
     * Obtiene el formato de contenido del comprobante
     */
    getFormatoContenido() {
        if (typeof this.contenido === 'string') {
            if (this.contenido.startsWith('{')) return 'json';
            if (this.contenido.startsWith('JVBERi')) return 'pdf';
            if (this.contenido.startsWith('<html')) return 'html';
            return 'texto';
        }
        return 'desconocido';
    }

    /**
     * Obtiene el icono representativo del comprobante
     */
    getIcono() {
        const iconos = {
            'ticket': '🧾',
            'factura': '📄',
            'nota_credito': '📑'
        };
        return iconos[this.tipo] || '📋';
    }

    /**
     * Obtiene la extensión de archivo sugerida
     */
    getExtension() {
        const formato = this.getFormatoContenido();
        const extensiones = {
            'pdf': '.pdf',
            'html': '.html',
            'json': '.json',
            'texto': '.txt'
        };
        return extensiones[formato] || '.bin';
    }

    /**
     * Obtiene el tamaño aproximado del contenido
     */
    getTamanio() {
        if (!this.contenido) return '0 B';
        
        const bytes = Buffer.byteLength(this.contenido, 'utf8');
        const sizes = ['B', 'KB', 'MB', 'GB'];
        
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Verifica si el comprobante es reciente (última hora)
     */
    esReciente() {
        const ahora = new Date();
        const generado = new Date(this.generado_en);
        const diferenciaMinutos = (ahora - generado) / (1000 * 60);
        return diferenciaMinutos <= 60;
    }

    /**
     * Valida la instancia del comprobante
     */
    validar() {
        const errors = Comprobante.validate(this);
        if (errors.length > 0) {
            throw new Error(`Comprobante inválido: ${errors.join(', ')}`);
        }
        return true;
    }

    /**
     * Serializa para respuesta API
     */
    toJSON() {
        return {
            id_comprobante: this.id_comprobante,
            id_venta: this.id_venta,
            tipo: this.tipo,
            contenido: this.contenido ? '[CONTENIDO]' : null, // Por seguridad, no enviar contenido completo
            generado_en: this.generado_en,
            venta_total: this.venta_total,
            venta_fecha: this.venta_fecha,
            usuario_nombre: this.usuario_nombre,
            // Campos calculados
            es_factura: this.esFactura(),
            es_ticket: this.esTicket(),
            icono: this.getIcono(),
            formato: this.getFormatoContenido(),
            extension: this.getExtension(),
            tamanio: this.getTamanio(),
            es_reciente: this.esReciente()
        };
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Crea instancia desde fila de base de datos
     */
    static fromDatabaseRow(row) {
        const comprobante = new Comprobante(
            row.id_comprobante,
            row.id_venta,
            row.tipo,
            row.contenido,
            row.generado_en
        );
        
        // Campos de joins
        if (row.total) comprobante.venta_total = parseFloat(row.total);
        if (row.fecha) comprobante.venta_fecha = row.fecha;
        if (row.usuario_nombre) comprobante.usuario_nombre = row.usuario_nombre;
        
        return comprobante;
    }

    /**
     * Crea un nuevo comprobante
     */
    static crear(id_venta, tipo, contenido) {
        return new Comprobante(
            null,
            id_venta,
            tipo,
            contenido,
            new Date()
        );
    }

    /**
     * Crea un comprobante tipo ticket
     */
    static crearTicket(id_venta, contenido) {
        return this.crear(id_venta, 'ticket', contenido);
    }

    /**
     * Crea un comprobante tipo factura
     */
    static crearFactura(id_venta, contenido) {
        return this.crear(id_venta, 'factura', contenido);
    }

    /**
     * Valida los datos de un comprobante
     */
    static validate(comprobanteData) {
        const errors = [];
        const tiposPermitidos = ['ticket', 'factura', 'nota_credito'];

        if (!comprobanteData.id_venta || isNaN(comprobanteData.id_venta)) {
            errors.push('ID de venta inválido');
        }

        if (!comprobanteData.tipo) {
            errors.push('El tipo de comprobante es obligatorio');
        } else if (!tiposPermitidos.includes(comprobanteData.tipo)) {
            errors.push(`Tipo de comprobante no válido. Permitidos: ${tiposPermitidos.join(', ')}`);
        }

        if (!comprobanteData.contenido) {
            errors.push('El contenido del comprobante es obligatorio');
        }

        return errors;
    }

    /**
     * Genera contenido básico para un ticket
     */
    static generarContenidoTicket(venta, detalles) {
        const contenido = {
            tipo: 'ticket',
            venta: {
                id: venta.id_venta,
                fecha: venta.fecha,
                total: venta.total
            },
            items: detalles.map(detalle => ({
                producto: detalle.producto_nombre,
                cantidad: detalle.cantidad,
                precio: detalle.precio_unitario,
                subtotal: detalle.subtotal
            })),
            totales: {
                subtotal: venta.subtotal,
                iva: venta.iva,
                total: venta.total
            }
        };
        
        return JSON.stringify(contenido);
    }
}

module.exports = Comprobante;
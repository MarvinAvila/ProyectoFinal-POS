class Reporte {
    constructor(id_reporte, tipo, fecha_generado, id_usuario, contenido) {
        this.id_reporte = id_reporte;
        this.tipo = tipo; // 'ventas_dia','top_productos','stock_bajo','inventario'
        this.fecha_generado = fecha_generado;
        this.id_usuario = id_usuario;
        this.contenido = contenido; // JSON con la info del reporte
        
        // Campos para joins
        this.usuario_nombre = null;
        this.titulo = null;
    }

    // ==================== MÉTODOS DE INSTANCIA ====================

    /**
     * Obtiene el título descriptivo del reporte
     */
    getTitulo() {
        const titulos = {
            'ventas_dia': 'Reporte de Ventas del Día',
            'top_productos': 'Productos Más Vendidos',
            'stock_bajo': 'Productos con Stock Bajo',
            'inventario': 'Reporte de Inventario Completo'
        };
        return this.titulo || titulos[this.tipo] || `Reporte ${this.tipo}`;
    }

    /**
     * Obtiene el icono representativo del reporte
     */
    getIcono() {
        const iconos = {
            'ventas_dia': '💰',
            'top_productos': '📊',
            'stock_bajo': '⚠️',
            'inventario': '📦'
        };
        return iconos[this.tipo] || '📋';
    }

    /**
     * Verifica si el reporte es reciente (últimas 24 horas)
     */
    esReciente() {
        const ahora = new Date();
        const generado = new Date(this.fecha_generado);
        const diferenciaHoras = (ahora - generado) / (1000 * 60 * 60);
        return diferenciaHoras <= 24;
    }

    /**
     * Obtiene el contenido parseado (si es JSON)
     */
    getContenidoParseado() {
        try {
            if (typeof this.contenido === 'string') {
                return JSON.parse(this.contenido);
            }
            return this.contenido;
        } catch (error) {
            return this.contenido;
        }
    }

    /**
     * Obtiene el tamaño del contenido
     */
    getTamanio() {
        if (!this.contenido) return '0 B';
        
        const contenidoStr = typeof this.contenido === 'string' 
            ? this.contenido 
            : JSON.stringify(this.contenido);
            
        const bytes = Buffer.byteLength(contenidoStr, 'utf8');
        const sizes = ['B', 'KB', 'MB', 'GB'];
        
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Valida la instancia del reporte
     */
    validar() {
        const errors = Reporte.validate(this);
        if (errors.length > 0) {
            throw new Error(`Reporte inválido: ${errors.join(', ')}`);
        }
        return true;
    }

    /**
     * Serializa para respuesta API (excluye contenido pesado por defecto)
     */
    toJSON(includeContent = false) {
        const base = {
            id_reporte: this.id_reporte,
            tipo: this.tipo,
            fecha_generado: this.fecha_generado,
            id_usuario: this.id_usuario,
            usuario_nombre: this.usuario_nombre,
            // Campos calculados
            titulo: this.getTitulo(),
            icono: this.getIcono(),
            es_reciente: this.esReciente(),
            tamanio: this.getTamanio()
        };

        if (includeContent) {
            base.contenido = this.getContenidoParseado();
        } else {
            base.tiene_contenido = !!this.contenido;
        }

        return base;
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Crea instancia desde fila de base de datos
     */
    static fromDatabaseRow(row) {
        const reporte = new Reporte(
            row.id_reporte,
            row.tipo,
            row.fecha_generado,
            row.id_usuario,
            row.contenido
        );
        
        if (row.usuario_nombre) reporte.usuario_nombre = row.usuario_nombre;
        
        return reporte;
    }

    /**
     * Crea un nuevo reporte
     */
    static crear(tipo, id_usuario, contenido, titulo = null) {
        const reporte = new Reporte(
            null,
            tipo,
            new Date(),
            id_usuario,
            contenido
        );
        
        if (titulo) reporte.titulo = titulo;
        
        return reporte;
    }

    /**
     * Valida los datos de un reporte
     */
    static validate(reporteData) {
        const errors = [];
        const tiposPermitidos = ['ventas_dia', 'top_productos', 'stock_bajo', 'inventario'];

        if (!reporteData.tipo) {
            errors.push('El tipo de reporte es obligatorio');
        } else if (!tiposPermitidos.includes(reporteData.tipo)) {
            errors.push(`Tipo de reporte no válido. Permitidos: ${tiposPermitidos.join(', ')}`);
        }

        if (!reporteData.id_usuario || isNaN(reporteData.id_usuario)) {
            errors.push('ID de usuario inválido');
        }

        return errors;
    }

    /**
     * Filtra reportes por tipo
     */
    static filtrarPorTipo(reportes, tipo) {
        return reportes.filter(reporte => reporte.tipo === tipo);
    }

    /**
     * Obtiene reportes recientes
     */
    static getReportesRecientes(reportes) {
        return reportes.filter(reporte => reporte.esReciente());
    }

    /**
     * Genera estadísticas de reportes
     */
    static generarEstadisticas(reportes) {
        const porTipo = {};
        reportes.forEach(reporte => {
            if (!porTipo[reporte.tipo]) {
                porTipo[reporte.tipo] = 0;
            }
            porTipo[reporte.tipo]++;
        });

        return {
            total: reportes.length,
            por_tipo: porTipo,
            recientes: this.getReportesRecientes(reportes).length
        };
    }
}

module.exports = Reporte;
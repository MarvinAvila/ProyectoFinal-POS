class Alerta {
    constructor(id_alerta, id_producto, tipo, mensaje, fecha, atendida = false) {
        this.id_alerta = id_alerta;
        this.id_producto = id_producto;
        this.tipo = tipo; // 'caducidad' | 'stock_bajo'
        this.mensaje = mensaje;
        this.fecha = fecha;
        this.atendida = atendida;
        
        // Campos para joins
        this.producto_nombre = null;
        this.codigo_barra = null;
        this.stock_actual = null;
        this.fecha_caducidad = null;
    }

    // ==================== MÉTODOS DE INSTANCIA ====================

    /**
     * Verifica si la alerta está pendiente de atención
     */
    estaPendiente() {
        return !this.atendida;
    }

    /**
     * Verifica si la alerta es reciente (últimas 24 horas)
     */
    esReciente() {
        const ahora = new Date();
        const fechaAlerta = new Date(this.fecha);
        const diferenciaHoras = (ahora - fechaAlerta) / (1000 * 60 * 60);
        return diferenciaHoras <= 24;
    }

    /**
     * Obtiene el nivel de prioridad de la alerta
     */
    getPrioridad() {
        const prioridades = {
            'caducidad': 'ALTA',
            'stock_bajo': 'MEDIA'
        };
        return prioridades[this.tipo] || 'BAJA';
    }

    /**
     * Obtiene el icono representativo de la alerta
     */
    getIcono() {
        const iconos = {
            'caducidad': '⏰',
            'stock_bajo': '📦'
        };
        return iconos[this.tipo] || '⚠️';
    }

    /**
     * Obtiene la clase CSS para estilizar
     */
    getClaseEstilo() {
        const clases = {
            'caducidad': 'alerta-caducidad alerta-alta',
            'stock_bajo': 'alerta-stock alerta-media'
        };
        return clases[this.tipo] || 'alerta-generica';
    }

    /**
     * Obtiene el tiempo transcurrido desde la alerta
     */
    getTiempoTranscurrido() {
        const ahora = new Date();
        const fechaAlerta = new Date(this.fecha);
        const diferenciaMs = ahora - fechaAlerta;
        
        const segundos = Math.floor(diferenciaMs / 1000);
        const minutos = Math.floor(segundos / 60);
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);
        
        if (dias > 0) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
        if (horas > 0) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
        if (minutos > 0) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
        return 'Hace unos segundos';
    }

    /**
     * Marca la alerta como atendida
     */
    marcarAtendida() {
        this.atendida = true;
        return this;
    }

    /**
     * Valida la instancia de la alerta
     */
    validar() {
        const errors = Alerta.validate(this);
        if (errors.length > 0) {
            throw new Error(`Alerta inválida: ${errors.join(', ')}`);
        }
        return true;
    }

    /**
     * Serializa para respuesta API
     */
    toJSON() {
        return {
            id_alerta: this.id_alerta,
            id_producto: this.id_producto,
            tipo: this.tipo,
            mensaje: this.mensaje,
            fecha: this.fecha,
            atendida: this.atendida,
            producto_nombre: this.producto_nombre,
            codigo_barra: this.codigo_barra,
            stock_actual: this.stock_actual,
            fecha_caducidad: this.fecha_caducidad,
            // Campos calculados
            pendiente: this.estaPendiente(),
            prioridad: this.getPrioridad(),
            icono: this.getIcono(),
            clase_estilo: this.getClaseEstilo(),
            tiempo_transcurrido: this.getTiempoTranscurrido(),
            es_reciente: this.esReciente()
        };
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Crea instancia desde fila de base de datos
     */
    static fromDatabaseRow(row) {
        const alerta = new Alerta(
            row.id_alerta,
            row.id_producto,
            row.tipo,
            row.mensaje,
            row.fecha,
            row.atendida
        );
        
        // Campos de joins
        if (row.producto_nombre) alerta.producto_nombre = row.producto_nombre;
        if (row.codigo_barra) alerta.codigo_barra = row.codigo_barra;
        if (row.stock) alerta.stock_actual = parseFloat(row.stock);
        if (row.fecha_caducidad) alerta.fecha_caducidad = row.fecha_caducidad;
        
        return alerta;
    }

    /**
     * Crea una nueva alerta de stock bajo
     */
    static crearAlertaStockBajo(id_producto, stockActual, stockMinimo = 5) {
        return new Alerta(
            null,
            id_producto,
            'stock_bajo',
            `Stock bajo: ${stockActual} unidades (mínimo recomendado: ${stockMinimo})`,
            new Date(),
            false
        );
    }

    /**
     * Crea una nueva alerta de caducidad
     */
    static crearAlertaCaducidad(id_producto, fechaCaducidad, diasRestantes) {
        return new Alerta(
            null,
            id_producto,
            'caducidad',
            `Producto caduca en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`,
            new Date(),
            false
        );
    }

    /**
     * Valida los datos de una alerta
     */
    static validate(alertaData) {
        const errors = [];
        const tiposPermitidos = ['caducidad', 'stock_bajo'];

        if (!alertaData.id_producto || isNaN(alertaData.id_producto)) {
            errors.push('ID de producto inválido');
        }

        if (!alertaData.tipo) {
            errors.push('El tipo de alerta es obligatorio');
        } else if (!tiposPermitidos.includes(alertaData.tipo)) {
            errors.push(`Tipo de alerta no válido. Permitidos: ${tiposPermitidos.join(', ')}`);
        }

        if (!alertaData.mensaje || alertaData.mensaje.trim().length === 0) {
            errors.push('El mensaje de la alerta es obligatorio');
        } else if (alertaData.mensaje.length > 500) {
            errors.push('El mensaje no puede exceder 500 caracteres');
        }

        return errors;
    }

    /**
     * Filtra y clasifica alertas
     */
    static clasificarAlertas(alertas) {
        return {
            pendientes: alertas.filter(a => a.estaPendiente()),
            atendidas: alertas.filter(a => !a.estaPendiente()),
            caducidad: alertas.filter(a => a.tipo === 'caducidad'),
            stock_bajo: alertas.filter(a => a.tipo === 'stock_bajo'),
            recientes: alertas.filter(a => a.esReciente())
        };
    }

    /**
     * Obtiene estadísticas de alertas
     */
    static calcularEstadisticas(alertas) {
        const clasificadas = this.clasificarAlertas(alertas);
        
        return {
            total: alertas.length,
            pendientes: clasificadas.pendientes.length,
            atendidas: clasificadas.atendidas.length,
            caducidad: clasificadas.caducidad.length,
            stock_bajo: clasificadas.stock_bajo.length,
            recientes: clasificadas.recientes.length
        };
    }
}

module.exports = Alerta;
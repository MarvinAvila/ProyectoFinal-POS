class Oferta {
    constructor(id_oferta, nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo = true) {
        this.id_oferta = id_oferta;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.porcentaje_descuento = porcentaje_descuento;
        this.fecha_inicio = fecha_inicio;
        this.fecha_fin = fecha_fin;
        this.activo = activo;
        
        // Campos para joins
        this.total_productos = 0;
        this.productos_asociados = [];
    }

    // ==================== MÉTODOS DE INSTANCIA ====================

    /**
     * Verifica si la oferta está activa actualmente
     */
    estaActiva() {
        if (!this.activo) return false;
        
        const ahora = new Date();
        const inicio = new Date(this.fecha_inicio);
        const fin = new Date(this.fecha_fin);
        
        return ahora >= inicio && ahora <= fin;
    }

    /**
     * Verifica si la oferta ha expirado
     */
    haExpirado() {
        const ahora = new Date();
        const fin = new Date(this.fecha_fin);
        return ahora > fin;
    }

    /**
     * Verifica si la oferta está programada (aún no inicia)
     */
    estaProgramada() {
        const ahora = new Date();
        const inicio = new Date(this.fecha_inicio);
        return ahora < inicio;
    }

    /**
     * Obtiene los días restantes para que expire la oferta
     */
    getDiasRestantes() {
        const ahora = new Date();
        const fin = new Date(this.fecha_fin);
        const diferenciaMs = fin - ahora;
        return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Obtiene el estado actual de la oferta
     */
    getEstado() {
        if (!this.activo) return 'INACTIVA';
        if (this.estaProgramada()) return 'PROGRAMADA';
        if (this.haExpirado()) return 'EXPIRADA';
        if (this.estaActiva()) return 'ACTIVA';
        return 'DESCONOCIDO';
    }

    /**
     * Calcula el precio con descuento
     */
    calcularPrecioConDescuento(precioOriginal) {
        const descuento = precioOriginal * (this.porcentaje_descuento / 100);
        return precioOriginal - descuento;
    }

    /**
     * Obtiene el monto de descuento para un precio dado
     */
    getMontoDescuento(precioOriginal) {
        return precioOriginal * (this.porcentaje_descuento / 100);
    }

    /**
     * Valida la instancia de la oferta
     */
    validar() {
        const errors = Oferta.validate(this);
        if (errors.length > 0) {
            throw new Error(`Oferta inválida: ${errors.join(', ')}`);
        }
        return true;
    }

    /**
     * Serializa para respuesta API
     */
    toJSON() {
        return {
            id_oferta: this.id_oferta,
            nombre: this.nombre,
            descripcion: this.descripcion,
            porcentaje_descuento: this.porcentaje_descuento,
            fecha_inicio: this.fecha_inicio,
            fecha_fin: this.fecha_fin,
            activo: this.activo,
            total_productos: this.total_productos,
            // Campos calculados
            esta_activa: this.estaActiva(),
            ha_expirado: this.haExpirado(),
            esta_programada: this.estaProgramada(),
            estado: this.getEstado(),
            dias_restantes: this.getDiasRestantes(),
            productos_asociados: this.productos_asociados
        };
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Crea instancia desde fila de base de datos
     */
    static fromDatabaseRow(row) {
        const oferta = new Oferta(
            row.id_oferta,
            row.nombre,
            row.descripcion,
            parseFloat(row.porcentaje_descuento),
            row.fecha_inicio,
            row.fecha_fin,
            row.activo
        );
        
        if (row.total_productos) oferta.total_productos = parseInt(row.total_productos);
        
        return oferta;
    }

    /**
     * Crea una nueva oferta
     */
    static crear(nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin) {
        return new Oferta(
            null,
            nombre,
            descripcion,
            porcentaje_descuento,
            fecha_inicio,
            fecha_fin,
            true
        );
    }

    /**
     * Valida los datos de una oferta
     */
    static validate(ofertaData) {
        const errors = [];

        if (!ofertaData.nombre || ofertaData.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        } else if (ofertaData.nombre.length > 150) {
            errors.push('El nombre no puede exceder 150 caracteres');
        }

        if (!ofertaData.porcentaje_descuento || isNaN(ofertaData.porcentaje_descuento)) {
            errors.push('El porcentaje de descuento es obligatorio y debe ser numérico');
        } else if (ofertaData.porcentaje_descuento <= 0 || ofertaData.porcentaje_descuento > 100) {
            errors.push('El porcentaje de descuento debe estar entre 1 y 100');
        }

        if (!ofertaData.fecha_inicio) {
            errors.push('La fecha de inicio es obligatoria');
        }

        if (!ofertaData.fecha_fin) {
            errors.push('La fecha de fin es obligatoria');
        }

        if (ofertaData.fecha_inicio && ofertaData.fecha_fin) {
            const inicio = new Date(ofertaData.fecha_inicio);
            const fin = new Date(ofertaData.fecha_fin);
            
            if (inicio >= fin) {
                errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
            }
            
            if (inicio < new Date()) {
                errors.push('La fecha de inicio no puede ser en el pasado');
            }
        }

        return errors;
    }

    /**
     * Filtra ofertas por estado
     */
    static filtrarPorEstado(ofertas, estado) {
        return ofertas.filter(oferta => oferta.getEstado() === estado);
    }

    /**
     * Obtiene ofertas activas
     */
    static getOfertasActivas(ofertas) {
        return this.filtrarPorEstado(ofertas, 'ACTIVA');
    }

    /**
     * Obtiene ofertas próximas a expirar (menos de 3 días)
     */
    static getOfertasProximasAExpirar(ofertas) {
        return ofertas.filter(oferta => 
            oferta.estaActiva() && oferta.getDiasRestantes() <= 3
        );
    }
}

module.exports = Oferta;
class ProductoOferta {
    constructor(id_producto, id_oferta) {
        this.id_producto = id_producto;
        this.id_oferta = id_oferta;
        
        // Campos para joins
        this.producto_nombre = null;
        this.precio_original = null;
        this.precio_con_descuento = null;
        this.porcentaje_descuento = null;
        this.oferta_nombre = null;
        this.oferta_activa = null;
    }

    // ==================== MÉTODOS DE INSTANCIA ====================

    /**
     * Calcula el precio con descuento
     */
    calcularPrecioConDescuento() {
        if (!this.precio_original || !this.porcentaje_descuento) {
            return null;
        }
        const descuento = this.precio_original * (this.porcentaje_descuento / 100);
        return this.precio_original - descuento;
    }

    /**
     * Obtiene el monto de ahorro
     */
    getMontoAhorro() {
        if (!this.precio_original) return null;
        const precioDescuento = this.calcularPrecioConDescuento();
        return precioDescuento ? this.precio_original - precioDescuento : null;
    }

    /**
     * Verifica si la oferta está activa para este producto
     */
    estaActiva() {
        return this.oferta_activa === true;
    }

    /**
     * Valida la instancia de la relación
     */
    validar() {
        const errors = ProductoOferta.validate(this);
        if (errors.length > 0) {
            throw new Error(`Relación producto-oferta inválida: ${errors.join(', ')}`);
        }
        return true;
    }

    /**
     * Serializa para respuesta API
     */
    toJSON() {
        const precioConDescuento = this.calcularPrecioConDescuento();
        const montoAhorro = this.getMontoAhorro();
        
        return {
            id_producto: this.id_producto,
            id_oferta: this.id_oferta,
            producto_nombre: this.producto_nombre,
            precio_original: this.precio_original,
            porcentaje_descuento: this.porcentaje_descuento,
            oferta_nombre: this.oferta_nombre,
            oferta_activa: this.oferta_activa,
            // Campos calculados
            precio_con_descuento: precioConDescuento,
            monto_ahorro: montoAhorro,
            esta_activa: this.estaActiva(),
            ahorro_porcentual: this.porcentaje_descuento
        };
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Crea instancia desde fila de base de datos
     */
    static fromDatabaseRow(row) {
        const productoOferta = new ProductoOferta(
            row.id_producto,
            row.id_oferta
        );
        
        // Campos de joins
        if (row.producto_nombre) productoOferta.producto_nombre = row.producto_nombre;
        if (row.precio_venta) productoOferta.precio_original = parseFloat(row.precio_venta);
        if (row.porcentaje_descuento) productoOferta.porcentaje_descuento = parseFloat(row.porcentaje_descuento);
        if (row.oferta_nombre) productoOferta.oferta_nombre = row.oferta_nombre;
        if (row.activo !== undefined) productoOferta.oferta_activa = row.activo;
        
        return productoOferta;
    }

    /**
     * Crea una nueva relación producto-oferta
     */
    static crear(id_producto, id_oferta) {
        return new ProductoOferta(id_producto, id_oferta);
    }

    /**
     * Valida los datos de la relación
     */
    static validate(relacionData) {
        const errors = [];

        if (!relacionData.id_producto || isNaN(relacionData.id_producto)) {
            errors.push('ID de producto inválido');
        }

        if (!relacionData.id_oferta || isNaN(relacionData.id_oferta)) {
            errors.push('ID de oferta inválido');
        }

        return errors;
    }

    /**
     * Agrupa relaciones por producto
     */
    static agruparPorProducto(relaciones) {
        const agrupado = {};
        
        relaciones.forEach(relacion => {
            if (!agrupado[relacion.id_producto]) {
                agrupado[relacion.id_producto] = {
                    id_producto: relacion.id_producto,
                    producto_nombre: relacion.producto_nombre,
                    ofertas: []
                };
            }
            
            agrupado[relacion.id_producto].ofertas.push(relacion);
        });
        
        return Object.values(agrupado);
    }

    /**
     * Agrupa relaciones por oferta
     */
    static agruparPorOferta(relaciones) {
        const agrupado = {};
        
        relaciones.forEach(relacion => {
            if (!agrupado[relacion.id_oferta]) {
                agrupado[relacion.id_oferta] = {
                    id_oferta: relacion.id_oferta,
                    oferta_nombre: relacion.oferta_nombre,
                    productos: []
                };
            }
            
            agrupado[relacion.id_oferta].productos.push(relacion);
        });
        
        return Object.values(agrupado);
    }

    /**
     * Filtra relaciones activas
     */
    static getRelacionesActivas(relaciones) {
        return relaciones.filter(relacion => relacion.estaActiva());
    }
}

module.exports = ProductoOferta;
class DetalleVenta {
    constructor(id_detalle, id_venta, id_producto, cantidad, precio_unitario, subtotal) {
        this.id_detalle = id_detalle;
        this.id_venta = id_venta;
        this.id_producto = id_producto;
        this.cantidad = cantidad;
        this.precio_unitario = precio_unitario;
        this.subtotal = subtotal;
        this.producto_nombre = null; // Para joins
    }

    // Métodos de instancia
    calcularSubtotal() {
        this.subtotal = this.cantidad * this.precio_unitario;
        return this.subtotal;
    }

    // Métodos estáticos
    static fromDatabaseRow(row) {
        const detalle = new DetalleVenta(
            row.id_detalle,
            row.id_venta,
            row.id_producto,
            parseFloat(row.cantidad),
            parseFloat(row.precio_unitario),
            parseFloat(row.subtotal)
        );
        
        if (row.producto_nombre) {
            detalle.producto_nombre = row.producto_nombre;
        }
        
        if (row.nombre) { // Alias para producto_nombre
            detalle.producto_nombre = row.nombre;
        }
        
        return detalle;
    }

    static crearNuevo(id_venta, id_producto, cantidad, precio_unitario) {
        const detalle = new DetalleVenta(
            null,
            id_venta,
            id_producto,
            cantidad,
            precio_unitario,
            cantidad * precio_unitario
        );
        return detalle;
    }
}

module.exports = DetalleVenta;
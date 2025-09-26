class Venta {
    constructor(id_venta, fecha, id_usuario, forma_pago, subtotal, iva, total) {
        this.id_venta = id_venta;
        this.fecha = fecha;
        this.id_usuario = id_usuario;
        this.forma_pago = forma_pago;
        this.subtotal = subtotal;
        this.iva = iva;
        this.total = total;
        this.detalles = []; // Array de DetalleVenta
    }

    // Métodos de instancia
    agregarDetalle(detalle) {
        this.detalles.push(detalle);
    }

    calcularTotales() {
        this.subtotal = this.detalles.reduce((sum, detalle) => sum + detalle.subtotal, 0);
        this.iva = this.subtotal * 0.16;
        this.total = this.subtotal + this.iva;
    }

    esDelDia() {
        const hoy = new Date().toDateString();
        const fechaVenta = new Date(this.fecha).toDateString();
        return hoy === fechaVenta;
    }

    // Métodos estáticos
    static fromDatabaseRow(row) {
        const venta = new Venta(
            row.id_venta,
            row.fecha,
            row.id_usuario,
            row.forma_pago,
            parseFloat(row.subtotal),
            parseFloat(row.iva),
            parseFloat(row.total)
        );
        
        if (row.usuario_nombre) {
            venta.usuario_nombre = row.usuario_nombre;
        }
        
        return venta;
    }

    static crearNueva(id_usuario, forma_pago = 'efectivo') {
        return new Venta(
            null,
            new Date(),
            id_usuario,
            forma_pago,
            0,
            0,
            0
        );
    }
}

module.exports = Venta;
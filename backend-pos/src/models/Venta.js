class Venta {
    constructor(id_venta, fecha, id_usuario, forma_pago, subtotal, iva, total) {
        this.id_venta = id_venta;
        this.fecha = fecha;
        this.id_usuario = id_usuario;
        this.forma_pago = forma_pago; // 'efectivo', 'tarjeta', 'otro'
        this.subtotal = subtotal;
        this.iva = iva;
        this.total = total;
    }
}

module.exports = Venta;
class Alerta {
    constructor(id_alerta, id_producto, tipo, mensaje, fecha, atendida = false) {
        this.id_alerta = id_alerta;
        this.id_producto = id_producto;
        this.tipo = tipo; // 'caducidad' | 'stock_bajo'
        this.mensaje = mensaje;
        this.fecha = fecha;
        this.atendida = atendida;
    }
}

module.exports = Alerta;

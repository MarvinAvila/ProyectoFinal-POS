class HistorialInventario {
    constructor(id_historial, id_producto, cambio, motivo, fecha, id_usuario) {
        this.id_historial = id_historial;
        this.id_producto = id_producto;
        this.cambio = cambio; // positivo = entrada, negativo = salida
        this.motivo = motivo; // 'venta' | 'compra' | 'ajuste' | 'devolucion'
        this.fecha = fecha;
        this.id_usuario = id_usuario;
    }
}

module.exports = HistorialInventario;

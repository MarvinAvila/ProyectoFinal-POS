class Reporte {
    constructor(id_reporte, tipo, fecha_generado, id_usuario, contenido) {
        this.id_reporte = id_reporte;
        this.tipo = tipo; // 'ventas_dia','top_productos','stock_bajo'
        this.fecha_generado = fecha_generado;
        this.id_usuario = id_usuario;
        this.contenido = contenido; // JSON con la info del reporte
    }
}

module.exports = Reporte;

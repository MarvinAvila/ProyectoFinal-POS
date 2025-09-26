class Comprobante {
    constructor(id_comprobante, id_venta, tipo = 'ticket', contenido, generado_en) {
        this.id_comprobante = id_comprobante;
        this.id_venta = id_venta;
        this.tipo = tipo; // 'ticket' | 'factura'
        this.contenido = contenido; // JSON, base64 PDF, HTML
        this.generado_en = generado_en;
    }
}

module.exports = Comprobante;

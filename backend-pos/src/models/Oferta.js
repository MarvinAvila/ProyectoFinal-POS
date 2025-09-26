class Oferta {
    constructor(id_oferta, nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo = true) {
        this.id_oferta = id_oferta;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.porcentaje_descuento = porcentaje_descuento;
        this.fecha_inicio = fecha_inicio;
        this.fecha_fin = fecha_fin;
        this.activo = activo;
    }
}

module.exports = Oferta;
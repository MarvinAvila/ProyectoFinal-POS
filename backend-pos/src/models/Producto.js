class Producto {
    constructor(
        id_producto, 
        nombre, 
        codigo_barra, 
        precio_compra, 
        precio_venta, 
        stock = 0, 
        unidad, 
        fecha_caducidad = null, 
        id_proveedor = null, 
        id_categoria = null, 
        imagen = null
    ) {
        this.id_producto = id_producto;
        this.nombre = nombre;
        this.codigo_barra = codigo_barra;
        this.precio_compra = precio_compra;
        this.precio_venta = precio_venta;
        this.stock = stock;
        this.unidad = unidad; // 'pieza', 'kg', 'lt', 'otro'
        this.fecha_caducidad = fecha_caducidad;
        this.id_proveedor = id_proveedor;
        this.id_categoria = id_categoria;
        this.imagen = imagen;
    }
}

module.exports = Producto;
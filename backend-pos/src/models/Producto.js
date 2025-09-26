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
        this.unidad = unidad;
        this.fecha_caducidad = fecha_caducidad;
        this.id_proveedor = id_proveedor;
        this.id_categoria = id_categoria;
        this.imagen = imagen;
    }

    // Métodos de instancia
    tieneStockSuficiente(cantidad) {
        return this.stock >= cantidad;
    }

    estaPorCaducar(diasAntelacion = 7) {
        if (!this.fecha_caducidad) return false;
        const hoy = new Date();
        const caducidad = new Date(this.fecha_caducidad);
        const diffTime = caducidad - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= diasAntelacion && diffDays >= 0;
    }

    necesitaReposicion(stockMinimo = 5) {
        return this.stock <= stockMinimo;
    }

    calcularGanancia() {
        return this.precio_venta - this.precio_compra;
    }

    margenGanancia() {
        return ((this.precio_venta - this.precio_compra) / this.precio_compra) * 100;
    }

    // Métodos estáticos
    static fromDatabaseRow(row) {
        return new Producto(
            row.id_producto,
            row.nombre,
            row.codigo_barra,
            parseFloat(row.precio_compra),
            parseFloat(row.precio_venta),
            parseFloat(row.stock),
            row.unidad,
            row.fecha_caducidad,
            row.id_proveedor,
            row.id_categoria,
            row.imagen
        );
    }

    static validate(productoData) {
        const errors = [];
        
        if (!productoData.nombre || productoData.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }
        
        if (!productoData.precio_compra || productoData.precio_compra < 0) {
            errors.push('El precio de compra debe ser positivo');
        }
        
        if (!productoData.precio_venta || productoData.precio_venta < 0) {
            errors.push('El precio de venta debe ser positivo');
        }
        
        if (productoData.precio_venta < productoData.precio_compra) {
            errors.push('El precio de venta no puede ser menor al precio de compra');
        }
        
        if (productoData.stock < 0) {
            errors.push('El stock no puede ser negativo');
        }
        
        const unidadesPermitidas = ['pieza', 'kg', 'lt', 'otro'];
        if (!unidadesPermitidas.includes(productoData.unidad)) {
            errors.push(`Unidad no válida. Permitidas: ${unidadesPermitidas.join(', ')}`);
        }
        
        return errors;
    }
}

module.exports = Producto;
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
    imagen = null,
    codigo_barras_url = null,
    codigo_qr_url = null,
    codigos_public_ids = null
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
    this.codigo_barras_url = codigo_barras_url;
    this.codigo_qr_url = codigo_qr_url;
    this.codigos_public_ids = codigos_public_ids;
  }

  // Métodos de instancia (mantener todos los existentes)
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

  getEstadoStock() {
    if (this.stock <= 0) return "Sin stock";
    if (this.stock <= 5) return "Bajo";
    return "Disponible";
  }

  diasParaCaducar() {
    if (!this.fecha_caducidad) return null;
    const hoy = new Date();
    const caducidad = new Date(this.fecha_caducidad);
    const diffTime = caducidad - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  calcularGanancia() {
    return this.precio_venta - this.precio_compra;
  }

  margenGanancia() {
    return (
      ((this.precio_venta - this.precio_compra) / this.precio_compra) * 100
    );
  }

  tieneCodigosGenerados() {
    return !!(this.codigo_barras_url && this.codigo_qr_url);
  }

  getUrlsCodigos() {
    return {
      barcode: this.codigo_barras_url,
      qr: this.codigo_qr_url,
      public_ids: this.codigos_public_ids,
    };
  }

  // Métodos estáticos
  static fromDatabaseRow(row) {
    // ✅ CORRECCIÓN: Manejo seguro de codigos_public_ids
    let codigosPublicIds = null;

    if (row.codigos_public_ids) {
      if (typeof row.codigos_public_ids === "string") {
        try {
          codigosPublicIds = JSON.parse(row.codigos_public_ids);
        } catch (e) {
          console.warn(
            "⚠️ codigos_public_ids no es JSON válido, usando como string:",
            e.message
          );
          codigosPublicIds = row.codigos_public_ids;
        }
      } else {
        // Ya es objeto (puede pasar en algunos entornos)
        codigosPublicIds = row.codigos_public_ids;
      }
    }

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
      row.imagen,
      row.codigo_barras_url,
      row.codigo_qr_url,
      codigosPublicIds
    );
  }

  static validate(productoData) {
    const errors = [];

    if (!productoData.nombre || productoData.nombre.trim().length < 2) {
      errors.push("El nombre debe tener al menos 2 caracteres");
    }

    if (!productoData.precio_compra || productoData.precio_compra < 0) {
      errors.push("El precio de compra debe ser positivo");
    }

    if (!productoData.precio_venta || productoData.precio_venta < 0) {
      errors.push("El precio de venta debe ser positivo");
    }

    if (productoData.precio_venta < productoData.precio_compra) {
      errors.push("El precio de venta no puede ser menor al precio de compra");
    }

    if (productoData.stock < 0) {
      errors.push("El stock no puede ser negativo");
    }

    const unidadesPermitidas = ["pieza", "kg", "lt", "otro"];
    if (!unidadesPermitidas.includes(productoData.unidad)) {
      errors.push(
        `Unidad no válida. Permitidas: ${unidadesPermitidas.join(", ")}`
      );
    }

    if (productoData.codigo_barra && productoData.codigo_barra.length > 50) {
      errors.push("El código de barras no puede exceder 50 caracteres");
    }

    return errors;
  }
}

module.exports = Producto;

const Producto = require('../models/Producto');
const Venta = require('../models/Venta');
const DetalleVenta = require('../models/DetalleVenta');
const Usuario = require('../models/Usuario');
const Categoria = require('../models/Categoria');
const Proveedor = require('../models/Proveedor');

class ModelMapper {
    static toProducto(row) {
        return Producto.fromDatabaseRow(row);
    }

    static toProductoList(rows) {
        return rows.map(row => Producto.fromDatabaseRow(row));
    }

    static toVenta(row) {
        return Venta.fromDatabaseRow(row);
    }

    static toVentaList(rows) {
        return rows.map(row => Venta.fromDatabaseRow(row));
    }

    static toDetalleVenta(row) {
        return DetalleVenta.fromDatabaseRow(row);
    }

    static toDetalleVentaList(rows) {
        return rows.map(row => DetalleVenta.fromDatabaseRow(row));
    }

    static toUsuario(row) {
        return new Usuario(
            row.id_usuario,
            row.nombre,
            row.correo,
            row.contrasena_hash,
            row.rol,
            row.activo,
            row.creado_en
        );
    }

    static toUsuarioList(rows) {
        return rows.map(row => this.toUsuario(row));
    }

    static toCategoria(row) {
        return new Categoria(
            row.id_categoria,
            row.nombre,
            row.descripcion
        );
    }

    static toCategoriaList(rows) {
        return rows.map(row => this.toCategoria(row));
    }

    static toProveedor(row) {
        return new Proveedor(
            row.id_proveedor,
            row.nombre,
            row.telefono,
            row.email,
            row.direccion
        );
    }

    static toProveedorList(rows) {
        return rows.map(row => this.toProveedor(row));
    }
}

module.exports = ModelMapper;
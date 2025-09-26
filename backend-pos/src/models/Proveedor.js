class Proveedor {
    constructor(id_proveedor, nombre, telefono, email, direccion) {
        this.id_proveedor = id_proveedor;
        this.nombre = nombre;
        this.telefono = telefono;
        this.email = email;
        this.direccion = direccion;
    }
}

module.exports = Proveedor;
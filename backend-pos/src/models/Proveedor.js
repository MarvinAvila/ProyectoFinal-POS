// models/Proveedor.js mejorado
class Proveedor {
    constructor(id_proveedor, nombre, telefono, email, direccion) {
        this.id_proveedor = id_proveedor;
        this.nombre = nombre;
        this.telefono = telefono;
        this.email = email;
        this.direccion = direccion;
        this.total_productos = 0;
    }

    // Métodos de instancia
    tieneInformacionContacto() {
        return this.telefono || this.email;
    }

    // Métodos estáticos
    static fromDatabaseRow(row) {
        const proveedor = new Proveedor(
            row.id_proveedor,
            row.nombre,
            row.telefono,
            row.email,
            row.direccion
        );
        
        if (row.total_productos) proveedor.total_productos = parseInt(row.total_productos);
        
        return proveedor;
    }

    static validate(proveedorData) {
        const errors = [];
        
        if (!proveedorData.nombre || proveedorData.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }
        
        if (proveedorData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(proveedorData.email)) {
                errors.push('El email no tiene formato válido');
            }
        }
        
        return errors;
    }
}
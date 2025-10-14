// models/Categoria.js mejorado
class Categoria {
    constructor(id_categoria, nombre, descripcion) {
        this.id_categoria = id_categoria;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.total_productos = 0; // Para joins
    }

    // Métodos de instancia
    esValida() {
        return this.nombre && this.nombre.trim().length >= 2;
    }

    // Métodos estáticos
    static fromDatabaseRow(row) {
        const categoria = new Categoria(
            row.id_categoria,
            row.nombre,
            row.descripcion
        );
        
        if (row.total_productos) categoria.total_productos = parseInt(row.total_productos);
        
        return categoria;
    }

    static validate(categoriaData) {
        const errors = [];
        
        if (!categoriaData.nombre || categoriaData.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }
        
        if (categoriaData.nombre && categoriaData.nombre.length > 100) {
            errors.push('El nombre no puede exceder 100 caracteres');
        }
        
        return errors;
    }
}
    module.exports = Categoria;
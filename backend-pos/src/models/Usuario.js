class Usuario {
    constructor(id_usuario, nombre, correo, contrasena_hash, rol, activo = true, creado_en) {
        this.id_usuario = id_usuario;
        this.nombre = nombre;
        this.correo = correo;
        this.contrasena_hash = contrasena_hash;
        this.rol = rol; // 'admin', 'cajero', 'gerente', 'dueno'
        this.activo = activo;
        this.creado_en = creado_en;
    }
}

module.exports = Usuario;
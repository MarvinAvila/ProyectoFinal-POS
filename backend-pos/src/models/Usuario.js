const bcrypt = require('bcrypt');

class Usuario {
    constructor(id_usuario, nombre, correo, contrasena_hash, rol, activo = true, creado_en = null) {
        this.id_usuario = id_usuario;
        this.nombre = nombre;
        this.correo = correo;
        this.contrasena_hash = contrasena_hash;
        this.rol = rol;
        this.activo = activo;
        this.creado_en = creado_en || new Date();
    }

    // ==================== MÉTODOS DE INSTANCIA ====================

    /**
     * Verifica si la contraseña proporcionada coincide con el hash almacenado
     */
    async verificarContrasena(contrasenaPlana) {
        if (!this.contrasena_hash) {
            throw new Error('No hay hash de contraseña almacenado');
        }
        return await bcrypt.compare(contrasenaPlana, this.contrasena_hash);
    }

    /**
     * Encripta y actualiza la contraseña del usuario
     */
    async actualizarContrasena(nuevaContrasena) {
        if (!nuevaContrasena || nuevaContrasena.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        const saltRounds = 10;
        this.contrasena_hash = await bcrypt.hash(nuevaContrasena, saltRounds);
        return this.contrasena_hash;
    }

    /**
     * Verifica si el usuario tiene un rol específico
     */
    tieneRol(rolRequerido) {
        return this.rol === rolRequerido;
    }

    /**
     * Verifica si el usuario tiene permisos de administración
     */
    esAdministrador() {
        return this.rol === 'admin' || this.rol === 'dueno';
    }

    /**
     * Verifica si el usuario tiene permisos de gerencia o superiores
     */
    esGerenteOSuperior() {
        return this.esAdministrador() || this.rol === 'gerente';
    }

    /**
     * Verifica si el usuario puede modificar otro usuario
     */
    puedeModificarUsuario(otroUsuarioId) {
        return this.esAdministrador() || this.id_usuario === otroUsuarioId;
    }

    /**
     * Verifica si el usuario puede eliminar otro usuario
     */
    puedeEliminarUsuario(otroUsuarioId) {
        // Solo admin/dueno pueden eliminar, y no pueden auto-eliminarse
        return this.esAdministrador() && this.id_usuario !== otroUsuarioId;
    }

    /**
     * Verifica permisos para acceder a rutas específicas
     */
    puedeAccederA(ruta) {
        const permisos = {
            dueno: ['*'], // Acceso total
            admin: [
                '/api/usuarios', '/api/productos', '/api/proveedores', 
                '/api/categorias', '/api/inventario', '/api/ofertas',
                '/api/reportes', '/api/dashboard'
            ],
            gerente: [
                '/api/productos', '/api/inventario', '/api/reportes', 
                '/api/dashboard', '/api/alertas'
            ],
            cajero: [
                '/api/ventas', '/api/productos', '/api/comprobantes',
                '/api/detalle-venta'
            ]
        };

        // Dueño tiene acceso total
        if (permisos.dueno === '*') return true;

        // Verificar rutas específicas del rol
        const rutasPermitidas = permisos[this.rol] || [];
        
        // Permite acceso si la ruta coincide exactamente o es subruta
        return rutasPermitidas.some(rutaPermitida => 
            ruta === rutaPermitida || ruta.startsWith(rutaPermitida + '/')
        );
    }

    /**
     * Verifica si el usuario puede realizar una acción específica
     */
    puedeRealizarAccion(accion, recurso) {
        const matrizPermisos = {
            dueno: { usuarios: ['crear', 'leer', 'actualizar', 'eliminar'], /* ... */ },
            admin: { usuarios: ['crear', 'leer', 'actualizar'], productos: ['crear', 'leer', 'actualizar', 'eliminar'] },
            gerente: { productos: ['leer', 'actualizar'], inventario: ['leer', 'actualizar'] },
            cajero: { ventas: ['crear', 'leer'], productos: ['leer'] }
        };

        if (this.rol === 'dueno') return true;
        
        return matrizPermisos[this.rol]?.[recurso]?.includes(accion) || false;
    }

    /**
     * Obtiene los roles a los que este usuario puede asignar
     */
    getRolesAsignables() {
        const jerarquiaRoles = {
            dueno: ['admin', 'gerente', 'cajero', 'dueno'],
            admin: ['gerente', 'cajero'],
            gerente: ['cajero'],
            cajero: [] // No puede asignar roles
        };

        return jerarquiaRoles[this.rol] || [];
    }

    /**
     * Verifica si puede asignar un rol específico a otro usuario
     */
    puedeAsignarRol(rolObjetivo) {
        return this.getRolesAsignables().includes(rolObjetivo);
    }

    /**
     * Serializa el usuario para respuesta (excluye información sensible)
     */
    toJSON() {
        return {
            id_usuario: this.id_usuario,
            nombre: this.nombre,
            correo: this.correo,
            rol: this.rol,
            activo: this.activo,
            creado_en: this.creado_en,
            puede_administrar: this.esAdministrador()
        };
    }

    /**
     * Obtiene información pública del usuario (para perfiles)
     */
    getPerfilPublico() {
        return {
            id_usuario: this.id_usuario,
            nombre: this.nombre,
            rol: this.rol,
            activo: this.activo,
            miembro_desde: this.creado_en
        };
    }

    /**
     * Valida la instancia actual del usuario
     */
    validar() {
        const errors = Usuario.validate(this);
        if (errors.length > 0) {
            throw new Error(`Usuario inválido: ${errors.join(', ')}`);
        }
        return true;
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Crea una instancia de Usuario desde una fila de la base de datos
     */
    static fromDatabaseRow(row) {
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

    /**
     * Crea un nuevo usuario con contraseña encriptada
     */
    static async crear(nombre, correo, contrasenaPlana, rol = 'cajero') {
        const errors = Usuario.validate({ nombre, correo, contrasena: contrasenaPlana, rol });
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const saltRounds = 10;
        const contrasena_hash = await bcrypt.hash(contrasenaPlana, saltRounds);

        return new Usuario(
            null, // ID se generará en la base de datos
            nombre.trim(),
            correo.toLowerCase().trim(),
            contrasena_hash,
            rol,
            true, // activo por defecto
            new Date()
        );
    }

    /**
     * Valida los datos de un usuario
     */
    static validate(usuarioData, esActualizacion = false) {
        const errors = [];
        const rolesPermitidos = ['admin', 'cajero', 'gerente', 'dueno'];

        // Validación de nombre
        if (!esActualizacion || usuarioData.nombre !== undefined) {
            if (!usuarioData.nombre || usuarioData.nombre.trim().length === 0) {
                errors.push('El nombre es obligatorio');
            } else if (usuarioData.nombre.trim().length < 2) {
                errors.push('El nombre debe tener al menos 2 caracteres');
            } else if (usuarioData.nombre.length > 100) {
                errors.push('El nombre no puede exceder 100 caracteres');
            }
        }

        // Validación de correo
        if (!esActualizacion || usuarioData.correo !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!usuarioData.correo) {
                errors.push('El correo electrónico es obligatorio');
            } else if (!emailRegex.test(usuarioData.correo)) {
                errors.push('El correo electrónico no es válido');
            } else if (usuarioData.correo.length > 150) {
                errors.push('El correo no puede exceder 150 caracteres');
            }
        }

        // Validación de contraseña (solo para creación o cambio explícito)
        if (!esActualizacion || usuarioData.contrasena !== undefined) {
            if (usuarioData.contrasena) {
                if (usuarioData.contrasena.length < 6) {
                    errors.push('La contraseña debe tener al menos 6 caracteres');
                }
                if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(usuarioData.contrasena)) {
                    errors.push('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
                }
            } else if (!esActualizacion) {
                errors.push('La contraseña es obligatoria para nuevos usuarios');
            }
        }

        // Validación de rol
        if (!esActualizacion || usuarioData.rol !== undefined) {
            if (usuarioData.rol && !rolesPermitidos.includes(usuarioData.rol)) {
                errors.push(`Rol no válido. Permitidos: ${rolesPermitidos.join(', ')}`);
            }
        }

        // Validación de estado activo
        if (usuarioData.activo !== undefined && typeof usuarioData.activo !== 'boolean') {
            errors.push('El estado activo debe ser verdadero o falso');
        }

        return errors;
    }

    /**
     * Filtra los campos permitidos para actualización
     */
    static filtrarCamposActualizacion(campos) {
        const camposPermitidos = ['nombre', 'correo', 'rol', 'activo'];
        const filtrado = {};
        
        for (const campo of camposPermitidos) {
            if (campos[campo] !== undefined) {
                filtrado[campo] = campos[campo];
            }
        }
        
        return filtrado;
    }

    /**
     * Normaliza los datos del usuario (trim, lowercase, etc.)
     */
    static normalizarDatos(usuarioData) {
        const normalizado = { ...usuarioData };
        
        if (normalizado.nombre) {
            normalizado.nombre = normalizado.nombre.trim();
        }
        
        if (normalizado.correo) {
            normalizado.correo = normalizado.correo.toLowerCase().trim();
        }
        
        return normalizado;
    }

    /**
     * Crea un usuario para pruebas (desarrollo)
     */
    static crearUsuarioDemo(rol = 'cajero') {
        const timestamp = Date.now();
        return new Usuario(
            null,
            `Usuario Demo ${timestamp}`,
            `demo${timestamp}@ejemplo.com`,
            'hash_placeholder', // En la práctica se encriptaría
            rol,
            true,
            new Date()
        );
    }
}

module.exports = Usuario;
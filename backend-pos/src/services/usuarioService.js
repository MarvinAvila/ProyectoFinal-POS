// src/services/usuarioService.js

const db = require('../config/database');
const usuarioRepository = require('../repositories/usuarioRepository');
// Importamos el repo de ventas que creamos para 'ventaController'
const { ventaRepository } = require('../repositories/ventaRepository'); 
const Usuario = require('../models/Usuario');
const helpers = require('../utils/helpers');
const QueryBuilder = require('../utils/queryBuilder');

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.status = status;
        if (details) this.details = details;
    }
}

const ROLES_VALIDOS = ['admin', 'gerente', 'cajero', 'dueno'];

const usuarioService = {

    async getAllUsuarios(query) {
        const { q, rol, activo, sortBy = 'creado_en', sortOrder = 'DESC' } = query;
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        const searchTerm = q ? QueryBuilder.sanitizeSearchTerm(q) : null;
        
        const whereClauses = [];
        const params = [];
        let idx = 1;

        if (searchTerm) {
            whereClauses.push(`(nombre ILIKE $${idx} OR correo ILIKE $${idx})`);
            params.push(`%${searchTerm}%`);
            idx++;
        }
        if (rol) {
            if (!ROLES_VALIDOS.includes(rol)) {
                throw new BusinessError(`Rol inválido. Válidos: ${ROLES_VALIDOS.join(', ')}`, 400);
            }
            whereClauses.push(`rol = $${idx++}`);
            params.push(rol);
        }
        if (activo !== undefined) {
            whereClauses.push(`activo = $${idx++}`);
            params.push(activo === 'true' || activo === '1');
        }

        const validSortFields = ['nombre', 'correo', 'rol', 'creado_en', 'ultimo_login'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'creado_en';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const { usuarios, total } = await usuarioRepository.findAll({
            whereSQL, params, sortField, order, limit: limitNum, offset
        });
        
        // Enriquecer con información del modelo
        const usuariosConInfo = usuarios.map(usuario => ({
            ...usuario.toJSON(),
            es_administrador: usuario.esAdministrador(),
            puede_asignar_roles: usuario.getRolesAsignables().length > 0,
            estado: usuario.activo ? 'Activo' : 'Inactivo'
        }));
        
        return {
            usuarios: usuariosConInfo,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
            filtros: { q, rol, activo }
        };
    },

    async getUsuarioById(id, includeStats = false) {
        const validId = QueryBuilder.validateId(id);
        const usuario = await usuarioRepository.findById(validId);
        
        if (!usuario) {
            throw new BusinessError("Usuario no encontrado", 404);
        }

        const usuarioJSON = usuario.toJSON();

        if (includeStats) {
            usuarioJSON.estadisticas = await usuarioRepository.getVentasStatsById(validId);
        }
        
        return usuarioJSON;
    },

    async createUsuario(data) {
        const { nombre, correo, contrasena, rol } = data;
        
        if (!nombre || !correo || !contrasena) {
            throw new BusinessError('Nombre, correo y contraseña son obligatorios', 400);
        }
        
        const usuarioData = {
            nombre: helpers.sanitizeInput(nombre),
            correo: helpers.sanitizeInput(correo).toLowerCase(),
            contrasena: contrasena,
            rol: rol || 'cajero'
        };

        const validationErrors = Usuario.validate(usuarioData);
        if (validationErrors.length > 0) {
            throw new BusinessError('Errores de validación', 400, { errors: validationErrors });
        }
        
        if (!ROLES_VALIDOS.includes(usuarioData.rol)) {
            throw new BusinessError(`Rol inválido. Válidos: ${ROLES_VALIDOS.join(', ')}`, 400);
        }
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const correoExistente = await usuarioRepository.findByEmail(usuarioData.correo, client);
            if (correoExistente) {
                throw new BusinessError('Ya existe un usuario con ese correo electrónico', 409);
            }

            const contrasenaHash = await Usuario.hashContrasena(usuarioData.contrasena);
            const usuarioCreado = await usuarioRepository.create(usuarioData, contrasenaHash, client);
            
            await client.query('COMMIT');
            return usuarioCreado.toJSON();

        } catch (error) {
            await client.query('ROLLBACK');
            if (error.code === "23505") { // Fallback por si acaso
                throw new BusinessError("El correo electrónico ya está registrado", 409);
            }
            throw error;
        } finally {
            client.release();
        }
    },
    
    async updateUsuario(id, data) {
        const validId = QueryBuilder.validateId(id);
        const { nombre, correo, rol, activo } = data;

        const updates = {};
        if (nombre !== undefined) updates.nombre = helpers.sanitizeInput(nombre);
        if (correo !== undefined) updates.correo = helpers.sanitizeInput(correo).toLowerCase();
        if (rol !== undefined) updates.rol = rol;
        if (activo !== undefined) updates.activo = (activo === true || activo === 'true');

        if (Object.keys(updates).length === 0) {
            throw new BusinessError('No se proporcionaron campos válidos para actualizar', 400);
        }
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const usuarioActual = await usuarioRepository.findById(validId, client);
            if (!usuarioActual) {
                throw new BusinessError('Usuario no encontrado', 404);
            }

            if (updates.correo && updates.correo !== usuarioActual.correo) {
                const correoExistente = await usuarioRepository.findByEmail(updates.correo, client);
                if (correoExistente && correoExistente.id_usuario !== validId) {
                    throw new BusinessError('Ya existe otro usuario con ese correo electrónico', 409);
                }
            }
            
            if (updates.rol && !ROLES_VALIDOS.includes(updates.rol)) {
                 throw new BusinessError(`Rol inválido. Válidos: ${ROLES_VALIDOS.join(', ')}`, 400);
            }

            const usuarioActualizado = await usuarioRepository.update(validId, updates, client);
            
            await client.query('COMMIT');
            return usuarioActualizado.toJSON();

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    async setUsuarioActivo(id, activo, adminUserId) {
        const validId = QueryBuilder.validateId(id);
        const activoBool = (activo === true || activo === 'true');

        if (parseInt(id) === parseInt(adminUserId) && !activoBool) {
            throw new BusinessError('No puedes desactivar tu propia cuenta', 400);
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const usuario = await usuarioRepository.findById(validId, client);
            if (!usuario) {
                throw new BusinessError('Usuario no encontrado', 404);
            }
            
            const usuarioActualizado = await usuarioRepository.updateStatus(validId, activoBool, client);
            
            await client.query('COMMIT');
            return usuarioActualizado.toJSON();

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    async deleteUsuario(id, adminUserId) {
        const validId = QueryBuilder.validateId(id);
        
        if (parseInt(id) === parseInt(adminUserId)) {
            throw new BusinessError('No puedes eliminar tu propia cuenta', 400);
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const usuario = await usuarioRepository.findById(validId, client);
            if (!usuario) {
                throw new BusinessError('Usuario no encontrado', 404);
            }

            // Usar el mini-repo de ventas
            const countVentas = await ventaRepository.countByUsuarioId(validId, client);
            
            if (countVentas > 0) {
                // Soft delete
                await usuarioRepository.updateStatus(validId, false, client);
                await client.query('COMMIT');
                return { 
                    modo: 'desactivado', 
                    nombre: usuario.nombre, 
                    ventas_asociadas: countVentas 
                };
            } else {
                // Hard delete
                await usuarioRepository.hardDelete(validId, client);
                await client.query('COMMIT');
                return { 
                    modo: 'eliminado', 
                    nombre: usuario.nombre 
                };
            }
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    async changeUsuarioPassword(id, { contrasena_actual, nueva_contrasena }, adminUser) {
        const validId = QueryBuilder.validateId(id);

        if (!nueva_contrasena) {
            throw new BusinessError('La nueva contraseña es requerida', 400);
        }
        
        const validationErrors = Usuario.validarSoloContrasena(nueva_contrasena);
        if (validationErrors.length > 0) {
             throw new BusinessError(`Nueva contraseña inválida: ${validationErrors.join(', ')}`, 400);
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const usuario = await usuarioRepository.findById(validId, client);
            if (!usuario) {
                throw new BusinessError('Usuario no encontrado', 404);
            }
            
            const isAdmin = adminUser.esAdministrador();
            const isSelf = parseInt(id) === parseInt(adminUser.id_usuario);

            if (isSelf) {
                // El usuario cambia su propia contraseña
                if (!contrasena_actual) {
                    throw new BusinessError('La contraseña actual es requerida', 400);
                }
                const contrasenaValida = await usuario.validatePassword(contrasena_actual);
                if (!contrasenaValida) {
                    throw new BusinessError('Contraseña actual incorrecta', 401);
                }
            } else if (!isAdmin) {
                // Un no-admin intenta cambiar la de otro
                throw new BusinessError('No tienes permisos para cambiar la contraseña de otros usuarios', 403);
            }
            // Si es Admin cambiando la de otro, no se pide 'contrasena_actual'

            const nuevaContrasenaHash = await Usuario.hashContrasena(nueva_contrasena);
            await usuarioRepository.updatePassword(validId, nuevaContrasenaHash, client);

            await client.query('COMMIT');
            return { usuarioId: validId, cambio_propio: isSelf };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = usuarioService;
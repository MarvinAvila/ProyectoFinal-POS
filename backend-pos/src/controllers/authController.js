const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';
const JWT_EXPIRES_IN = '24h';

const authController = {
  // Login
  async login(req, res) {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ 
        success: false, 
        message: 'Correo y contraseña son obligatorios' 
      });
    }

    try {
      // Buscar usuario
      const result = await db.query(
        'SELECT id_usuario, nombre, correo, contrasena_hash, rol, activo FROM usuarios WHERE correo = $1',
        [correo]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciales inválidas' 
        });
      }

      const user = result.rows[0];

      // Verificar si está activo
      if (!user.activo) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuario inactivo. Contacta al administrador.' 
        });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(contrasena, user.contrasena_hash);
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciales inválidas' 
        });
      }

      // Generar token
      const token = jwt.sign(
        { 
          id_usuario: user.id_usuario, 
          nombre: user.nombre, 
          correo: user.correo, 
          rol: user.rol 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Excluir hash de la respuesta
      const { contrasena_hash, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          token,
          expiresIn: JWT_EXPIRES_IN
        }
      });

    } catch (error) {
      console.error('authController.login error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor durante el login' 
      });
    }
  },

  // Verificar token (me)
  async getMe(req, res) {
    try {
      const result = await db.query(
        'SELECT id_usuario, nombre, correo, rol, activo, creado_en FROM usuarios WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      return res.json({ 
        success: true, 
        data: result.rows[0] 
      });

    } catch (error) {
      console.error('authController.getMe error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo información del usuario' 
      });
    }
  },

  // Cambiar contraseña
  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contraseña actual y nueva contraseña son obligatorias' 
      });
    }

    try {
      // Obtener usuario con hash
      const result = await db.query(
        'SELECT id_usuario, contrasena_hash FROM usuarios WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      const user = result.rows[0];

      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(currentPassword, user.contrasena_hash);
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Contraseña actual incorrecta' 
        });
      }

      // Hashear nueva contraseña
      const newHash = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      await db.query(
        'UPDATE usuarios SET contrasena_hash = $1 WHERE id_usuario = $2',
        [newHash, req.user.id_usuario]
      );

      return res.json({ 
        success: true, 
        message: 'Contraseña actualizada correctamente' 
      });

    } catch (error) {
      console.error('authController.changePassword error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error cambiando contraseña' 
      });
    }
  }
};

module.exports = authController;
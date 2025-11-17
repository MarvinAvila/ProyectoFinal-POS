const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_jwt_muy_segura";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Genera un token JWT para un usuario.
 * @param {Usuario} usuario
 * @returns {string}
 */
const generarToken = (usuario) => {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      session_id: crypto.randomBytes(16).toString("hex"),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Genera un token aleatorio para recuperación de contraseña.
 * @returns {string}
 */
const generarTokenRecuperacion = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = {
  generarToken,
  generarTokenRecuperacion,
  BCRYPT_ROUNDS,
  JWT_EXPIRES_IN,
};
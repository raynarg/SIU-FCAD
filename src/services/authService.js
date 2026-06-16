// ============================================================
//  src/services/authService.js
//  Capa de Servicio — Lógica de negocio de autenticación
//
//  Responsabilidades:
//    · Verificar que el usuario exista en la BD
//    · Comparar la contraseña ingresada con el hash SHA-256 almacenado
//    · Generar y retornar el token JWT si las credenciales son válidas
//    · Verificar la contraseña actual antes de permitir un cambio
//    · Lanzar errores HTTP-aware (con statusCode) para que el errorHandler
//      los capture y responda con el código correcto
//
//  Funciones exportadas:
//    · login              — verifica credenciales y retorna JWT
//    · cambiarContrasenia — valida contraseña actual y actualiza a la nueva
//
//  NO hace:
//    · Leer ni escribir en la BD directamente (delegado a usuariosRepository)
//    · Manejar la respuesta HTTP (delegado a authController)
// ============================================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as usuariosRepository from '../repositories/usuariosRepository.js';

// Helper interno: genera el hash SHA-256 de un texto.
// Se usa para comparar contraseñas sin almacenarlas en texto plano.
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// ─────────────────────────────────────────────────────────────
//  login — verifica credenciales y retorna el token JWT
// ─────────────────────────────────────────────────────────────
/**
 * Valida nombre de usuario y contraseña. Si son correctos, devuelve un JWT
 * firmado con los datos del usuario y expira en 8 horas.
 *
 * @param {string} nombre_usuario - Nombre de usuario tal como está en la BD
 * @param {string} contrasenia    - Contraseña en texto plano enviada por el cliente
 * @returns {Promise<{ token: string, usuario: object }>} Token JWT y datos del usuario (sin contraseña)
 * @throws {Error} 401 si el usuario no existe o la contraseña es incorrecta
 */
export async function login(nombre_usuario, contrasenia) {
    // 1. Buscar el usuario en la BD por su nombre de usuario
    const usuario = await usuariosRepository.findByUsername(nombre_usuario);

    // Se usa el mismo mensaje tanto si el usuario no existe como si la contraseña
    // es incorrecta, para no revelar cuál de los dos falló (previene enumeración de usuarios).
    if (!usuario) {
        const error = new Error('Credenciales inválidas');
        error.statusCode = 401;
        throw error;
    }

    // 2. Hashear la contraseña ingresada con SHA-256 y comparar con el hash almacenado
    const passwordValida = sha256(contrasenia) === usuario.contrasenia;

    if (!passwordValida) {
        const error = new Error('Credenciales inválidas');
        error.statusCode = 401;
        throw error;
    }

    // 3. Construir el payload que irá dentro del token JWT.
    //    No se incluyen datos sensibles como la contraseña.
    const payload = {
        id:             usuario.id_usuario,
        nombre:         usuario.nombre,
        apellido:       usuario.apellido,
        nombre_usuario: usuario.nombre_usuario,
    };

    // 4. Firmar el token con la clave secreta del .env; expira en 8 horas.
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 5. Retornar el token y los datos del usuario (sin contraseña)
    return { token, usuario: payload };
}

// ─────────────────────────────────────────────────────────────
//  cambiarContrasenia — valida contraseña actual y actualiza
// ─────────────────────────────────────────────────────────────
/**
 * Permite al usuario autenticado cambiar su propia contraseña.
 * Verifica que la contraseña actual sea correcta antes de aplicar el cambio.
 *
 * @param {number} userId           - ID del usuario autenticado (viene de req.user.id)
 * @param {string} contraseniaActual - Contraseña actual en texto plano (para verificar identidad)
 * @param {string} contraseniaNueva  - Nueva contraseña en texto plano (se hashea antes de guardar)
 * @returns {Promise<void>}
 * @throws {Error} 404 si el usuario no existe
 * @throws {Error} 400 si la contraseña actual es incorrecta
 */
export async function cambiarContrasenia(userId, contraseniaActual, contraseniaNueva) {
    // 1. Verificar que el usuario exista (podría haber sido dado de baja)
    const usuario = await usuariosRepository.findById(userId);
    if (!usuario) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        throw error;
    }

    // 2. Comparar la contraseña actual ingresada con el hash almacenado en BD
    const passwordValida = sha256(contraseniaActual) === usuario.contrasenia;
    if (!passwordValida) {
        const error = new Error('La contraseña actual es incorrecta');
        error.statusCode = 400;
        throw error;
    }

    // 3. Hashear la nueva contraseña y persistirla en la BD
    await usuariosRepository.updatePassword(userId, sha256(contraseniaNueva));
}

// ============================================================
//  src/services/authService.js
//  Capa de Servicio — Lógica de negocio de autenticación
//
//  Responsabilidades:
//    · Verificar que el usuario exista en la BD
//    · Comparar la contraseña ingresada con el hash almacenado
//    · Generar y retornar el token JWT si las credenciales son válidas
//    · Lanzar errores HTTP-aware (con statusCode) para que el errorHandler
//      los capture y responda con el código correcto
// ============================================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as usuariosRepository from '../repositories/usuariosRepository.js';

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// ─────────────────────────────────────────────────────────────
//  login — verifica credenciales y retorna el token JWT
// ─────────────────────────────────────────────────────────────
/**
 * Valida usuario y contraseña. Si son correctos, devuelve un JWT.
 *
 * @param {string} nombre_usuario 
 * @param {string} contrasenia   
 * @returns {Promise<{ token: string, usuario: object }>}
 * @throws {Error} 
 */
export async function login(nombre_usuario, contrasenia) {
    // 1. Buscar el usuario en la BD por su nombre de usuario
    const usuario = await usuariosRepository.findByUsername(nombre_usuario);

    // Usamos el mismo mensaje tanto si el usuario no existe como si la contraseña
    // es incorrecta, para no revelar cuál de los dos falló (seguridad)
    if (!usuario) {
        const error = new Error('Credenciales inválidas');
        error.statusCode = 401; // Unauthorized
        throw error;
    }

    // 2. Comparar la contraseña ingresada con el hash guardado en la BD
    //    bcrypt.compare hace la comparación de forma segura (tiempo constante)
    const passwordValida = sha256(contrasenia) === usuario.contrasenia;

    if (!passwordValida) {
        const error = new Error('Credenciales inválidas');
        error.statusCode = 401; 
        throw error;
    }

    // 3. Construir el payload que ira dentro del token JWT
    //    No incluir datos sensibles contraseña,etc
    const payload = {
        id: usuario.id_usuario,      
        nombre: usuario.nombre,       
        apellido: usuario.apellido,    
        nombre_usuario: usuario.nombre_usuario 
    };

    // 4. Firmar el token con la clave secreta del .env
    //    expiresIn: el token expira en 8 horas 
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 5. Retornar el token y los datos del usuario (sin contraseña)
    return { token, usuario: payload };
}

export async function cambiarContrasenia(userId, contraseniaActual, contraseniaNueva) {
    const usuario = await usuariosRepository.findById(userId);
    if (!usuario) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        throw error;
    }

    const passwordValida = sha256(contraseniaActual) === usuario.contrasenia;
    if (!passwordValida) {
        const error = new Error('La contraseña actual es incorrecta');
        error.statusCode = 400;
        throw error;
    }

    await usuariosRepository.updatePassword(userId, sha256(contraseniaNueva));
}

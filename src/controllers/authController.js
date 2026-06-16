// ============================================================
//  src/controllers/authController.js
//  Capa de Controlador — HTTP handlers del módulo de Autenticación
//
//  Responsabilidades:
//    · Extraer los datos del body del request y delegarlos al service
//    · Retornar la respuesta HTTP adecuada al cliente (200, 4xx)
//    · Propagar cualquier error al errorHandler global con next(error)
//
//  Handlers exportados:
//    · login              — POST /api/v1/auth/login
//    · cambiarContrasenia — PUT  /api/v1/auth/change-password (requiere JWT)
//
//  NO hace:
//    · Verificar contraseñas ni generar tokens (delegado a authService)
//    · Acceder a la base de datos directamente (delegado a usuariosRepository)
//    · Validar el formato del body (delegado a validators + validateBody)
// ============================================================

import * as authService from '../services/authService.js';

// ─────────────────────────────────────────────────────────────
//  POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────
/**
 * Recibe credenciales, delega al servicio y retorna el JWT si son válidas.
 *
 * @param {import('express').Request}      req                     - Express request
 * @param {string}                         req.body.nombre_usuario - Nombre de usuario
 * @param {string}                         req.body.contrasenia    - Contraseña en texto plano
 * @param {import('express').Response}     res                     - Express response
 * @param {import('express').NextFunction} next - Propaga errores al errorHandler global
 * @returns {Promise<void>} 200 { success: true, token, usuario } o propaga error al handler
 */
export async function login(req, res, next) {
    try {
        // Extraer las credenciales del body (ya validadas por express-validator en las rutas)
        const { nombre_usuario, contrasenia } = req.body;

        // Delegar al servicio: verifica contraseña, genera y retorna el JWT
        const resultado = await authService.login(nombre_usuario, contrasenia);

        // Si llegamos aquí, las credenciales son válidas → responder con el token
        res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        // El servicio lanza errores con statusCode (401 si credenciales inválidas)
        // El errorHandler global los captura y retorna la respuesta correcta
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  PUT /api/v1/auth/change-password   (requiere JWT)
// ─────────────────────────────────────────────────────────────
/**
 * Permite al usuario autenticado cambiar su propia contraseña.
 * Requiere que `authMiddleware` haya inyectado `req.user` con el id del usuario.
 *
 * @param {import('express').Request}      req                          - Express request
 * @param {number}                         req.user.id                  - ID del usuario autenticado (inyectado por authMiddleware)
 * @param {string}                         req.body.contrasenia_actual  - Contraseña actual para verificar identidad
 * @param {string}                         req.body.contrasenia_nueva   - Nueva contraseña (mín. 6 caracteres)
 * @param {import('express').Response}     res                          - Express response
 * @param {import('express').NextFunction} next - Propaga errores al errorHandler global
 * @returns {Promise<void>} 200 { success: true, message } o propaga error al handler
 */
export async function cambiarContrasenia(req, res, next) {
    try {
        const { contrasenia_actual, contrasenia_nueva } = req.body;

        // El id del usuario viene de req.user, inyectado por authMiddleware al verificar el JWT
        await authService.cambiarContrasenia(req.user.id, contrasenia_actual, contrasenia_nueva);

        res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        // El servicio lanza 401 si la contraseña actual no coincide
        next(error);
    }
}

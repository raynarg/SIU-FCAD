// ============================================================
//  src/middlewares/authMiddleware.js
//  Middleware de Autenticación JWT
//
//  Responsabilidades:
//    · Leer el token del header Authorization: Bearer <token>
//    · Verificar que el token sea válido y no haya expirado
//    · Si es válido: adjuntar los datos del usuario a req.user
//      para que los controladores puedan acceder a req.user.id, etc.
//    · Si no es válido: cortar el pipeline y responder 401 Unauthorized
//
//  Uso: aplicar este middleware en los routers que requieran autenticación:
//    router.use(authMiddleware)  →  protege TODAS las rutas del router
//    router.post('/', authMiddleware, ctrl.create)  →  protege una ruta específica
// ============================================================

import jwt from 'jsonwebtoken'; // para verificar la firma y expiración del token

/**
 * Middleware Express que valida el JWT del header Authorization.
 * Si el token es válido, agrega `req.user` con el payload decodificado
 * y llama a `next()` para continuar el pipeline.
 * Si el token falta o es inválido, responde 401 y corta el pipeline.
 *
 * @param {import('express').Request}  req  - Express request; tras autenticación exitosa
 *   se adjunta `req.user` con los campos del payload: { id, nombre, rol, ... }
 * @param {import('express').Response} res  - Express response
 * @param {import('express').NextFunction} next - Siguiente middleware o controlador
 * @returns {void}
 */
export function authMiddleware(req, res, next) {
    // 1. Leer el header Authorization del request
    //    El formato esperado es: "Bearer eyJhbGci..."
    const authHeader = req.headers['authorization'];

    // Si no hay header o no empieza con "Bearer ", rechazar con 401
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Acceso denegado: token no proporcionado'
        });
    }

    // 2. Extraer solo el token (eliminar el prefijo "Bearer ")
    //    authHeader = "Bearer abc123..." → token = "abc123..."
    const token = authHeader.slice(7); // 7 = longitud de "Bearer "

    try {
        // 3. Verificar la firma del token usando JWT_SECRET del .env
        //    Si el token fue alterado o expiró, jwt.verify lanza una excepción
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Adjuntar el payload decodificado a req.user para que los
        //    controladores puedan leer req.user.id, req.user.nombre, etc.
        req.user = payload;

        // 5. Token válido → continuar al siguiente middleware o controlador
        next();
    } catch (error) {
        // jwt.verify lanza JsonWebTokenError si la firma es inválida
        // o TokenExpiredError si el token expiró
        return res.status(401).json({
            success: false,
            error: 'Token inválido o expirado'
        });
    }
}

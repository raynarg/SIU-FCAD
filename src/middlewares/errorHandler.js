// ============================================================
//  src/middlewares/errorHandler.js
//  Middleware Global de Errores — Captura todos los errores del pipeline
//
//  Responsabilidades:
//    · Leer err.statusCode (asignado por el servicio) o usar 500 por defecto
//    · Retornar siempre { success: false, error: message }
//    · Loguear el stack trace completo en consola para debugging
//
//  Debe registrarse ÚLTIMO en app.js (después de todas las rutas).
// ============================================================

/**
 * Express error-handling middleware de 4 argumentos (err, req, res, next).
 * Captura cualquier error propagado con next(error) en el pipeline.
 *
 * @param {Error}    err   - Error capturado; puede tener la propiedad err.statusCode
 * @param {object}   req   - Express request (no se usa, requerido por la firma de 4 args)
 * @param {object}   res   - Express response
 * @param {Function} next  - Siguiente middleware (no se usa, requerido por la firma de 4 args)
 */
export function errorHandler(err, req, res, next) {
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    res.status(statusCode).json({
        success: false,
        error: message
    });
}

// ============================================================
//  src/middlewares/errorHandler.js
//  Middleware Global de Errores — Captura todos los errores del pipeline
//
//  Responsabilidades:
//    · Interceptar cualquier error propagado con next(err) desde controllers,
//      services o middlewares anteriores
//    · Leer err.statusCode (convención usada en services) o usar 500 por defecto
//    · Retornar siempre la forma { success: false, error: message }
//    · Loguear el stack trace completo en consola para debugging
//
//  Requisito de Express:
//    · La firma DEBE tener exactamente 4 parámetros (err, req, res, next).
//      Express detecta los error handlers por aridad; con 3 parámetros, Express
//      trataría esta función como middleware normal y los errores no llegarían aquí.
//
//  Orden de registro:
//    · Debe registrarse DESPUÉS de todas las rutas en app.js; de lo contrario,
//      solo capturaría errores de los middlewares registrados antes de él.
//
//  NO hace:
//    · Diferenciar tipos de error (ValidationError, AuthError, etc.); eso queda
//      en manos de cada service que asigna el statusCode apropiado
//    · Enviar notificaciones o reportar errores a servicios externos (Sentry, etc.)
// ============================================================

/**
 * Express error-handling middleware de 4 argumentos (err, req, res, next).
 * Captura cualquier error propagado con next(err) en el pipeline y envía
 * una respuesta JSON uniforme con el código HTTP y el mensaje del error.
 *
 * Convención de statusCode: los services lanzan errores con `err.statusCode`
 * seteado (ej.: 400, 404, 409); si no está definido se asume 500.
 *
 * @param {Error & { statusCode?: number }} err  - Error capturado; puede incluir
 *   `statusCode` asignado por el service para controlar el HTTP status de respuesta
 * @param {import('express').Request}        req  - Express request (no se usa;
 *   requerido por la firma de 4 parámetros que Express exige para error handlers)
 * @param {import('express').Response}       res  - Express response
 * @param {import('express').NextFunction}   next - Siguiente middleware (no se usa;
 *   requerido por la firma de 4 parámetros que Express exige para error handlers)
 * @returns {void}
 */
export function errorHandler(err, req, res, next) {
    // Loguear el stack trace completo para facilitar el debugging en servidor;
    // el cliente solo recibe el mensaje, nunca el stack.
    console.error(err.stack);

    // Respetar el statusCode que asignó el service (400, 404, 409, etc.)
    // o caer en 500 si el error no fue intencionalmente tipado.
    const statusCode = err.statusCode || 500;
    const message    = err.message    || 'Error interno del servidor';

    res.status(statusCode).json({
        success: false,
        error: message
    });
}

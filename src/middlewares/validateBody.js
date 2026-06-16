// ============================================================
//  src/middlewares/validateBody.js
//  Middleware genérico de validación — express-validator
//
//  Responsabilidad única:
//    · Leer el resultado acumulado de express-validator en req
//    · Si hay errores: cortar el pipeline y responder 400 con la lista
//    · Si no hay errores: llamar a next() y dejar pasar el request
//
//  Las REGLAS de validación (body('nombre').notEmpty(), etc.)
//  NO van aquí — van en validators.js y se aplican en cada router,
//  porque son específicas de cada recurso/endpoint.
//
//  NO hace:
//    · Definir qué campos son obligatorios o qué formato deben tener
//    · Sanitizar ni transformar datos (eso lo hacen los validators)
//    · Acceder a la base de datos ni ejecutar lógica de negocio
// ============================================================

import { validationResult } from 'express-validator';

/**
 * Middleware genérico y reutilizable que ejecuta la verificación final
 * de express-validator después de que las reglas de validación ya corrieron.
 *
 * Patrón de uso en el router:
 *   router.post('/', validarCurso, validate, cursosController.createCurso);
 *                    ^^^^^^^^^^^   ^^^^^^^
 *                    reglas        este middleware
 *
 * Si hay errores, responde 400 con un array de { field, message } para que
 * el cliente sepa exactamente qué campo falló y por qué.
 *
 * @param {import('express').Request}      req  - Express request; express-validator
 *   acumula los resultados de validación internamente en este objeto
 * @param {import('express').Response}     res  - Express response
 * @param {import('express').NextFunction} next - Siguiente middleware o controlador;
 *   solo se invoca si no hay errores de validación
 * @returns {void}
 */
export function validate(req, res, next) {
    // Leer todos los errores de validación acumulados por las reglas previas
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Proyectar solo `path` (nombre del campo) y `msg` (mensaje de error)
        // para no exponer detalles internos del objeto de error de express-validator
        return res.status(400).json({
            success: false,
            errors: errors.array().map(e => ({
                field:   e.path,
                message: e.msg,
            })),
        });
    }

    // Sin errores de validación → continuar al controlador
    next();
}
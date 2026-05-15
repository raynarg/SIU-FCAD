// ============================================================
//  src/middlewares/validateBody.js
//
//  Responsabilidad ÚNICA: leer el resultado de express-validator
//  y cortar el pipeline si hay errores de validación.
//
//  Las REGLAS de validación (body('nombre').notEmpty(), etc.)
//  NO van acá — van en cada router (cursosRoutes.js, etc.)
//  porque son específicas de cada recurso.
// ============================================================

import { validationResult } from 'express-validator';

/**
 * Middleware genérico y reutilizable.
 * Se usa en cualquier ruta que tenga validaciones de express-validator.
 *
 * Uso en el router:
 *   router.post('/', validarCurso, validate, cursosController.createCurso);
 *                    ^^^^^^^^^^^   ^^^^^^^
 *                    reglas        este middleware
 */
export function validate(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(e => ({
                field:   e.path,
                message: e.msg,
            })),
        });
    }

    next();
}
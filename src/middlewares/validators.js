// ============================================================
//  src/middlewares/validators.js
//  Reglas de Validación — express-validator
//
//  Responsabilidades:
//    · Definir los arrays de ValidationChain para cada recurso de la API
//    · Declarar restricciones de formato, longitud y tipo por campo
//    · Ser aplicados en los routers ANTES de `validate` (validateBody.js)
//
//  Flujo de uso en el router:
//    router.post('/', validarCurso, validate, cursosController.createCurso)
//                     ^^^^^^^^^^^   ^^^^^^^
//                     estas reglas  validateBody.js ejecuta validationResult()
//
//  NO hace:
//    · Ejecutar la verificación final (eso lo hace validate en validateBody.js)
//    · Acceder a la base de datos ni verificar unicidad de datos
//    · Contener lógica de negocio (solo formato/tipo/longitud)
// ============================================================

import { body, param } from 'express-validator';

/**
 * Valida que el parámetro de ruta `:id` sea un entero positivo.
 * Se reutiliza en cualquier ruta que reciba un ID numérico como param.
 *
 * @type {import('express-validator').ValidationChain[]}
 */
export const validarId = [
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

/**
 * Valida el body para creación o actualización de un curso.
 *
 * Reglas de negocio:
 *   - `nombre`: obligatorio, máx. 200 caracteres (límite de la columna en BD)
 *   - `descripcion`: obligatorio, sin límite de longitud definido en BD
 *   - `fecha_inicio`: debe ser una fecha válida (YYYY-MM-DD)
 *   - `cantidad_horas`: entero entre 1 y 500 (rango razonable para un curso)
 *   - `inscriptos_max`: entero >= 1 (no puede haber un curso sin cupo)
 *   - `id_curso_estado`: entero entre 1 y 3 (valores posibles en tabla curso_estado)
 *
 * @type {import('express-validator').ValidationChain[]}
 */
export const validarCurso = [
    body('nombre').trim().notEmpty().isLength({ max: 200 }),
    body('descripcion').trim().notEmpty(),
    body('fecha_inicio').isDate(),
    // Rango 1-500: un curso de 0 horas no tiene sentido; 500 es el máximo aceptable
    body('cantidad_horas').isInt({ min: 1, max: 500 }),
    body('inscriptos_max').isInt({ min: 1 }),
    // Los estados válidos son: 1 = activo, 2 = inactivo, 3 = cancelado
    body('id_curso_estado').isInt({ min: 1, max: 3 }),
];

/**
 * Valida el body para creación o actualización de un estudiante.
 *
 * Reglas de negocio:
 *   - `documento`: obligatorio, entre 7 y 20 caracteres (cubre DNI y pasaporte)
 *   - `nombres`: obligatorio, máx. 100 caracteres (límite de columna en BD)
 *   - `apellido`: obligatorio, máx. 100 caracteres (límite de columna en BD)
 *   - `email`: formato de email válido, máx. 150 caracteres (límite de columna en BD)
 *   - `fecha_nacimiento`: debe ser una fecha válida (YYYY-MM-DD)
 *
 * @type {import('express-validator').ValidationChain[]}
 */
export const validarEstudiante = [
    // min: 7 cubre DNI argentino (7 u 8 dígitos); max: 20 cubre pasaportes internacionales
    body('documento').trim().notEmpty().isLength({ min: 7, max: 20 }),
    body('nombres').trim().notEmpty().isLength({ max: 100 }),
    body('apellido').trim().notEmpty().isLength({ max: 100 }),
    body('email').trim().isEmail().isLength({ max: 150 }),
    body('fecha_nacimiento').isDate(),
];

/**
 * Valida el body para crear una inscripción (asociar estudiante a curso).
 *
 * Reglas de negocio:
 *   - `id_estudiante`: obligatorio, entero positivo (FK a tabla estudiantes)
 *   - `id_curso`: obligatorio, entero positivo (FK a tabla cursos)
 *   - `fecha_inscripcion`: opcional; si se provee debe tener formato ISO8601.
 *     Si se omite, el service asigna la fecha actual por defecto.
 *
 * @type {import('express-validator').ValidationChain[]}
 */
export const validarInscripcion = [
    body('id_estudiante').isInt({ min: 1 }).withMessage('El ID del estudiante es requerido y debe ser entero'),
    body('id_curso').isInt({ min: 1 }).withMessage('El ID del curso es requerido y debe ser entero'),
    // optional(): permite omitir el campo; si está presente debe ser ISO8601 (ej.: "2024-03-15")
    body('fecha_inscripcion').optional().isISO8601().withMessage('La fecha debe tener formato ISO8601'),
];

/**
 * Valida el body para el endpoint de login.
 *
 * Reglas de negocio:
 *   - `nombre_usuario`: obligatorio, no puede estar vacío
 *   - `contrasenia`: obligatorio, no puede estar vacío
 *   (la verificación de credenciales la hace authService, no este validador)
 *
 * @type {import('express-validator').ValidationChain[]}
 */
export const validarLogin = [
    body('nombre_usuario').trim().notEmpty().withMessage('El nombre de usuario es requerido'),
    body('contrasenia').notEmpty().withMessage('La contraseña es requerida'),
];

/**
 * Valida el body para el endpoint de cambio de contraseña.
 *
 * Reglas de negocio:
 *   - `contrasenia_actual`: obligatorio para verificar identidad antes del cambio
 *   - `contrasenia_nueva`: mínimo 6 caracteres (política mínima de seguridad)
 *
 * @type {import('express-validator').ValidationChain[]}
 */
export const validarCambioContrasenia = [
    body('contrasenia_actual').notEmpty().withMessage('La contraseña actual es requerida'),
    // min: 6 es la política mínima de seguridad definida para este sistema
    body('contrasenia_nueva').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
];

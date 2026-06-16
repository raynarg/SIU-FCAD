// ============================================================
//  src/controllers/estudiantesController.js
//  Capa de Controlador — HTTP handlers del módulo Estudiantes
//
//  Responsabilidades:
//    · Extraer datos de req (params, query, body)
//    · Llamar al servicio correspondiente
//    · Retornar la respuesta HTTP con el status code correcto
//    · Delegar errores al errorHandler mediante next(error)
//
//  Handlers exportados:
//    · getEstudiantes     — GET    /api/v1/estudiantes
//    · getEstudianteById  — GET    /api/v1/estudiantes/:id
//    · createEstudiante   — POST   /api/v1/estudiantes
//    · updateEstudiante   — PUT    /api/v1/estudiantes/:id
//    · deleteEstudiante   — DELETE /api/v1/estudiantes/:id
//
//  NO hace:
//    · Lógica de negocio (delegada a estudiantesService)
//    · Acceso a la base de datos (delegado a estudiantesRepository)
//    · Validación de formato del body (delegada a validators + validateBody)
// ============================================================

import * as estService from '../services/estudiantesService.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — GET /api/v1/estudiantes
// ─────────────────────────────────────────────────────────────
/**
 * Lista estudiantes con paginación y filtros opcionales.
 * Pasa el objeto completo `req.query` al servicio para que resuelva
 * page, limit y cualquier filtro disponible.
 *
 * @param {import('express').Request}      req               - Express request
 * @param {string}                         [req.query.page]  - Número de página (default: 1)
 * @param {string}                         [req.query.limit] - Registros por página (default: 10)
 * @param {import('express').Response}     res               - Express response
 * @param {import('express').NextFunction} next              - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, data: EstudianteDTO[], pagination: object }
 */
export async function getEstudiantes(req, res, next) {
    try {
        const resultado = await estService.getEstudiantes(req.query);
        res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — GET /api/v1/estudiantes/:id
// ─────────────────────────────────────────────────────────────
/**
 * Retorna un único estudiante por su ID. El servicio lanza 404 si no existe.
 *
 * @param {import('express').Request}      req           - Express request
 * @param {string}                         req.params.id - ID del estudiante (validado como entero positivo)
 * @param {import('express').Response}     res           - Express response
 * @param {import('express').NextFunction} next          - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, data: EstudianteDTO }
 */
export async function getEstudianteById(req, res, next) {
    try {
        const est = await estService.getEstudianteById(req.params.id);
        res.status(200).json({ success: true, data: est });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  A D D  — POST /api/v1/estudiantes
// ─────────────────────────────────────────────────────────────
/**
 * Crea un nuevo estudiante con los datos del body.
 *
 * @param {import('express').Request}      req      - Express request
 * @param {Object}                         req.body - Datos del nuevo estudiante (validados por express-validator)
 * @param {import('express').Response}     res      - Express response
 * @param {import('express').NextFunction} next     - Pasa errores al errorHandler
 * @returns {Promise<void>} 201 { success: true, data: EstudianteDTO }
 */
export async function createEstudiante(req, res, next) {
    try {
        // El ID del usuario autenticado se obtiene de req.user.id,
        // inyectado por authMiddleware al verificar el JWT.
        const userId = req.user.id;
        const nuevo = await estService.createEstudiante(req.body, userId);
        res.status(201).json({ success: true, data: nuevo });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  E D I T  — PUT /api/v1/estudiantes/:id
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza un estudiante existente. El servicio lanza 404 si no existe.
 *
 * @param {import('express').Request}      req           - Express request
 * @param {string}                         req.params.id - ID del estudiante a actualizar
 * @param {Object}                         req.body      - Campos a actualizar (validados por express-validator)
 * @param {import('express').Response}     res           - Express response
 * @param {import('express').NextFunction} next          - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, data: EstudianteDTO }
 */
export async function updateEstudiante(req, res, next) {
    try {
        // El ID del usuario autenticado se obtiene de req.user.id,
        // inyectado por authMiddleware al verificar el JWT.
        const userId = req.user.id;
        const actualizado = await estService.updateEstudiante(req.params.id, req.body, userId);
        res.status(200).json({ success: true, data: actualizado });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — DELETE /api/v1/estudiantes/:id
// ─────────────────────────────────────────────────────────────
/**
 * Realiza un soft delete del estudiante (baja lógica, no borra el registro de la BD).
 * El servicio lanza 404 si el estudiante no existe o ya fue dado de baja.
 *
 * @param {import('express').Request}      req           - Express request
 * @param {string}                         req.params.id - ID del estudiante a dar de baja
 * @param {import('express').Response}     res           - Express response
 * @param {import('express').NextFunction} next          - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, message: string }
 */
export async function deleteEstudiante(req, res, next) {
    try {
        // El ID del usuario autenticado se obtiene de req.user.id,
        // inyectado por authMiddleware al verificar el JWT.
        const userId = req.user.id;
        await estService.deleteEstudiante(req.params.id, userId);
        res.status(200).json({ success: true, message: `Estudiante ${req.params.id} dado de baja.` });
    } catch (error) {
        next(error);
    }
}

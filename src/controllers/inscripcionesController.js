// ============================================================
//  src/controllers/inscripcionesController.js
//  Capa de Controlador — HTTP handlers del módulo Inscripciones
//
//  Responsabilidades:
//    · Extraer datos de req (params, query, body)
//    · Llamar al servicio correspondiente
//    · Retornar la respuesta HTTP con el status code correcto
//    · Delegar errores al errorHandler mediante next(error)
//
//  Handlers exportados:
//    · getInscripciones    — GET    /api/v1/inscripciones
//    · getInscripcionById  — GET    /api/v1/inscripciones/:id
//    · createInscripcion   — POST   /api/v1/inscripciones
//    · deleteInscripcion   — DELETE /api/v1/inscripciones/:id
//
//  Nota: no existe updateInscripcion — una inscripción solo se crea o se da de baja;
//  no se actualiza parcialmente (regla de negocio del dominio).
//
//  NO hace:
//    · Lógica de negocio (delegada a inscripcionesService)
//    · Acceso a la base de datos (delegado a inscripcionesRepository)
//    · Validación de formato del body (delegada a validators + validateBody)
// ============================================================

import * as inscripcionesService from '../services/inscripcionesService.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — GET /api/v1/inscripciones
// ─────────────────────────────────────────────────────────────
/**
 * Lista inscripciones con paginación y filtros opcionales por texto y curso.
 *
 * @param {import('express').Request}      req                  - Express request
 * @param {string}                         [req.query.page]     - Número de página (default: 1)
 * @param {string}                         [req.query.limit]    - Registros por página (default: 10)
 * @param {string}                         [req.query.search]   - Filtro de texto libre (nombre/apellido del estudiante)
 * @param {string}                         [req.query.curso]    - Filtro por nombre o ID de curso
 * @param {import('express').Response}     res                  - Express response
 * @param {import('express').NextFunction} next                 - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, data: InscripcionDTO[], pagination: object }
 */
export async function getInscripciones(req, res, next) {
    try {
        const { page, limit, search, curso } = req.query;
        const resultado = await inscripcionesService.getInscripciones({ page, limit, search, curso });
        res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — GET /api/v1/inscripciones/:id
// ─────────────────────────────────────────────────────────────
/**
 * Retorna una única inscripción por su ID. El servicio lanza 404 si no existe.
 *
 * @param {import('express').Request}      req           - Express request
 * @param {string}                         req.params.id - ID de la inscripción (validado como entero positivo)
 * @param {import('express').Response}     res           - Express response
 * @param {import('express').NextFunction} next          - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, data: InscripcionDTO }
 */
export async function getInscripcionById(req, res, next) {
    try {
        const inscripcion = await inscripcionesService.getInscripcionById(req.params.id);
        res.status(200).json({ success: true, data: inscripcion });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  A D D  — POST /api/v1/inscripciones
// ─────────────────────────────────────────────────────────────
/**
 * Crea una nueva inscripción vinculando un estudiante a un curso.
 * El servicio verifica que el curso tenga cupo disponible y que el estudiante
 * no esté ya inscripto antes de insertar el registro.
 *
 * @param {import('express').Request}      req      - Express request
 * @param {Object}                         req.body - Datos de la inscripción (validados por express-validator)
 * @param {import('express').Response}     res      - Express response
 * @param {import('express').NextFunction} next     - Pasa errores al errorHandler
 * @returns {Promise<void>} 201 { success: true, data: InscripcionDTO }
 */
export async function createInscripcion(req, res, next) {
    try {
        // El ID del usuario autenticado se obtiene de req.user.id,
        // inyectado por authMiddleware al verificar el JWT.
        const userId = req.user.id;
        const nueva = await inscripcionesService.createInscripcion(req.body, userId);
        res.status(201).json({ success: true, data: nueva });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — DELETE /api/v1/inscripciones/:id
// ─────────────────────────────────────────────────────────────
/**
 * Realiza la baja de una inscripción (soft delete o eliminación según implementación).
 * El servicio lanza 404 si la inscripción no existe o ya fue dada de baja.
 *
 * @param {import('express').Request}      req           - Express request
 * @param {string}                         req.params.id - ID de la inscripción a dar de baja
 * @param {import('express').Response}     res           - Express response
 * @param {import('express').NextFunction} next          - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, message: string }
 */
export async function deleteInscripcion(req, res, next) {
    try {
        // El ID del usuario autenticado se obtiene de req.user.id,
        // inyectado por authMiddleware al verificar el JWT.
        const userId = req.user.id;
        await inscripcionesService.deleteInscripcion(req.params.id, userId);
        res.status(200).json({ success: true, message: 'Inscripción dada de baja exitosamente' });
    } catch (error) {
        next(error);
    }
}

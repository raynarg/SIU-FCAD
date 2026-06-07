// ============================================================
//  src/controllers/cursosController.js
//  Capa de Controlador — HTTP handlers del módulo Cursos
//
//  Responsabilidades de esta capa:
//    · Extraer datos de req (params, query, body)
//    · Llamar al servicio correspondiente
//    · Retornar la respuesta HTTP con el status code correcto
//    · Delegar errores al errorHandler mediante next(error)
//
//  Esta capa NO contiene lógica de negocio (eso es trabajo del servicio).
//  Esta capa NO accede a la BD directamente (eso es trabajo del repository).
// ============================================================

import * as cursosService from '../services/cursosService.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — GET /api/v1/cursos
// ─────────────────────────────────────────────────────────────
/**
 * Lista cursos con paginación y filtros opcionales por nombre y estado.
 *
 * @param {Object} req              - Express request
 * @param {Object} req.query        - Parámetros de filtro y paginación
 * @param {string} req.query.page   - Número de página (default: 1)
 * @param {string} req.query.limit  - Registros por página (default: 10, máx: 100)
 * @param {string} req.query.nombre - Filtro parcial por nombre
 * @param {string} req.query.id_curso_estado - Filtro exacto por estado
 * @param {Object} res              - Express response
 * @param {Function} next           - Pasa errores al errorHandler
 * @returns {200} { success: true, data: CursoDTO[], pagination: object }
 */
export async function getCursos(req, res, next) {
    try {
        const { page, limit, nombre, id_curso_estado } = req.query;
        const resultado = await cursosService.getCursos({ page, limit, nombre, id_curso_estado });
        res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — GET /api/v1/cursos/:id
// ─────────────────────────────────────────────────────────────
/**
 * Retorna un único curso por su ID. El servicio lanza 404 si no existe.
 *
 * @param {Object} req              - Express request
 * @param {Object} req.params       - Parámetros de ruta
 * @param {string} req.params.id    - ID del curso (validado como entero positivo por express-validator)
 * @param {Object} res              - Express response
 * @param {Function} next           - Pasa errores al errorHandler
 * @returns {200} { success: true, data: CursoDTO }
 */
export async function getCursoById(req, res, next) {
    try {
        const curso = await cursosService.getCursoById(req.params.id);
        res.status(200).json({ success: true, data: curso });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  A D D  — POST /api/v1/cursos
// ─────────────────────────────────────────────────────────────
/**
 * Crea un nuevo curso con los datos del body.
 * `req.user?.id ?? 1`: usa el ID del usuario autenticado si existe;
 * mientras no esté implementado el módulo de auth se usa 1 como valor temporal.
 *
 * @param {Object} req           - Express request
 * @param {Object} req.body      - Datos del nuevo curso (validados por express-validator)
 * @param {Object} res           - Express response
 * @param {Function} next        - Pasa errores al errorHandler
 * @returns {201} { success: true, data: CursoDTO }
 */
export async function createCurso(req, res, next) {
    try {
        const userId = req.user?.id ?? 1;
        const nuevo  = await cursosService.createCurso(req.body, userId);
        res.status(201).json({ success: true, data: nuevo });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  E D I T  — PUT /api/v1/cursos/:id
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza un curso existente. El servicio lanza 404 si no existe.
 *
 * @param {Object} req              - Express request
 * @param {Object} req.params       - Parámetros de ruta
 * @param {string} req.params.id    - ID del curso a actualizar
 * @param {Object} req.body         - Campos a actualizar (validados por express-validator)
 * @param {Object} res              - Express response
 * @param {Function} next           - Pasa errores al errorHandler
 * @returns {200} { success: true, data: CursoDTO }
 */
export async function updateCurso(req, res, next) {
    try {
        const userId      = req.user?.id ?? 1;
        const actualizado = await cursosService.updateCurso(req.params.id, req.body, userId);
        res.status(200).json({ success: true, data: actualizado });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — DELETE /api/v1/cursos/:id
// ─────────────────────────────────────────────────────────────
/**
 * Realiza un soft delete del curso (lo marca como inactivo, no lo borra de la BD).
 * El servicio lanza 404 si el curso no existe o ya fue eliminado.
 *
 * @param {Object} req              - Express request
 * @param {Object} req.params       - Parámetros de ruta
 * @param {string} req.params.id    - ID del curso a eliminar
 * @param {Object} res              - Express response
 * @param {Function} next           - Pasa errores al errorHandler
 * @returns {200} { success: true, message: string }
 */
export async function deleteCurso(req, res, next) {
    try {
        const userId = req.user?.id ?? 1;
        await cursosService.deleteCurso(req.params.id, userId);
        res.status(200).json({ success: true, message: `Curso ${req.params.id} eliminado correctamente.` });
    } catch (error) {
        next(error);
    }
}

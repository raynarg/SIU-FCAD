// ============================================================
//  src/services/cursos.service.js
//  Capa de Servicio — Lógica de negocio del módulo Cursos
//
//  Responsabilidades de esta capa (según U3-04):
//    · Ejecutar las reglas de negocio antes/después de ir a la BD
//    · Llamar al repository para persistir/recuperar datos
//    · Transformar la respuesta mediante DTOs
//    · Lanzar errores con statusCode para que el errorHandler los capture
//
//  Esta capa NO conoce req/res (eso es trabajo del controlador).
//  Esta capa NO ejecuta SQL directamente (eso es trabajo del repository).
// ============================================================

import * as cursosRepo from '../repositories/cursosRepository.js';
import { toCursoDTO }  from '../dtos/cursosDto.js';

// ─────────────────────────────────────────────────────────────
//  Helper interno: lanza un error HTTP-aware
// ─────────────────────────────────────────────────────────────
function crearError(mensaje, statusCode = 500) {
    const error    = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — Listar cursos con paginación y filtros
// ─────────────────────────────────────────────────────────────
/**
 * Devuelve una página de cursos activos junto con metadatos de paginación.
 *
 * @param {object} params
 * @param {number} params.page            - Página actual (default: 1)
 * @param {number} params.limit           - Registros por página (default: 10)
 * @param {string} params.nombre          - Filtro parcial sobre el nombre (ILIKE)
 * @param {number|null} params.id_curso_estado - Filtro exacto por estado
 * @returns {Promise<{data: object[], pagination: object}>}
 */
export async function getCursos({ page = 1, limit = 10, nombre = '', id_curso_estado = null }) {
    // Asegurar tipos correctos (los query params llegan como string)
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // tope de 100 por petición

    const { rows, total } = await cursosRepo.findAll({
        page:             pageNum,
        limit:            limitNum,
        nombre:           nombre.trim(),
        id_curso_estado:  id_curso_estado ? parseInt(id_curso_estado) : null,
    });

    const totalPages = Math.ceil(total / limitNum);

    return {
        data: rows.map(toCursoDTO),
        pagination: {
            total,
            page:        pageNum,
            limit:       limitNum,
            totalPages,
            hasNext:     pageNum < totalPages,
            hasPrev:     pageNum > 1,
        },
    };
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — Obtener un curso por ID
// ─────────────────────────────────────────────────────────────
/**
 * Busca un curso activo por su ID.
 * Lanza 404 si no existe o fue eliminado (soft delete).
 *
 * @param {number|string} id
 * @returns {Promise<object>} DTO del curso
 */
export async function getCursoById(id) {
    const curso = await cursosRepo.findById(parseInt(id));

    if (!curso) {
        throw crearError(`No se encontró el curso con ID ${id}.`, 404);
    }

    return toCursoDTO(curso);
}

// ─────────────────────────────────────────────────────────────
//  A D D  — Crear un nuevo curso
// ─────────────────────────────────────────────────────────────
/**
 * Valida reglas de negocio y persiste un nuevo curso.
 *
 * Reglas de negocio aplicadas:
 *   1. La fecha de inicio no puede ser en el pasado.
 *   2. Si el estado es "Inscripción Abierta" (2), inscriptos_max debe ser > 0.
 *
 * @param {object} data   - Datos validados por el middleware (express-validator)
 * @param {number} userId - ID del usuario autenticado (temporal: hardcodeado en controller)
 * @returns {Promise<object>} DTO del curso creado
 */
export async function createCurso(data, userId) {
    // Regla 1: fecha de inicio no puede ser en el pasado
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (new Date(data.fecha_inicio) < hoy) {
        throw crearError('La fecha de inicio no puede ser una fecha pasada.', 400);
    }

    // Regla 2: si está abierto a inscripciones, debe tener cupo definido
    if (data.id_curso_estado === 2 && (!data.inscriptos_max || data.inscriptos_max < 1)) {
        throw crearError('Un curso con inscripción abierta debe tener inscriptos_max mayor a 0.', 400);
    }

    const nuevo = await cursosRepo.create({
        ...data,
        id_usuario_modificacion: userId,
    });

    return toCursoDTO(nuevo);
}

// ─────────────────────────────────────────────────────────────
//  E D I T  — Actualizar un curso existente
// ─────────────────────────────────────────────────────────────
/**
 * Verifica que el curso exista y aplica las actualizaciones.
 *
 * Reglas de negocio aplicadas:
 *   1. El curso debe existir y estar activo.
 *   2. No se puede cerrar la inscripción si tiene datos de inscriptos activos
 *      (esta validación se puede extender cuando se implemente el módulo de inscripciones).
 *
 * @param {number|string} id
 * @param {object} data
 * @param {number} userId
 * @returns {Promise<object>} DTO del curso actualizado
 */
export async function updateCurso(id, data, userId) {
    const existente = await cursosRepo.findById(parseInt(id));

    if (!existente) {
        throw crearError(`No se encontró el curso con ID ${id}.`, 404);
    }

    // Regla: solo validar fecha si se está cambiando y es distinta a la actual
    if (data.fecha_inicio) {
        const fechaNueva = new Date(data.fecha_inicio);
        const fechaExistente = new Date(existente.fecha_inicio);
        fechaExistente.setHours(0, 0, 0, 0);

        const estaCambiandoFecha = fechaNueva.getTime() !== fechaExistente.getTime();

        if (estaCambiandoFecha) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fechaNueva < hoy) {
                throw crearError('La nueva fecha de inicio no puede ser una fecha pasada.', 400);
            }
        }
    }

    const actualizado = await cursosRepo.update(parseInt(id), {
        ...data,
        id_usuario_modificacion: userId,
    });

    return toCursoDTO(actualizado);
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — Soft delete de un curso
// ─────────────────────────────────────────────────────────────
/**
 * Marca el curso como inactivo (activo = false). No elimina el registro de la BD.
 *
 * Reglas de negocio aplicadas:
 *   1. El curso debe existir y estar activo.
 *
 * @param {number|string} id
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteCurso(id, userId) {
    const existente = await cursosRepo.findById(parseInt(id));

    if (!existente) {
        throw crearError(`No se encontró el curso con ID ${id}.`, 404);
    }

    await cursosRepo.softDelete(parseInt(id), userId);
}
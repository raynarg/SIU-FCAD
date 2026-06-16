// ============================================================
//  src/services/cursosService.js
//  Capa de Servicio — Lógica de negocio del módulo Cursos
//
//  Responsabilidades:
//    · Ejecutar las reglas de negocio antes/después de ir a la BD
//    · Llamar al repository para persistir/recuperar datos
//    · Transformar la respuesta mediante DTOs antes de retornar al controller
//    · Lanzar errores con statusCode para que el errorHandler los capture
//
//  Funciones exportadas:
//    · getCursos     — lista paginada con filtros
//    · getCursoById  — un curso por ID
//    · createCurso   — crea con validaciones de negocio
//    · updateCurso   — actualiza con validaciones de negocio
//    · deleteCurso   — soft delete + baja en cascada de inscripciones
//
//  NO hace:
//    · Conocer req/res (delegado al controller)
//    · Ejecutar SQL directamente (delegado a cursosRepository e inscripcionesRepository)
// ============================================================

import * as cursosRepo       from '../repositories/cursosRepository.js';
import * as inscripcionesRepo from '../repositories/inscripcionesRepository.js';
import { toCursoDTO }        from '../dtos/cursosDto.js';

// ─────────────────────────────────────────────────────────────
//  Helper interno: lanza un error HTTP-aware
// ─────────────────────────────────────────────────────────────
/**
 * Crea un error HTTP-aware con statusCode para que el errorHandler lo capture.
 *
 * @param {string} mensaje          - Mensaje descriptivo del error
 * @param {number} [statusCode=500] - Código HTTP a enviar en la respuesta
 * @returns {Error} Error enriquecido con la propiedad statusCode
 */
function crearError(mensaje, statusCode = 500) {
    const error      = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — Listar cursos con paginación y filtros
// ─────────────────────────────────────────────────────────────
/**
 * Devuelve una página de cursos junto con metadatos de paginación.
 *
 * @param {object}      params
 * @param {number}      [params.page=1]            - Página actual
 * @param {number}      [params.limit=10]           - Registros por página (máx. 100)
 * @param {string}      [params.nombre='']          - Filtro parcial sobre el nombre (ILIKE)
 * @param {number|null} [params.id_curso_estado]    - Filtro exacto por estado (1-3)
 * @returns {Promise<{ data: object[], pagination: object }>}
 */
export async function getCursos({ page = 1, limit = 10, nombre = '', id_curso_estado = null }) {
    // Asegurar tipos correctos: los query params llegan como string desde Express
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // tope de 100 por petición

    const { rows, total } = await cursosRepo.findAll({
        page:            pageNum,
        limit:           limitNum,
        nombre:          nombre.trim(),
        id_curso_estado: id_curso_estado ? parseInt(id_curso_estado) : null,
    });

    const totalPages = Math.ceil(total / limitNum);

    return {
        data: rows.map(toCursoDTO),
        pagination: {
            total,
            page:      pageNum,
            limit:     limitNum,
            totalPages,
            hasNext:   pageNum < totalPages,
            hasPrev:   pageNum > 1,
        },
    };
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — Obtener un curso por ID
// ─────────────────────────────────────────────────────────────
/**
 * Busca un curso por su ID.
 * Lanza 404 si no existe o fue eliminado (soft delete).
 *
 * @param {number|string} id - ID del curso
 * @returns {Promise<object>} DTO del curso
 * @throws {Error} 404 si el curso no existe o fue dado de baja
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
 * @param {number} userId - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<object>} DTO del curso creado
 * @throws {Error} 400 si alguna regla de negocio no se cumple
 */
export async function createCurso(data, userId) {
    // Regla 1: la fecha de inicio no puede ser en el pasado
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
 *   1. El curso debe existir (lanza 404 si no se encuentra).
 *   2. Si se cambia la fecha de inicio, la nueva fecha no puede ser en el pasado.
 *      Solo se valida si la fecha enviada difiere de la almacenada en BD.
 *
 * @param {number|string} id     - ID del curso a actualizar
 * @param {object}        data   - Campos a actualizar (validados por express-validator)
 * @param {number}        userId - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<object>} DTO del curso actualizado
 * @throws {Error} 404 si el curso no existe
 * @throws {Error} 400 si la nueva fecha de inicio es en el pasado
 */
export async function updateCurso(id, data, userId) {
    const existente = await cursosRepo.findById(parseInt(id));

    if (!existente) {
        throw crearError(`No se encontró el curso con ID ${id}.`, 404);
    }

    // Solo validar la fecha si se está enviando una nueva y es distinta a la almacenada.
    // Esto evita rechazar updates de otros campos cuando la fecha ya existente es pasada.
    if (data.fecha_inicio) {
        // fecha_inicio puede llegar como Date object o string ISO desde Postgres
        const fechaExistenteISO = new Date(existente.fecha_inicio).toISOString().split('T')[0];
        const fechaNuevaISO     = data.fecha_inicio; // viene en YYYY-MM-DD desde el input

        const estaCambiandoFecha = fechaNuevaISO !== fechaExistenteISO;

        if (estaCambiandoFecha) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            // Construir la fecha nueva como local (evita desfase de zona horaria con UTC)
            const [y, m, d]   = fechaNuevaISO.split('-').map(Number);
            const fechaNuevaObj = new Date(y, m - 1, d);

            if (fechaNuevaObj < hoy) {
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
 * Marca el curso como inactivo (soft delete). No elimina el registro de la BD.
 * Además da de baja en cascada todas las inscripciones activas del curso.
 *
 * Reglas de negocio aplicadas:
 *   1. El curso debe existir (lanza 404 si no se encuentra).
 *   2. Las inscripciones activas del curso se dan de baja automáticamente.
 *
 * @param {number|string} id     - ID del curso a eliminar
 * @param {number}        userId - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<void>}
 * @throws {Error} 404 si el curso no existe
 */
export async function deleteCurso(id, userId) {
    const existente = await cursosRepo.findById(parseInt(id));

    if (!existente) {
        throw crearError(`No se encontró el curso con ID ${id}.`, 404);
    }

    await cursosRepo.softDelete(parseInt(id), userId);

    // Dar de baja en cascada todas las inscripciones activas del curso
    await inscripcionesRepo.deleteByCursoId(parseInt(id), userId);
}

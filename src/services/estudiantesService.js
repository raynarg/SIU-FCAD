// ============================================================
//  src/services/estudiantesService.js
//  Capa de Servicio — Lógica de negocio del módulo Estudiantes
//
//  Responsabilidades:
//    · Ejecutar las reglas de negocio antes/después de ir a la BD
//    · Llamar al repository para persistir/recuperar datos
//    · Transformar la respuesta mediante DTOs antes de retornar al controller
//    · Lanzar errores con statusCode para que el errorHandler los capture
//
//  Funciones exportadas:
//    · getEstudiantes     — lista paginada con filtros
//    · getEstudianteById  — un estudiante por ID
//    · createEstudiante   — crea verificando unicidad de documento
//    · updateEstudiante   — actualiza datos del estudiante
//    · deleteEstudiante   — soft delete + baja en cascada de inscripciones
//
//  NO hace:
//    · Conocer req/res (delegado al controller)
//    · Ejecutar SQL directamente (delegado a estudiantesRepository e inscripcionesRepository)
// ============================================================

import * as estRepo          from '../repositories/estudiantesRepository.js';
import * as inscripcionesRepo from '../repositories/inscripcionesRepository.js';
import { toEstudianteDTO }   from '../dtos/estudiantesDto.js';

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
//  B R O W S E  — Listar estudiantes con paginación y filtros
// ─────────────────────────────────────────────────────────────
/**
 * Devuelve una página de estudiantes junto con metadatos de paginación.
 * Todos los filtros son opcionales y se combinan con AND en el repository.
 *
 * @param {object}      params
 * @param {number}      [params.page=1]       - Página actual
 * @param {number}      [params.limit=10]     - Registros por página (máx. 100)
 * @param {string}      [params.documento=''] - Filtro parcial por número de documento
 * @param {string}      [params.nombre='']    - Filtro parcial por nombre o apellido
 * @param {string}      [params.email='']     - Filtro parcial por email
 * @param {number|null} [params.activo]       - Filtro por estado: 1=activo, 0=inactivo, null=todos
 * @returns {Promise<{ data: object[], pagination: object }>}
 */
export async function getEstudiantes({
    page      = 1,
    limit     = 10,
    documento = '',
    nombre    = '',
    email     = '',
    activo    = null,
}) {
    // Asegurar tipos correctos: los query params llegan como string desde Express
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const { rows, total } = await estRepo.findAll({
        page:      pageNum,
        limit:     limitNum,
        documento: documento.trim(),
        nombre:    nombre.trim(),
        email:     email.trim(),
        // Convertir a número solo si viene un valor real; null devuelve todos los estados
        activo: activo !== null && activo !== '' ? parseInt(activo) : null,
    });

    const totalPages = Math.ceil(total / limitNum);

    return {
        data: rows.map(toEstudianteDTO),
        pagination: {
            total,
            page:      pageNum,
            limit:     limitNum,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
        },
    };
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — Obtener un estudiante por ID
// ─────────────────────────────────────────────────────────────
/**
 * Busca un estudiante por su ID.
 * Lanza 404 si no existe o fue dado de baja (soft delete).
 *
 * @param {number|string} id - ID del estudiante
 * @returns {Promise<object>} DTO del estudiante
 * @throws {Error} 404 si el estudiante no existe o fue dado de baja
 */
export async function getEstudianteById(id) {
    const est = await estRepo.findById(parseInt(id));
    if (!est) {
        throw crearError(`No se encontró el estudiante con ID ${id}.`, 404);
    }
    return toEstudianteDTO(est);
}

// ─────────────────────────────────────────────────────────────
//  A D D  — Crear un nuevo estudiante
// ─────────────────────────────────────────────────────────────
/**
 * Valida unicidad de documento y persiste un nuevo estudiante.
 *
 * Reglas de negocio aplicadas:
 *   1. El número de documento debe ser único en el sistema.
 *
 * @param {object} data   - Datos validados por el middleware (express-validator)
 * @param {number} userId - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<object>} DTO del estudiante creado
 * @throws {Error} 400 si ya existe un estudiante con el mismo documento
 */
export async function createEstudiante(data, userId) {
    // Regla 1: el documento debe ser único — buscar si ya hay un estudiante con ese documento
    const { rows } = await estRepo.findAll({ documento: data.documento, limit: 1 });
    if (rows.length > 0) {
        throw crearError(`Ya existe un estudiante con el documento ${data.documento}.`, 400);
    }

    const nuevo = await estRepo.create({
        ...data,
        id_usuario_modificacion: userId,
    });
    return toEstudianteDTO(nuevo);
}

// ─────────────────────────────────────────────────────────────
//  E D I T  — Actualizar un estudiante existente
// ─────────────────────────────────────────────────────────────
/**
 * Verifica que el estudiante exista y aplica las actualizaciones.
 *
 * @param {number|string} id     - ID del estudiante a actualizar
 * @param {object}        data   - Campos a actualizar (validados por express-validator)
 * @param {number}        userId - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<object>} DTO del estudiante actualizado
 * @throws {Error} 404 si el estudiante no existe
 */
export async function updateEstudiante(id, data, userId) {
    const existente = await estRepo.findById(parseInt(id));
    if (!existente) {
        throw crearError(`No se encontró el estudiante con ID ${id}.`, 404);
    }

    const actualizado = await estRepo.update(parseInt(id), {
        ...data,
        id_usuario_modificacion: userId,
    });
    return toEstudianteDTO(actualizado);
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — Soft delete de un estudiante
// ─────────────────────────────────────────────────────────────
/**
 * Da de baja al estudiante (soft delete). No elimina el registro de la BD.
 * Además da de baja en cascada todas sus inscripciones activas.
 *
 * Reglas de negocio aplicadas:
 *   1. El estudiante debe existir (lanza 404 si no se encuentra).
 *   2. Las inscripciones activas del estudiante se dan de baja automáticamente.
 *
 * @param {number|string} id     - ID del estudiante a dar de baja
 * @param {number}        userId - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<void>}
 * @throws {Error} 404 si el estudiante no existe
 */
export async function deleteEstudiante(id, userId) {
    const existente = await estRepo.findById(parseInt(id));
    if (!existente) {
        throw crearError(`No se encontró el estudiante con ID ${id}.`, 404);
    }

    // Dar de baja al estudiante
    await estRepo.softDelete(parseInt(id), userId);

    // Dar de baja en cascada todas sus inscripciones activas
    await inscripcionesRepo.deleteByEstudianteId(parseInt(id), userId);
}

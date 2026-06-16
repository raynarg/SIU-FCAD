// ============================================================
//  src/services/inscripcionesService.js
//  Capa de Servicio — Lógica de negocio del módulo Inscripciones
//
//  Responsabilidades:
//    · Ejecutar las validaciones de negocio antes de persistir una inscripción
//    · Coordinar consultas a tres repositories (inscripciones, cursos, estudiantes)
//    · Transformar la respuesta mediante DTOs antes de retornar al controller
//    · Disparar el envío de email de confirmación de forma no bloqueante
//    · Lanzar errores con statusCode para que el errorHandler los capture
//
//  Funciones exportadas:
//    · getInscripciones    — lista paginada con filtros de texto y curso
//    · getInscripcionById  — una inscripción por ID
//    · createInscripcion   — crea con 4 validaciones de negocio encadenadas
//    · deleteInscripcion   — da de baja una inscripción por ID
//
//  NO hace:
//    · Conocer req/res (delegado al controller)
//    · Ejecutar SQL directamente (delegado a los repositories)
//    · Bloquear el pipeline esperando el envío del email (fire-and-forget)
// ============================================================

import * as inscripcionesRepo from '../repositories/inscripcionesRepository.js';
import * as cursosRepo        from '../repositories/cursosRepository.js';
import * as estudiantesRepo   from '../repositories/estudiantesRepository.js';
import { toInscripcionDTO }   from '../dtos/inscripcionesDTO.js';
import { sendConfirmacionInscripcion } from './emailService.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — Listar inscripciones con paginación y filtros
// ─────────────────────────────────────────────────────────────
/**
 * Devuelve una página de inscripciones junto con metadatos de paginación.
 *
 * @param {object}      params
 * @param {number}      [params.page=1]    - Página actual
 * @param {number}      [params.limit=10]  - Registros por página (máx. 100)
 * @param {string}      [params.search=''] - Filtro de texto libre (nombre/apellido del estudiante)
 * @param {string|null} [params.curso]     - Filtro por nombre o ID de curso
 * @returns {Promise<{ data: object[], pagination: object }>}
 */
export async function getInscripciones({ page = 1, limit = 10, search = '', curso = null }) {
    // Asegurar tipos y rangos correctos: los query params llegan como string desde Express
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const pageNum  = Math.max(parseInt(page) || 1, 1);

    const { rows, total } = await inscripcionesRepo.findAll({
        page:   pageNum,
        limit:  limitNum,
        search,
        curso,
    });

    return {
        data: rows.map(toInscripcionDTO),
        pagination: {
            page:       pageNum,
            limit:      limitNum,
            total,
            // Si no hay resultados, totalPages devuelve 1 (nunca 0) para mantener consistencia en el cliente
            totalPages: Math.ceil(total / limitNum) || 1,
        },
    };
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — Obtener una inscripción por ID
// ─────────────────────────────────────────────────────────────
/**
 * Busca una inscripción por su ID.
 * Lanza 404 si no existe o fue dada de baja.
 *
 * @param {number|string} id - ID de la inscripción
 * @returns {Promise<object>} DTO de la inscripción
 * @throws {Error} 404 si la inscripción no existe
 */
export async function getInscripcionById(id) {
    const row = await inscripcionesRepo.findById(id);
    if (!row) {
        const err = new Error('Inscripción no encontrada');
        err.statusCode = 404;
        throw err;
    }
    return toInscripcionDTO(row);
}

// ─────────────────────────────────────────────────────────────
//  A D D  — Crear una nueva inscripción
// ─────────────────────────────────────────────────────────────
/**
 * Ejecuta 4 validaciones de negocio encadenadas antes de persistir la inscripción.
 * Si todas pasan, crea la inscripción y dispara el email de confirmación.
 *
 * Reglas de negocio aplicadas (en orden):
 *   1. El estudiante debe existir y estar activo.
 *   2. El curso debe existir y tener estado "Inscripción Abierta" (id_curso_estado = 2).
 *   3. El estudiante no debe estar ya inscripto en el mismo curso (no duplicados).
 *   4. El curso debe tener cupo disponible (inscriptos actuales < inscriptos_max).
 *
 * @param {object} data                      - Datos validados por el middleware (express-validator)
 * @param {number} data.id_estudiante        - ID del estudiante a inscribir
 * @param {number} data.id_curso             - ID del curso en el que se inscribe
 * @param {string} [data.fecha_inscripcion]  - Fecha de inscripción en ISO8601; si se omite se usa la fecha actual
 * @param {number} userId                    - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<object>} DTO completo de la inscripción creada (con datos de estudiante y curso via JOIN)
 * @throws {Error} 404 si el estudiante o el curso no existen
 * @throws {Error} 400 si el curso no está abierto, hay inscripción duplicada o no hay cupo
 */
export async function createInscripcion(data, userId) {
    const { id_estudiante, id_curso, fecha_inscripcion } = data;

    // 1. Validar que el estudiante exista y esté activo
    const estudiante = await estudiantesRepo.findById(id_estudiante);
    if (!estudiante) {
        const err = new Error('Estudiante no encontrado o inactivo');
        err.statusCode = 404;
        throw err;
    }

    // 2. Validar que el curso exista y esté habilitado para inscripciones
    const curso = await cursosRepo.findById(id_curso);
    if (!curso) {
        const err = new Error('Curso no encontrado');
        err.statusCode = 404;
        throw err;
    }

    // id_curso_estado === 2 corresponde al estado "Inscripción Abierta" en la tabla curso_estado
    if (curso.id_curso_estado !== 2) {
        const err = new Error('El curso no está habilitado para inscripciones');
        err.statusCode = 400;
        throw err;
    }

    // 3. Validar inscripciones duplicadas: el mismo estudiante no puede estar dos veces en el mismo curso
    const duplicada = await inscripcionesRepo.findByEstudianteAndCurso(id_estudiante, id_curso);
    if (duplicada) {
        const err = new Error('El estudiante ya se encuentra inscripto en este curso');
        err.statusCode = 400;
        throw err;
    }

    // 4. Validar cupo disponible: contar inscriptos actuales y comparar con el máximo del curso
    const inscriptosActuales = await inscripcionesRepo.countByCurso(id_curso);
    if (inscriptosActuales >= curso.inscriptos_max) {
        const err = new Error('Se ha superado el cupo máximo de inscriptos para este curso');
        err.statusCode = 400;
        throw err;
    }

    // Crear la inscripción; si no se proveyó fecha, se usa la fecha/hora actual
    const inscripcion = await inscripcionesRepo.create({
        id_estudiante,
        id_curso,
        fecha_inscripcion:       fecha_inscripcion || new Date().toISOString(),
        id_usuario_modificacion: userId,
    });

    // Consultar la inscripción completa con JOINs para construir el DTO con
    // datos de estudiante y curso, no solo los IDs recién insertados
    const rowComplete = await inscripcionesRepo.findById(inscripcion.id_inscripcion);
    const dto         = toInscripcionDTO(rowComplete);

    // Enviar email de confirmación de forma no bloqueante (fire-and-forget):
    // un error en el envío no debe interrumpir ni revertir la inscripción ya creada
    sendConfirmacionInscripcion(dto).catch(err =>
        console.warn('Email de confirmación no enviado:', err.message)
    );

    return dto;
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — Dar de baja una inscripción
// ─────────────────────────────────────────────────────────────
/**
 * Da de baja una inscripción por su ID.
 * Lanza 404 si la inscripción no existe o ya fue dada de baja.
 *
 * @param {number|string} id     - ID de la inscripción a dar de baja
 * @param {number}        userId - ID del usuario autenticado (inyectado por authMiddleware)
 * @returns {Promise<true>}
 * @throws {Error} 404 si la inscripción no existe
 */
export async function deleteInscripcion(id, userId) {
    const row = await inscripcionesRepo.findById(id);
    if (!row) {
        const err = new Error('Inscripción no encontrada');
        err.statusCode = 404;
        throw err;
    }

    await inscripcionesRepo.deleteById(id, userId);
    return true;
}

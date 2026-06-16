// ============================================================
//  src/repositories/inscripcionesRepository.js
//  Capa de Acceso a Datos — Queries SQL del módulo Inscripciones
//
//  Responsabilidades:
//    · Ejecutar las queries SQL contra la base de datos PostgreSQL
//    · Aplicar JOINs con estudiantes, cursos e inscripciones_estados
//    · Aplicar filtros, paginación (LIMIT/OFFSET) y ordenamiento
//    · Retornar filas crudas del modelo DB (sin transformar a DTO)
//
//  Funciones exportadas:
//    · findAll                — lista paginada con JOINs y filtros
//    · findById               — una inscripción por ID con JOINs (solo activas)
//    · findByEstudianteAndCurso — verifica si existe inscripción duplicada activa
//    · countByCurso           — cuenta inscripciones activas de un curso (validación de cupo)
//    · create                 — inserta con estado 1 (Activa) por defecto
//    · deleteById             — soft delete de una inscripción (estado → 2)
//    · deleteByEstudianteId   — baja en cascada al dar de baja un estudiante
//    · deleteByCursoId        — baja en cascada al eliminar un curso
//
//  NO hace:
//    · Aplicar reglas de negocio (delegado a inscripcionesService)
//    · Transformar datos a DTO (delegado a inscripcionesDTO)
//    · Verificar cupo ni duplicados a nivel de negocio (delegado al service)
// ============================================================

import { pool } from '../config/db.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — Listar inscripciones con filtros y paginación
// ─────────────────────────────────────────────────────────────
/**
 * Obtiene una página de inscripciones activas con datos desnormalizados
 * de estudiante y curso via JOIN. Ejecuta dos queries: datos + COUNT total.
 *
 * @param {object}      params
 * @param {number}      [params.page=1]    - Página actual (base 1)
 * @param {number}      [params.limit=10]  - Registros por página
 * @param {string}      [params.search=''] - Filtro de texto libre: busca en nombres,
 *   apellido, documento del estudiante Y nombre del curso (todos con ILIKE)
 * @param {number|null} [params.curso]     - Filtro exacto por ID de curso
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAll({ page = 1, limit = 10, search = '', curso = null }) {
    const offset = (page - 1) * limit;
    const params = [];

    // Filtrar solo inscripciones activas via JOIN con inscripciones_estados (es_activo = 1)
    let where = 'WHERE ie.es_activo = 1';

    if (search) {
        // Un solo parámetro reutilizado en 4 campos: nombres, apellido, documento y nombre de curso
        params.push(`%${search}%`);
        where += ` AND (
            e.nombres   ILIKE $${params.length} OR
            e.apellido  ILIKE $${params.length} OR
            e.documento ILIKE $${params.length} OR
            c.nombre    ILIKE $${params.length}
        )`;
    }

    if (curso) {
        params.push(curso);
        where += ` AND i.id_curso = $${params.length}`;
    }

    // Columnas seleccionadas: datos propios de la inscripción + campos desnormalizados
    // de estudiante y curso para evitar un segundo round-trip al construir el DTO
    const query = `
        SELECT
            i.id_inscripcion,
            i.id_estudiante,
            i.id_curso,
            i.fecha_hora_inscripcion,
            e.apellido   AS estudiante_apellido,
            e.nombres    AS estudiante_nombres,
            e.documento  AS estudiante_documento,
            e.email      AS estudiante_email,
            c.nombre     AS curso_nombre,
            c.cantidad_horas AS curso_horas,
            c.fecha_inicio   AS curso_fecha_inicio
        FROM inscripciones i
        JOIN estudiantes e         ON i.id_estudiante        = e.id_estudiante
        JOIN cursos c              ON i.id_curso             = c.id_curso
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        ${where}
        ORDER BY i.id_inscripcion DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Query de conteo: mismos JOINs y WHERE para el total real sin LIMIT
    const countQuery = `
        SELECT COUNT(*)
        FROM inscripciones i
        JOIN estudiantes e         ON i.id_estudiante        = e.id_estudiante
        JOIN cursos c              ON i.id_curso             = c.id_curso
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        ${where}
    `;

    const data  = await pool.query(query, [...params, limit, offset]);
    const count = await pool.query(countQuery, params);

    return {
        rows:  data.rows,
        total: parseInt(count.rows[0].count),
    };
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — Obtener una inscripción por ID (con JOINs)
// ─────────────────────────────────────────────────────────────
/**
 * Busca una inscripción activa por su ID con datos desnormalizados
 * de estudiante y curso. Retorna undefined si no existe o fue dada de baja.
 *
 * Se usa también para obtener el DTO completo tras un create(),
 * ya que el INSERT retorna solo los IDs sin los datos relacionados.
 *
 * @param {number|string} id - ID primario de la inscripción
 * @returns {Promise<object|undefined>} Fila con datos de inscripción, estudiante y curso; o undefined
 */
export async function findById(id) {
    const query = `
        SELECT
            i.id_inscripcion,
            i.id_estudiante,
            i.id_curso,
            i.fecha_hora_inscripcion,
            e.apellido   AS estudiante_apellido,
            e.nombres    AS estudiante_nombres,
            e.documento  AS estudiante_documento,
            e.email      AS estudiante_email,
            c.nombre     AS curso_nombre,
            c.cantidad_horas AS curso_horas,
            c.fecha_inicio   AS curso_fecha_inicio
        FROM inscripciones i
        JOIN estudiantes e         ON i.id_estudiante        = e.id_estudiante
        JOIN cursos c              ON i.id_curso             = c.id_curso
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        WHERE i.id_inscripcion = $1
          AND ie.es_activo = 1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  Verificar inscripción duplicada
// ─────────────────────────────────────────────────────────────
/**
 * Busca una inscripción activa para la combinación (estudiante, curso).
 * Usada por el service para detectar inscripciones duplicadas antes de crear una nueva.
 * Solo considera inscripciones activas (es_activo = 1); las dadas de baja no cuentan.
 *
 * @param {number} id_estudiante - ID del estudiante
 * @param {number} id_curso      - ID del curso
 * @returns {Promise<object|undefined>} La inscripción activa si existe, o undefined
 */
export async function findByEstudianteAndCurso(id_estudiante, id_curso) {
    const query = `
        SELECT i.*
        FROM inscripciones i
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        WHERE i.id_estudiante = $1
          AND i.id_curso      = $2
          AND ie.es_activo    = 1
    `;
    const { rows } = await pool.query(query, [id_estudiante, id_curso]);
    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  Contar inscripciones activas por curso (validación de cupo)
// ─────────────────────────────────────────────────────────────
/**
 * Cuenta cuántas inscripciones activas tiene un curso.
 * El service compara este valor con `inscriptos_max` para validar el cupo disponible.
 *
 * @param {number} id_curso - ID del curso a evaluar
 * @returns {Promise<number>} Cantidad de inscripciones activas en el curso
 */
export async function countByCurso(id_curso) {
    const query = `
        SELECT COUNT(*)
        FROM inscripciones i
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        WHERE i.id_curso   = $1
          AND ie.es_activo = 1
    `;
    const { rows } = await pool.query(query, [id_curso]);
    return parseInt(rows[0].count);
}

// ─────────────────────────────────────────────────────────────
//  A D D  — Insertar una nueva inscripción
// ─────────────────────────────────────────────────────────────
/**
 * Inserta una nueva inscripción en estado Activa (id_inscripcion_estado = 1).
 * Retorna solo los campos de la tabla inscripciones (sin JOINs); el service
 * hace un findById posterior para obtener el DTO completo con datos relacionados.
 *
 * @param {object} params
 * @param {number} params.id_estudiante           - ID del estudiante (FK)
 * @param {number} params.id_curso                - ID del curso (FK)
 * @param {string} params.fecha_inscripcion       - Fecha/hora de inscripción (ISO8601)
 * @param {number} params.id_usuario_modificacion - ID del usuario que realiza la operación
 * @returns {Promise<object>} Fila de la inscripción recién insertada (RETURNING *)
 */
export async function create({ id_estudiante, id_curso, fecha_inscripcion, id_usuario_modificacion }) {
    const { rows } = await pool.query(
        // id_inscripcion_estado = 1 hardcodeado: toda nueva inscripción comienza Activa
        `INSERT INTO inscripciones
         (id_estudiante, id_curso, fecha_hora_inscripcion, id_inscripcion_estado, id_usuario_modificacion, fecha_hora_modificacion)
         VALUES ($1, $2, $3, 1, $4, NOW())
         RETURNING *`,
        [id_estudiante, id_curso, fecha_inscripcion, id_usuario_modificacion]
    );
    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — Soft delete de una inscripción por ID
// ─────────────────────────────────────────────────────────────
/**
 * Da de baja una inscripción cambiando su estado a 2 (Inactiva/Baja).
 * No borra el registro — es un soft delete para conservar el historial.
 *
 * @param {number|string} id     - ID de la inscripción a dar de baja
 * @param {number}        userId - ID del usuario que realiza la baja
 * @returns {Promise<boolean>} true si se actualizó al menos una fila, false si no existía
 */
export async function deleteById(id, userId) {
    // Cambio de estado 1 → 2; ie.es_activo pasará a 0 automáticamente por la FK
    const { rowCount } = await pool.query(
        `UPDATE inscripciones
         SET id_inscripcion_estado   = 2,
             id_usuario_modificacion = $2,
             fecha_hora_modificacion = NOW()
         WHERE id_inscripcion = $1`,
        [id, userId]
    );
    return rowCount > 0;
}

// ─────────────────────────────────────────────────────────────
//  Baja en cascada — por estudiante (soft delete de estudiante)
// ─────────────────────────────────────────────────────────────
/**
 * Da de baja todas las inscripciones activas (estado = 1) de un estudiante.
 * Es invocado por estudiantesService al dar de baja un estudiante, para
 * mantener consistencia: un estudiante inactivo no debe tener inscripciones activas.
 *
 * @param {number} id_estudiante - ID del estudiante cuyas inscripciones se dan de baja
 * @param {number} userId        - ID del usuario que realiza la operación
 * @returns {Promise<number>} Cantidad de inscripciones afectadas
 */
export async function deleteByEstudianteId(id_estudiante, userId) {
    const { rowCount } = await pool.query(
        `UPDATE inscripciones
         SET id_inscripcion_estado   = 2,
             id_usuario_modificacion = $2,
             fecha_hora_modificacion = NOW()
         WHERE id_estudiante        = $1
           AND id_inscripcion_estado = 1`,
        [id_estudiante, userId]
    );
    return rowCount;
}

// ─────────────────────────────────────────────────────────────
//  Baja en cascada — por curso (soft delete de curso)
// ─────────────────────────────────────────────────────────────
/**
 * Da de baja todas las inscripciones activas (estado = 1) de un curso.
 * Es invocado por cursosService al eliminar un curso, para mantener
 * consistencia: un curso eliminado no debe tener inscripciones activas.
 *
 * @param {number} id_curso - ID del curso cuyas inscripciones se dan de baja
 * @param {number} userId   - ID del usuario que realiza la operación
 * @returns {Promise<number>} Cantidad de inscripciones afectadas
 */
export async function deleteByCursoId(id_curso, userId) {
    const { rowCount } = await pool.query(
        `UPDATE inscripciones
         SET id_inscripcion_estado   = 2,
             id_usuario_modificacion = $2,
             fecha_hora_modificacion = NOW()
         WHERE id_curso             = $1
           AND id_inscripcion_estado = 1`,
        [id_curso, userId]
    );
    return rowCount;
}

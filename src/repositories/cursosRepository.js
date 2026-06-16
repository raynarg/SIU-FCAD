// ============================================================
//  src/repositories/cursosRepository.js
//  Capa de Acceso a Datos — Queries SQL del módulo Cursos
//
//  Responsabilidades:
//    · Ejecutar las queries SQL contra la base de datos PostgreSQL
//    · Aplicar filtros, paginación (LIMIT/OFFSET) y ordenamiento
//    · Retornar filas crudas del modelo DB (sin transformar a DTO)
//
//  Funciones exportadas:
//    · findAll     — lista paginada con filtros dinámicos
//    · findById    — un curso por ID (solo activos)
//    · create      — inserta un nuevo registro
//    · update      — actualiza campos editables (guard: estado <> 4)
//    · softDelete  — cambia estado a 4 (Eliminado), no borra el registro
//
//  NO hace:
//    · Aplicar reglas de negocio (delegado a cursosService)
//    · Transformar datos a DTO (delegado a cursosDto)
//    · Validar formato de los parámetros recibidos
// ============================================================

import { pool } from '../config/db.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — Listar cursos con filtros y paginación
// ─────────────────────────────────────────────────────────────
/**
 * Obtiene una página de cursos activos con soporte de filtros opcionales.
 * Ejecuta dos queries: una para los datos paginados y otra para el COUNT total.
 *
 * @param {object}      params
 * @param {number}      params.page              - Página actual (base 1)
 * @param {number}      params.limit             - Registros por página
 * @param {string}      params.nombre            - Filtro parcial por nombre (ILIKE);
 *   si el valor es numérico, busca también por id_curso exacto
 * @param {number|null} params.id_curso_estado   - Filtro exacto por estado del curso
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAll({
    page            = 1,
    limit           = 10,
    nombre          = '',
    id_curso_estado = null,
}) {
    const offset = (page - 1) * limit;
    const params = [];

    // JOIN con cursos_estados para filtrar solo cursos cuyo estado sea activo (es_activo = 1).
    // Esto excluye los cursos en estado "Eliminado" (id = 4) sin una columna booleana extra en cursos.
    let where = `WHERE ce.es_activo = 1`;

    if (nombre) {
        // Si el término es numérico, permite buscar por id_curso exacto O por nombre parcial.
        // Si es texto, solo aplica el filtro ILIKE sobre el nombre.
        const idSearch = parseInt(nombre);
        if (!isNaN(idSearch)) {
            params.push(idSearch);
            params.push(`%${nombre}%`);
            where += ` AND (c.id_curso = $${params.length - 1} OR c.nombre ILIKE $${params.length})`;
        } else {
            params.push(`%${nombre}%`);
            where += ` AND c.nombre ILIKE $${params.length}`;
        }
    }

    if (id_curso_estado) {
        params.push(id_curso_estado);
        where += ` AND c.id_curso_estado = $${params.length}`;
    }

    // Query principal: trae los datos paginados con LIMIT/OFFSET
    const data = await pool.query(
        `SELECT c.*
         FROM cursos c
         JOIN cursos_estados ce ON c.id_curso_estado = ce.id_curso_estado
         ${where}
         ORDER BY c.id_curso ASC
         LIMIT $${params.length + 1}
         OFFSET $${params.length + 2}`,
        [...params, limit, offset]
    );

    // Query de conteo: reutiliza la misma cláusula WHERE para obtener el total real sin LIMIT,
    // necesario para calcular el número de páginas en el service
    const count = await pool.query(
        `SELECT COUNT(*)
         FROM cursos c
         JOIN cursos_estados ce ON c.id_curso_estado = ce.id_curso_estado
         ${where}`,
        params
    );

    return {
        rows:  data.rows,
        total: parseInt(count.rows[0].count),
    };
}

// ─────────────────────────────────────────────────────────────
//  R E A D  — Obtener un curso por ID
// ─────────────────────────────────────────────────────────────
/**
 * Busca un curso por su ID primario.
 * El JOIN con cursos_estados garantiza que solo se retornen cursos activos
 * (es_activo = 1); los cursos en estado "Eliminado" devuelven undefined.
 *
 * @param {number} id - ID primario del curso (id_curso)
 * @returns {Promise<object|undefined>} Fila cruda del curso, o undefined si no existe o está eliminado
 */
export async function findById(id) {
    const { rows } = await pool.query(
        `SELECT c.*
         FROM cursos c
         JOIN cursos_estados ce ON c.id_curso_estado = ce.id_curso_estado
         WHERE c.id_curso = $1
           AND ce.es_activo = 1`,
        [id]
    );

    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  A D D  — Insertar un nuevo curso
// ─────────────────────────────────────────────────────────────
/**
 * Inserta un nuevo registro en la tabla `cursos` y retorna la fila creada.
 * `fecha_hora_modificacion` se establece automáticamente con NOW() en la BD.
 *
 * @param {object} params
 * @param {string} params.nombre                  - Nombre del curso
 * @param {string} params.descripcion             - Descripción
 * @param {string} params.fecha_inicio            - Fecha de inicio (ISO date YYYY-MM-DD)
 * @param {number} params.cantidad_horas          - Duración en horas
 * @param {number} params.inscriptos_max          - Cupo máximo de inscriptos
 * @param {number} params.id_curso_estado         - Estado inicial del curso (FK a cursos_estados)
 * @param {number} params.id_usuario_modificacion - ID del usuario que crea el registro
 * @returns {Promise<object>} Fila completa del curso recién insertado (RETURNING *)
 */
export async function create({
    nombre,
    descripcion,
    fecha_inicio,
    cantidad_horas,
    inscriptos_max,
    id_curso_estado,
    id_usuario_modificacion,
}) {
    const { rows } = await pool.query(
        `INSERT INTO cursos
         (
             nombre,
             descripcion,
             fecha_inicio,
             cantidad_horas,
             inscriptos_max,
             id_curso_estado,
             id_usuario_modificacion,
             fecha_hora_modificacion
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
            nombre,
            descripcion,
            fecha_inicio,
            cantidad_horas,
            inscriptos_max,
            id_curso_estado,
            id_usuario_modificacion,
        ]
    );

    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  E D I T  — Actualizar un curso existente
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza todos los campos editables de un curso.
 * La condición `id_curso_estado <> 4` impide modificar cursos en estado
 * "Eliminado" (soft delete); si el curso ya fue eliminado, rows[0] es undefined.
 *
 * @param {number} id                               - ID del curso a actualizar
 * @param {object} params
 * @param {string} params.nombre                    - Nuevo nombre
 * @param {string} params.descripcion               - Nueva descripción
 * @param {string} params.fecha_inicio              - Nueva fecha de inicio (ISO date)
 * @param {number} params.cantidad_horas            - Nueva duración en horas
 * @param {number} params.inscriptos_max            - Nuevo cupo máximo
 * @param {number} params.id_curso_estado           - Nuevo estado (FK a cursos_estados)
 * @param {number} params.id_usuario_modificacion   - ID del usuario que realiza el cambio
 * @returns {Promise<object>} Fila completa del curso actualizado (RETURNING *)
 */
export async function update(
    id,
    {
        nombre,
        descripcion,
        fecha_inicio,
        cantidad_horas,
        inscriptos_max,
        id_curso_estado,
        id_usuario_modificacion,
    }
) {
    const { rows } = await pool.query(
        `UPDATE cursos
         SET
             nombre                  = $1,
             descripcion             = $2,
             fecha_inicio            = $3,
             cantidad_horas          = $4,
             inscriptos_max          = $5,
             id_curso_estado         = $6,
             id_usuario_modificacion = $7,
             fecha_hora_modificacion = NOW()
         WHERE id_curso = $8
           AND id_curso_estado <> 4
         RETURNING *`,
        [
            nombre,
            descripcion,
            fecha_inicio,
            cantidad_horas,
            inscriptos_max,
            id_curso_estado,
            id_usuario_modificacion,
            id,
        ]
    );

    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — Soft delete de un curso
// ─────────────────────────────────────────────────────────────
/**
 * Marca un curso como eliminado cambiando su estado a 4 (Eliminado).
 * No borra el registro de la BD — es un soft delete.
 * La condición `id_curso_estado <> 4` evita re-eliminar un curso ya eliminado.
 *
 * @param {number} id     - ID del curso a eliminar
 * @param {number} userId - ID del usuario que realiza la eliminación
 * @returns {Promise<object>} Fila del curso con el estado actualizado (RETURNING *)
 */
export async function softDelete(id, userId) {
    const { rows } = await pool.query(
        `UPDATE cursos
         SET id_curso_estado         = 4,
             id_usuario_modificacion = $2,
             fecha_hora_modificacion = NOW()
         WHERE id_curso = $1
           AND id_curso_estado <> 4
         RETURNING *`,
        [id, userId]
    );
    return rows[0];
}

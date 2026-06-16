// ============================================================
//  src/repositories/estudiantesRepository.js
//  Capa de Acceso a Datos — Queries SQL del módulo Estudiantes
//
//  Responsabilidades:
//    · Ejecutar las queries SQL contra la base de datos PostgreSQL
//    · Aplicar filtros combinados, paginación (LIMIT/OFFSET) y ordenamiento
//    · Retornar filas crudas del modelo DB (sin transformar a DTO)
//
//  Funciones exportadas:
//    · findAll    — lista paginada con filtros dinámicos (documento, nombre, email, activo)
//    · findById   — un estudiante por ID (activos e inactivos)
//    · create     — inserta un nuevo registro con activo = 1 por defecto
//    · update     — actualiza todos los campos editables
//    · softDelete — marca activo = 0, no borra el registro
//
//  NO hace:
//    · Aplicar reglas de negocio (delegado a estudiantesService)
//    · Transformar datos a DTO (delegado a estudiantesDto)
//    · Validar unicidad de documento (delegado a estudiantesService)
// ============================================================

import { pool } from '../config/db.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — Listar estudiantes con filtros y paginación
// ─────────────────────────────────────────────────────────────
/**
 * Obtiene una página de estudiantes con soporte de filtros opcionales combinados.
 * Ejecuta dos queries: una para los datos paginados y otra para el COUNT total.
 *
 * @param {object}      params
 * @param {number}      [params.page=1]       - Página actual (base 1)
 * @param {number}      [params.limit=10]     - Registros por página
 * @param {string}      [params.documento=''] - Filtro por inicio de documento (LIKE 'valor%')
 * @param {string}      [params.nombre='']    - Filtro parcial por nombres O apellido (ILIKE)
 * @param {string}      [params.email='']     - Filtro parcial por email (ILIKE)
 * @param {number|null} [params.activo]       - Filtro por estado: 1=activo, 0=inactivo, null=todos
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAll({
    page      = 1,
    limit     = 10,
    documento = '',
    nombre    = '',
    email     = '',
    activo    = null,
}) {
    const offset = (page - 1) * limit;
    const params = [];

    // WHERE 1=1 como base permite concatenar condiciones AND sin lógica especial
    // para el primer filtro (todos los filtros son opcionales)
    let where = 'WHERE 1=1';

    if (documento) {
        // LIKE 'valor%' busca documentos que comiencen con el texto; no usa ILIKE
        // porque los documentos son numéricos y el orden del índice importa
        params.push(`${documento}%`);
        where += ` AND documento LIKE $${params.length}`;
    }

    if (nombre) {
        // Busca en nombres Y apellido para cubrir búsquedas por nombre completo
        params.push(`%${nombre}%`);
        where += ` AND (nombres ILIKE $${params.length} OR apellido ILIKE $${params.length})`;
    }

    if (email) {
        params.push(`%${email}%`);
        where += ` AND email ILIKE $${params.length}`;
    }

    if (activo !== null) {
        params.push(activo);
        where += ` AND activo = $${params.length}`;
    }

    // Query principal: datos paginados ordenados por ID ascendente
    const query = `
        SELECT * FROM estudiantes
        ${where}
        ORDER BY id_estudiante ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Query de conteo: reutiliza la misma cláusula WHERE para el total real sin LIMIT
    const countQuery = `
        SELECT COUNT(*) FROM estudiantes
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
//  R E A D  — Obtener un estudiante por ID
// ─────────────────────────────────────────────────────────────
/**
 * Busca un estudiante por su ID primario.
 * Retorna tanto activos como inactivos (sin filtro de activo),
 * para que el service pueda decidir cómo manejar cada estado.
 *
 * @param {number} id - ID primario del estudiante (id_estudiante)
 * @returns {Promise<object|undefined>} Fila cruda del estudiante, o undefined si no existe
 */
export async function findById(id) {
    const { rows } = await pool.query(
        'SELECT * FROM estudiantes WHERE id_estudiante = $1',
        [id]
    );
    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  A D D  — Insertar un nuevo estudiante
// ─────────────────────────────────────────────────────────────
/**
 * Inserta un nuevo registro en la tabla `estudiantes` y retorna la fila creada.
 * El campo `activo` se fija en 1 por defecto (todo estudiante nuevo está activo).
 * `fecha_hora_modificacion` se establece con NOW() en la BD.
 *
 * @param {object} params
 * @param {string} params.documento             - Número de documento (DNI/pasaporte)
 * @param {string} params.nombres               - Nombre(s) del estudiante
 * @param {string} params.apellido              - Apellido del estudiante
 * @param {string} params.email                 - Dirección de email
 * @param {string} params.fecha_nacimiento      - Fecha de nacimiento (ISO date YYYY-MM-DD)
 * @param {number} params.id_usuario_modificacion - ID del usuario que crea el registro
 * @returns {Promise<object>} Fila completa del estudiante recién insertado (RETURNING *)
 */
export async function create({
    documento,
    nombres,
    apellido,
    email,
    fecha_nacimiento,
    id_usuario_modificacion,
}) {
    const { rows } = await pool.query(
        // activo = 1 hardcodeado: todo nuevo estudiante comienza en estado activo
        `INSERT INTO estudiantes
         (documento, nombres, apellido, email, fecha_nacimiento, activo, id_usuario_modificacion, fecha_hora_modificacion)
         VALUES ($1, $2, $3, $4, $5, 1, $6, NOW())
         RETURNING *`,
        [documento, nombres, apellido, email, fecha_nacimiento, id_usuario_modificacion]
    );
    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  E D I T  — Actualizar un estudiante existente
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza todos los campos editables de un estudiante.
 * No aplica guarda de estado activo: permite editar incluso estudiantes inactivos
 * (la validación de existencia la hace el service antes de llamar a este método).
 *
 * @param {number} id                               - ID del estudiante a actualizar
 * @param {object} params
 * @param {string} params.documento                 - Nuevo número de documento
 * @param {string} params.nombres                   - Nuevos nombres
 * @param {string} params.apellido                  - Nuevo apellido
 * @param {string} params.email                     - Nuevo email
 * @param {string} params.fecha_nacimiento          - Nueva fecha de nacimiento (ISO date)
 * @param {number} params.activo                    - Estado del estudiante (1=activo, 0=inactivo)
 * @param {number} params.id_usuario_modificacion   - ID del usuario que realiza el cambio
 * @returns {Promise<object>} Fila completa del estudiante actualizado (RETURNING *)
 */
export async function update(id, {
    documento,
    nombres,
    apellido,
    email,
    fecha_nacimiento,
    activo,
    id_usuario_modificacion,
}) {
    const { rows } = await pool.query(
        `UPDATE estudiantes
         SET documento               = $1,
             nombres                 = $2,
             apellido                = $3,
             email                   = $4,
             fecha_nacimiento        = $5,
             activo                  = $6,
             id_usuario_modificacion = $7,
             fecha_hora_modificacion = NOW()
         WHERE id_estudiante = $8
         RETURNING *`,
        [documento, nombres, apellido, email, fecha_nacimiento, activo, id_usuario_modificacion, id]
    );
    return rows[0];
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — Soft delete de un estudiante
// ─────────────────────────────────────────────────────────────
/**
 * Da de baja a un estudiante marcando activo = 0.
 * No borra el registro de la BD — es un soft delete.
 * No aplica guarda de estado porque el service ya verificó existencia.
 *
 * @param {number} id     - ID del estudiante a dar de baja
 * @param {number} userId - ID del usuario que realiza la baja
 * @returns {Promise<object>} Fila del estudiante con activo = 0 (RETURNING *)
 */
export async function softDelete(id, userId) {
    const { rows } = await pool.query(
        `UPDATE estudiantes
         SET activo                  = 0,
             id_usuario_modificacion = $2,
             fecha_hora_modificacion = NOW()
         WHERE id_estudiante = $1
         RETURNING *`,
        [id, userId]
    );
    return rows[0];
}

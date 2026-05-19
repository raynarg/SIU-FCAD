import { pool } from '../config/db.js';

export async function findAll({
    page = 1,
    limit = 10,
    nombre = '',
    id_curso_estado = null
}) {

    const offset = (page - 1) * limit;
    const params = [];

    // Filtramos por estados activos mediante JOIN con cursos_estados
    let where = `WHERE ce.es_activo = 1`;

    if (nombre) {
        // Si el término de búsqueda es numérico, buscamos por ID o por nombre
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

    const count = await pool.query(
        `SELECT COUNT(*)
         FROM cursos c
         JOIN cursos_estados ce ON c.id_curso_estado = ce.id_curso_estado
         ${where}`,
        params
    );

    return {
        rows: data.rows,
        total: parseInt(count.rows[0].count)
    };
}

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

export async function create({
    nombre,
    descripcion,
    fecha_inicio,
    cantidad_horas,
    inscriptos_max,
    id_curso_estado,
    id_usuario_modificacion
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
            id_usuario_modificacion
        ]
    );

    return rows[0];
}

export async function update(
    id,
    {
        nombre,
        descripcion,
        fecha_inicio,
        cantidad_horas,
        inscriptos_max,
        id_curso_estado,
        id_usuario_modificacion
    }
) {

    const { rows } = await pool.query(
        `UPDATE cursos
         SET
            nombre = $1,
            descripcion = $2,
            fecha_inicio = $3,
            cantidad_horas = $4,
            inscriptos_max = $5,
            id_curso_estado = $6,
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
            id
        ]
    );

    return rows[0];
}

export async function softDelete(id, userId) {
    const { rows } = await pool.query(
        `UPDATE cursos
         SET id_curso_estado = 4,
             id_usuario_modificacion = $2,
             fecha_hora_modificacion = NOW()
         WHERE id_curso = $1
         AND id_curso_estado <> 4
         RETURNING *`,
        [id, userId]
    );
    return rows[0];
}
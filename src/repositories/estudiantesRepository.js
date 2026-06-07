import { pool } from '../config/db.js';

export async function findAll({
    page = 1,
    limit = 10,
    documento = '',
    nombre = '',
    email = '',
    activo = null
}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (documento) {
        params.push(`${documento}%`);
        where += ` AND documento LIKE $${params.length}`;
    }

    if (nombre) {
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

    const query = `
        SELECT * FROM estudiantes
        ${where}
        ORDER BY id_estudiante ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
        SELECT COUNT(*) FROM estudiantes
        ${where}
    `;

    const data = await pool.query(query, [...params, limit, offset]);
    const count = await pool.query(countQuery, params);

    return {
        rows: data.rows,
        total: parseInt(count.rows[0].count)
    };
}

export async function findById(id) {
    const { rows } = await pool.query(
        'SELECT * FROM estudiantes WHERE id_estudiante = $1',
        [id]
    );
    return rows[0];
}

export async function create({
    documento,
    nombres,
    apellido,
    email,
    fecha_nacimiento,
    id_usuario_modificacion
}) {
    const { rows } = await pool.query(
        `INSERT INTO estudiantes 
        (documento, nombres, apellido, email, fecha_nacimiento, activo, id_usuario_modificacion, fecha_hora_modificacion)
        VALUES ($1, $2, $3, $4, $5, 1, $6, NOW())
        RETURNING *`,
        [documento, nombres, apellido, email, fecha_nacimiento, id_usuario_modificacion]
    );
    return rows[0];
}

export async function update(id, {
    documento,
    nombres,
    apellido,
    email,
    fecha_nacimiento,
    activo,
    id_usuario_modificacion
}) {
    const { rows } = await pool.query(
        `UPDATE estudiantes
         SET documento = $1,
             nombres = $2,
             apellido = $3,
             email = $4,
             fecha_nacimiento = $5,
             activo = $6,
             id_usuario_modificacion = $7,
             fecha_hora_modificacion = NOW()
         WHERE id_estudiante = $8
         RETURNING *`,
        [documento, nombres, apellido, email, fecha_nacimiento, activo, id_usuario_modificacion, id]
    );
    return rows[0];
}

export async function softDelete(id, userId) {
    const { rows } = await pool.query(
        `UPDATE estudiantes
         SET activo = 0,
             id_usuario_modificacion = $2,
             fecha_hora_modificacion = NOW()
         WHERE id_estudiante = $1
         RETURNING *`,
        [id, userId]
    );
    return rows[0];
}

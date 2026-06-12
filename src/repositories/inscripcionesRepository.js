        const err = new Error('Inscripción no encontrada');
// ============================================================
//  src/repositories/inscripcionesRepository.js
// ============================================================
import { pool } from '../config/db.js';

export async function findAll({ page = 1, limit = 10, search = '', curso = null }) {
    const offset = (page - 1) * limit;
    const params = [];
    
    // Asumimos que id_inscripcion_estado = 1 representa una inscripción activa,
    // o validamos con ie.es_activo = 1.
    let where = 'WHERE ie.es_activo = 1';

    if (search) {
        params.push(`%${search}%`);
        where += ` AND (
            e.nombres ILIKE $${params.length} OR 
            e.apellido ILIKE $${params.length} OR 
            e.documento ILIKE $${params.length} OR 
            c.nombre ILIKE $${params.length}
        )`;
    }

    if (curso) {
        params.push(curso);
        where += ` AND i.id_curso = $${params.length}`;
    }

    const query = `
        SELECT 
            i.id_inscripcion, i.id_estudiante, i.id_curso, i.fecha_hora_inscripcion,
            e.apellido AS estudiante_apellido, e.nombres AS estudiante_nombres, e.documento AS estudiante_documento, e.email AS estudiante_email,
            c.nombre AS curso_nombre, c.cantidad_horas AS curso_horas, c.fecha_inicio AS curso_fecha_inicio
        FROM inscripciones i
        JOIN estudiantes e ON i.id_estudiante = e.id_estudiante
        JOIN cursos c ON i.id_curso = c.id_curso
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        ${where}
        ORDER BY i.id_inscripcion DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
        SELECT COUNT(*) 
        FROM inscripciones i
        JOIN estudiantes e ON i.id_estudiante = e.id_estudiante
        JOIN cursos c ON i.id_curso = c.id_curso
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
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
    const query = `
        SELECT 
            i.id_inscripcion, i.id_estudiante, i.id_curso, i.fecha_hora_inscripcion,
            e.apellido AS estudiante_apellido, e.nombres AS estudiante_nombres, e.documento AS estudiante_documento, e.email AS estudiante_email,
            c.nombre AS curso_nombre, c.cantidad_horas AS curso_horas, c.fecha_inicio AS curso_fecha_inicio
        FROM inscripciones i
        JOIN estudiantes e ON i.id_estudiante = e.id_estudiante
        JOIN cursos c ON i.id_curso = c.id_curso
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        WHERE i.id_inscripcion = $1 AND ie.es_activo = 1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
}

export async function findByEstudianteAndCurso(id_estudiante, id_curso) {
    const query = `
        SELECT i.* 
        FROM inscripciones i
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        WHERE i.id_estudiante = $1 AND i.id_curso = $2 AND ie.es_activo = 1
    `;
    const { rows } = await pool.query(query, [id_estudiante, id_curso]);
    return rows[0];
}

export async function countByCurso(id_curso) {
    const query = `
        SELECT COUNT(*) 
        FROM inscripciones i
        JOIN inscripciones_estados ie ON i.id_inscripcion_estado = ie.id_inscripcion_estado
        WHERE i.id_curso = $1 AND ie.es_activo = 1
    `;
    const { rows } = await pool.query(query, [id_curso]);
    return parseInt(rows[0].count);
}

export async function create({ id_estudiante, id_curso, fecha_inscripcion, id_usuario_modificacion }) {
    // Por defecto, estado = 1 (Activa)
    const { rows } = await pool.query(
        `INSERT INTO inscripciones 
        (id_estudiante, id_curso, fecha_hora_inscripcion, id_inscripcion_estado, id_usuario_modificacion, fecha_hora_modificacion)
        VALUES ($1, $2, $3, 1, $4, NOW())
        RETURNING *`,
        [id_estudiante, id_curso, fecha_inscripcion, id_usuario_modificacion]
    );
    return rows[0];
}

export async function deleteById(id) {
    // Realizamos un borrado físico, o un borrado lógico actualizando el estado.
    // Usaremos borrado físico directo para simplificar el BREAD según lo pedido, 
    // pero actualizamos fecha_hora_modificacion si fuera lógico.
    // Aquí hacemos un DELETE crudo para dar de baja la inscripción completamente.
    const { rowCount } = await pool.query(
        `DELETE FROM inscripciones WHERE id_inscripcion = $1`,
        [id]
    );
    return rowCount > 0;
}

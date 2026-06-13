// ============================================================
//  src/dtos/inscripcionesDTO.js
// ============================================================

export function toInscripcionDTO(row) {
    if (!row) return null;
    return {
        id_inscripcion: row.id_inscripcion,
        id_estudiante: row.id_estudiante,
        id_curso: row.id_curso,
        fecha_inscripcion: row.fecha_hora_inscripcion,
        estudiante: {
            apellido: row.estudiante_apellido,
            nombres: row.estudiante_nombres,
            documento: row.estudiante_documento,
            email: row.estudiante_email
        },
        curso: {
            nombre: row.curso_nombre,
            cantidadHoras: row.curso_horas,
            fechaInicio: row.curso_fecha_inicio
        }
    };
}

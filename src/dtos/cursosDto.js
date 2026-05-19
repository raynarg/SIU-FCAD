export function toCursoDTO(curso) {
    return {
        id: curso.id_curso,
        nombre: curso.nombre,
        descripcion: curso.descripcion,
        fechaInicio: curso.fecha_inicio,
        cantidadHoras: curso.cantidad_horas,
        inscriptosMax: curso.inscriptos_max,
        estado: curso.id_curso_estado,
        ultimaModificacion: curso.fecha_hora_modificacion
    };
}
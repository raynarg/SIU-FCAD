// ============================================================
//  src/dtos/cursosDto.js
//  Data Transfer Object — Transformación de modelo DB a API
//
//  Responsabilidades de esta capa:
//    · Renombrar campos de snake_case (BD) a camelCase (API)
//    · Exponer solo los campos necesarios para el cliente
//    · Ocultar campos internos (ej: id_usuario_modificacion)
// ============================================================

/**
 * Transforma una fila cruda de la tabla `cursos` al formato de respuesta de la API.
 * Convierte snake_case de la BD a camelCase para el cliente.
 *
 * @param {object} curso              - Fila cruda retornada por el repository
 * @returns {object}                  - Objeto listo para serializar en la respuesta HTTP
 */
export function toCursoDTO(curso) {
    return {
        id:                  curso.id_curso,
        nombre:              curso.nombre,
        descripcion:         curso.descripcion,
        fechaInicio:         curso.fecha_inicio,
        cantidadHoras:       curso.cantidad_horas,
        inscriptosMax:       curso.inscriptos_max,
        estado:              curso.id_curso_estado,
        ultimaModificacion:  curso.fecha_hora_modificacion
    };
}

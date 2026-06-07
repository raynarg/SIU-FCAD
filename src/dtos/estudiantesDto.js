export function toEstudianteDTO(est) {
    return {
        id_estudiante: est.id_estudiante,
        documento: est.documento,
        nombres: est.nombres,
        apellido: est.apellido,
        email: est.email,
        fecha_nacimiento: est.fecha_nacimiento,
        activo: est.activo,
        id_usuario_modificacion: est.id_usuario_modificacion,
        fecha_hora_modificacion: est.fecha_hora_modificacion
    };
}

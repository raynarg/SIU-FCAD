document.addEventListener("DOMContentLoaded", async function () {
    let datos = [];

    try{
        const respuesta = await fetch("js/cursos.json");
        datos = await respuesta.json();
        
        const tabla = document.getElementById("tablaCursosBody");

        if (!tabla) {
            return;
        }

        tabla.innerHTML = "";

        datos.forEach(curso => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${curso.id_curso}</td>
                <td>${curso.nombre}</td>
                <td>${curso.inscriptos_max}</td>
                <td>
                    <span class="badge text-bg-dark-subtle text-dark border border-dark-subtle">
                    ${curso.id_curso_estado}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group">
                    <!--Añadir botones que abran los dialog. Importante: esto se hace por el data-bs-target y toggle-->
                        <button
                            class="btn btn-outline-success py-0 px-2"
                            data-bs-toggle="modal"
                            data-bs-target="#modalDiploma"
                            data-id=${curso.id_curso}
                            title="Generar Diploma"
                        >
                            <i class="bi bi-award"></i>
                        </button>
                        <button
                            class="btn btn-outline-primary py-0 px-2"
                            data-bs-toggle="modal"
                            data-bs-target="#modalDetalle"
                            data-id=${curso.id_curso}
                            title="Ver Detalle"
                        >
                            <i class="bi bi-eye"></i>
                        </button>
                        <button
                            class="btn btn-outline-warning py-0 px-2"
                            data-bs-toggle=""
                            data-bs-target=""
                            data-id=${curso.id_curso}
                            title="Editar Curso"
                        >
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button
                            class="btn btn-outline-danger py-0 px-2"
                            data-bs-toggle=""
                            data-bs-target=""
                            data-id=${curso.id_curso}
                            title="Eliminar Curso"
                        >
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tabla.appendChild(fila);
        });
    } catch (error) {
        console.error("error carga de cursos:", error);
    }

    // Detalle del Curso
    const modalDetalleElement = document.getElementById('modalDetalle');
    const buscarCursoID = id => datos.find(curso => curso.id_curso === Number(id));
    
    if (modalDetalleElement) {
        //show.bs.modal es un evento que se dispara cuando alguien llama el modal (dialog).
        modalDetalleElement.addEventListener('show.bs.modal', event => {
            //esto es el elemento que abrio el modal, en este caso fue el boton -> data-bs-target="#modalDetalle"
            const boton = event.relatedTarget;
            //optional chaining -> ?. -> evita que la pagina se rompa por si no hay bootn, cursoId va a contener el valor de atributo data-id de ese boton.
            const cursoId = boton?.dataset?.id;
            const curso = buscarCursoID(cursoId);
            console.log('show detalle', cursoId);

            if (!curso){
                console.warn(`curso: ${cursoId} no encontrado`);
                return;
            }

            document.getElementById('detalleSubtitulo').textContent = curso.nombre;
            document.getElementById('detalleNombre').textContent = curso.nombre;
            document.getElementById('detalleDescripcion').textContent = curso.descripcion;
            document.getElementById('detalleFechaInicio').textContent = new Date(curso.fecha_inicio).toLocaleDateString('es-AR');
            document.getElementById('detalleCantidadHoras').textContent = `${curso.cantidad_horas} horas`;
            document.getElementById('detalleMaxInscriptosTexto').textContent = `${curso.inscriptos_max} lugares`;
            document.getElementById('detalleUltimaModificacion').textContent = `${new Date(curso.fecha_hora_modificacion).toLocaleString('es-AR')} - usuario: ${curso.id_usuario_modificacion}`;

            const estadoTexto = {
                1: 'Inscripción Abierta',
                2: 'Inscripción Cerrada',
                3: 'Borrador'
            }[curso.id_curso_estado] || 'Desconocido';

            document.getElementById('detalleEstado').innerHTML = `
                <span class="badge text-bg-dark-subtle text-dark border border-dark-subtle">
                    ${estadoTexto}
                </span>
            `;
        });
    };
});

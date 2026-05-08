document.addEventListener("DOMContentLoaded", async function () {
    let datos = [];

    const estadoTexto = {
                1: 'Inscripción Abierta',
                2: 'Inscripción Cerrada',
                3: 'Borrador'
            }

    try{
        const respuesta = await fetch(`js/cursos.json?v=${new Date().getTime()}`);
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
                    ${estadoTexto[curso.id_curso_estado] || 'Desconocido'}
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
                            data-bs-toggle="modal"
                            data-bs-target="#modalEditar"
                            data-id=${curso.id_curso}
                            title="Editar Curso"
                        >
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button
                            class="btn btn-outline-danger py-0 px-2"
                            data-bs-toggle="modal"
                            data-bs-target="#modalEliminar"
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
    
    //Crear Curso
    const formCrear = document.getElementById("formCrearCurso");

    formCrear.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const nuevoCurso = {
            nombre: document.getElementById("nuevoNombre").value.trim(),
            descripcion: document.getElementById("nuevaDescripcion").value.trim(),
            fecha_inicio: document.getElementById("nuevaFechaInicio").value,
            cantidad_horas: Number(document.getElementById("nuevasHoras").value),
            inscriptos_max: Number(document.getElementById("nuevoMax").value),
            id_curso_estado: Number(document.getElementById("nuevoEstado").value)
        };

        console.log("Enviando datos...", nuevoCurso);

        try {
            const response = await fetch('/api/cursos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoCurso)
            });

            const resultado = await response.json();
            
            if (response.ok) {
                const modalCrear = bootstrap.Modal.getInstance(document.getElementById('modalCrear'));
                modalCrear.hide();

                const modalExito = new bootstrap.Modal(document.getElementById('modalExito'));
                modalExito.show();

                document.getElementById("btnCerrarExito").onclick = () => {
                    location.reload()
                };
            } else {
                console.error("Error del servidor:", resultado);
                alert("Error al guardar: " + (resultado.error || "Desconocido"));
            }
        } catch (error) {
            console.error("Error en el fetch:", error);
        }
    });

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

            document.getElementById('detalleEstado').innerHTML = `
                <span class="badge text-bg-dark-subtle text-dark border border-dark-subtle">
                    ${estadoTexto[curso.id_curso_estado] || 'Desconocido'}
                </span>
            `;
        });
    }
    const modalEliminar = document.getElementById("modalEliminar");
    let cursoIdAEliminar = null;

    modalEliminar.addEventListener("show.bs.modal", (event) => {
        const boton = event.relatedTarget;
        const id = boton?.dataset?.id;
        const curso = datos.find(c => c.id_curso === Number(id));
        if (!curso) return;
            cursoIdAEliminar = curso.id_curso;
            document.getElementById("nombreCursoAEliminar").textContent = curso.nombre;
        });

    document.getElementById("btnConfirmarEliminar").addEventListener("click", () => {
        if (!cursoIdAEliminar) return;
            datos = datos.filter(c => c.id_curso !== cursoIdAEliminar);
            const filas = document.querySelectorAll("#tablaCursosBody tr");
            filas.forEach(fila => {
                const btn = fila.querySelector(`[data-id="${cursoIdAEliminar}"]`);
                if (btn) fila.remove();
                });

        const instanciaModal = bootstrap.Modal.getInstance(modalEliminar);
        instanciaModal.hide();
        cursoIdAEliminar = null;
    });

    const modalEditar = document.getElementById("modalEditar");
    let cursoEditando = null;
    modalEditar.addEventListener("show.bs.modal", (event) => {
        const boton = event.relatedTarget;
        const id = boton?.dataset?.id;
        const curso = datos.find(c => c.id_curso === Number(id));
        if (!curso) return;
            cursoEditando = curso;
            document.getElementById("editarIdCurso").value = curso.id_curso;
            document.getElementById("editarNombre").value = curso.nombre;
            document.getElementById("editarDescripcion").value = curso.descripcion || "";
            document.getElementById("editarFechaInicio").value = curso.fecha_inicio?.split("T")[0] || "";
            document.getElementById("editarHoras").value = curso.cantidad_horas || "";
            document.getElementById("editarMax").value = curso.inscriptos_max || "";
            document.getElementById("editarEstado").value = curso.id_curso_estado;
    
    });

    document.getElementById("btnGuardarCambios").addEventListener("click", () => {

    if (!cursoEditando) return;

    const nombre = document.getElementById("editarNombre").value.trim();
    const descripcion = document.getElementById("editarDescripcion").value.trim();
    const horas = Number(document.getElementById("editarHoras").value);
    const max = Number(document.getElementById("editarMax").value);


    if (!nombre) {
        mostrarError("El nombre del curso no puede estar vacío.");
        return;
    }

    if (descripcion.length < 5) {
        mostrarError("La descripción debe tener al menos 5 caracteres.");
        return;
    }

    if (isNaN(horas) || horas <= 0) {
        mostrarError("La cantidad de horas debe ser un número mayor a 0.");
        return;
    }

    if (horas > 500) {
        mostrarError("La cantidad de horas es demasiado alta.");
        return;
    }

    if (isNaN(max) || max <= 0) {
        mostrarError("Los inscriptos máximos deben ser mayor a 0.");
        return;
    }

    if (max > 1000) {
        mostrarError("Demasiados inscriptos máximos.");
        return;
    }

    cursoEditando.nombre = nombre;
    cursoEditando.descripcion = descripcion;
    cursoEditando.cantidad_horas = horas;
    cursoEditando.inscriptos_max = max;
    cursoEditando.id_curso_estado = Number(document.getElementById("editarEstado").value);
    cursoEditando.fecha_inicio = document.getElementById("editarFechaInicio").value;

    // actualizar tabla
    const filas = document.querySelectorAll("#tablaCursosBody tr");

    filas.forEach(fila => {
        const btn = fila.querySelector(`[data-id="${cursoEditando.id_curso}"]`);
        if (btn) {
            fila.children[1].textContent = cursoEditando.nombre;
            fila.children[2].textContent = cursoEditando.inscriptos_max;
            fila.children[3].innerHTML = `
                <span class="badge text-bg-dark-subtle text-dark border border-dark-subtle">
                    ${estadoTexto[cursoEditando.id_curso_estado] || 'Desconocido'}
                </span>
            `;
        }
    });

    // cerrar modal editar
    bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();
});

function mostrarError(mensaje) {
    const modal = new bootstrap.Modal(document.getElementById("modalError"));
    const modalEditarEl = document.getElementById("modalEditar");
    const modalEditarInstance = bootstrap.Modal.getInstance(modalEditarEl);
    if (modalEditarInstance) {
        modalEditarInstance.hide();
    }
    document.getElementById("mensajeError").textContent = mensaje;
    modal.show();

    // Botón volver → recarga la página (vuelve al estado inicial)
    document.getElementById("btnCerrarError").onclick = () => {
        location.reload();
    };
}

});

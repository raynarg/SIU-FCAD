document.addEventListener("DOMContentLoaded", async function () {
    let datos = [];
    let datosFiltrados = [];
    let textoFiltro = ''; 
    let estadoFiltro = '';  
    const estadoTexto = {
        1: 'Borrador',
        2: 'Inscripción Abierta',
        3: 'Inscripción Cerrada'
    };

    // 1. Carga Inicial 
    try {
        const respuesta = await fetch('/api/v1/cursos?page=1&limit=10');
        const json = await respuesta.json();
        datos = json.data;
        datosFiltrados = [...datos];
        renderizarTablaDeCursos();
    } catch (error) {
        console.error("Error en carga de cursos:", error);
    }

    // ==========================================
    // LÓGICA DE RENDERIZADO Y FILTRADO
    // ==========================================

    function aplicarFiltros() {
        datosFiltrados = datos.filter(curso => {
            const coincideTexto = !textoFiltro ||
                curso.nombre.toLowerCase().includes(textoFiltro) ||
                curso.id.toString().includes(textoFiltro) ||
                curso.descripcion?.toLowerCase().includes(textoFiltro);

            const coincideEstado = !estadoFiltro ||
                curso.estado === Number(estadoFiltro);

            return coincideTexto && coincideEstado;
        });

        renderizarTablaDeCursos();
    }

    function renderizarTablaDeCursos() {
        const tabla = document.getElementById("tablaCursosBody");
        if (!tabla) return;
        
        tabla.innerHTML = ""; 
        
        datosFiltrados.forEach(curso => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${curso.id}</td>
                <td>${curso.nombre}</td>
                <td>${curso.inscriptosMax}</td>
                <td>
                    <span class="badge text-bg-dark-subtle text-dark border border-dark-subtle">
                        ${estadoTexto[curso.estado] || 'Desconocido'}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-success py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalDiploma" data-id="${curso.id}" title="Generar Diploma">
                            <i class="bi bi-award"></i>
                        </button>
                        <button class="btn btn-outline-primary py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalDetalle" data-id="${curso.id}" title="Ver Detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalEditar" data-id="${curso.id}" title="Editar Curso">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalEliminar" data-id="${curso.id}" title="Eliminar Curso">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tabla.appendChild(fila);
        });
    }

    // ==========================================
    // BÚSQUEDA DE CURSOS
    // ==========================================
    const inputBuscar = document.getElementById("buscarCurso");

    if (inputBuscar) {
        inputBuscar.addEventListener("input", (e) => {
            textoFiltro = e.target.value.toLowerCase().trim();
            aplicarFiltros();
        });
    }

    const selectFiltroEstado = document.getElementById("filtroEstado");
    if (selectFiltroEstado) {
        selectFiltroEstado.addEventListener("change", (e) => {
            estadoFiltro = e.target.value;
            aplicarFiltros();
        });
    }

    // ==========================================
    // MÓDULO: CREAR CURSO
    // ==========================================
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

        try {
            const response = await fetch('/api/v1/cursos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoCurso)
            });

            const resultado = await response.json();
            
            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('modalCrear')).hide();
                new bootstrap.Modal(document.getElementById('modalExito')).show();
                document.getElementById("btnCerrarExito").onclick = () => location.reload();
            } else {
                alert("Error al guardar: " + (resultado.error || "Desconocido"));
            }
        } catch (error) {
            console.error("Error en el fetch:", error);
        }
    });

    // parte nueva del diploma

    let estudiantes = [];

    const respuestaEst = await fetch("js/estudiantes.json");
    estudiantes = await respuestaEst.json();

    const modalDiplomaElement = document.getElementById("modalDiploma");

    modalDiplomaElement.addEventListener("show.bs.modal", (event) => {
        const boton = event.relatedTarget;
        const cursoId = boton?.dataset?.id;
        const curso = datos.find(c => c.id === Number(cursoId));
        if (!curso) return;

        const selectEstudiante = document.getElementById("estudianteDiploma");
        selectEstudiante.innerHTML = `<option value="">Seleccioná un estudiante...</option>`;

        estudiantes
            .filter(e => e.activo === 1)
            .forEach(e => {
                selectEstudiante.innerHTML += `
                    <option value="${e.id_estudiante}">
                        ${e.apellido}, ${e.nombres}
                    </option>
                `;
            });

        document.getElementById("diplomaNombreCurso").textContent = curso.nombre;
        document.getElementById("diplomaHoras").textContent = `${curso.cantidadHoras} horas`;
        document.getElementById("diplomaFecha").textContent = 
            new Date(curso.fechaInicio).toLocaleDateString('es-AR', { 
                day: 'numeric', month: 'long', year: 'numeric' 
            });

        document.getElementById("diplomaNombreEstudiante").textContent = "-";
    });

    document.getElementById("estudianteDiploma").addEventListener("change", (event) => {
        const id = Number(event.target.value);
        const estudiante = estudiantes.find(e => e.id_estudiante === id);
        if (!estudiante) return;

        document.getElementById("diplomaNombreEstudiante").textContent = 
            `${estudiante.nombres} ${estudiante.apellido}`;
    });

    // ==========================================
    // MÓDULO: VER DETALLE
    // ==========================================
    const modalDetalleElement = document.getElementById('modalDetalle');
    const buscarCursoID = id => datos.find(curso => curso.id === Number(id));
    
    if (modalDetalleElement) {
        modalDetalleElement.addEventListener('show.bs.modal', event => {
            const boton = event.relatedTarget;
            const cursoId = boton?.dataset?.id;
            const curso = buscarCursoID(cursoId);

            if (!curso) return;

            document.getElementById('detalleSubtitulo').textContent = curso.nombre;
            document.getElementById('detalleNombre').textContent = curso.nombre;
            document.getElementById('detalleDescripcion').textContent = curso.descripcion;
            document.getElementById('detalleFechaInicio').textContent = curso.fechaInicio ? new Date(curso.fechaInicio).toLocaleDateString('es-AR') : 'Sin fecha';
            document.getElementById('detalleCantidadHoras').textContent = `${curso.cantidadHoras} horas`;
            document.getElementById('detalleMaxInscriptosTexto').textContent = `${curso.inscriptosMax} lugares`;
            document.getElementById('detalleUltimaModificacion').textContent = curso.ultimaModificacion ? `${new Date(curso.ultimaModificacion).toLocaleString('es-AR')} - usuario: ${curso.id_usuario_modificacion}` : 'Sin datos';

            document.getElementById('detalleEstado').innerHTML = `
                <span class="badge text-bg-dark-subtle text-dark border border-dark-subtle">
                    ${estadoTexto[curso.estado] || 'Desconocido'}
                </span>
            `;
        });
    }

    // ==========================================
    // MÓDULO: ELIMINAR CURSO
    // ==========================================
    const modalEliminar = document.getElementById("modalEliminar");
    let cursoIdAEliminar = null;

    modalEliminar.addEventListener("show.bs.modal", (event) => {
        const boton = event.relatedTarget;
        const id = boton?.dataset?.id;
        const curso = datos.find(c => c.id === Number(id));
        if (!curso) return;
        cursoIdAEliminar = curso.id;
        document.getElementById("nombreCursoAEliminar").textContent = curso.nombre;
    });

    document.getElementById("btnConfirmarEliminar").addEventListener("click", () => {
        if (!cursoIdAEliminar) return;
        datos = datos.filter(c => c.id !== cursoIdAEliminar);
        const filas = document.querySelectorAll("#tablaCursosBody tr");
        filas.forEach(fila => {
            const btn = fila.querySelector(`[data-id="${cursoIdAEliminar}"]`);
            if (btn) fila.remove();
        });

        const instanciaModal = bootstrap.Modal.getInstance(modalEliminar);
        instanciaModal.hide();
        cursoIdAEliminar = null;

        // Actualiza el array filtrado y re-renderiza
        aplicarFiltros(); 
    });

    // ==========================================
    // MÓDULO: EDITAR CURSO 
    // ==========================================
    const modalEditar = document.getElementById("modalEditar");
    let cursoEditando = null;

    modalEditar.addEventListener("show.bs.modal", (event) => {
        const boton = event.relatedTarget;
        const id = boton?.dataset?.id;
        const curso = datos.find(c => c.id === Number(id));
        if (!curso) return;
        cursoEditando = curso;
        document.getElementById("editarIdCurso").value = curso.id;
        document.getElementById("editarNombre").value = curso.nombre;
        document.getElementById("editarDescripcion").value = curso.descripcion || "";
        document.getElementById("editarFechaInicio").value = curso.fechaInicio?.split("T")[0] || "";
        document.getElementById("editarHoras").value = curso.cantidadHoras || "";
        document.getElementById("editarMax").value = curso.inscriptosMax || "";
        document.getElementById("editarEstado").value = curso.estado;
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
        cursoEditando.cantidadHoras = horas;
        cursoEditando.inscriptosMax = max;
        cursoEditando.estado = Number(document.getElementById("editarEstado").value);
        cursoEditando.fechaInicio = document.getElementById("editarFechaInicio").value;

        bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();

        // Aplicamos el filtro para actualizar la tabla con el dato ya editado
        aplicarFiltros();
    });

    // ==========================================
    // UTILS
    // ==========================================
    function mostrarError(mensaje) {
        const modal = new bootstrap.Modal(document.getElementById("modalError"));
        const modalEditarEl = document.getElementById("modalEditar");
        const modalEditarInstance = bootstrap.Modal.getInstance(modalEditarEl);
        if (modalEditarInstance) {
            modalEditarInstance.hide();
        }
        document.getElementById("mensajeError").textContent = mensaje;
        modal.show();

        document.getElementById("btnCerrarError").onclick = () => {
            location.reload();
        };
    }
});
import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js";
import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

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

    //variables para paginación
    let paginaActual = 1;
    let totalPaginas = 1;

    // 1. Carga Inicial 
    try {
        //No va MÁS: const respuesta = await fetch(`js/cursos.json?v=${new Date().getTime()}`);
        const respuesta = await fetch('/api/cursos');
        datos = await respuesta.json();
        datosFiltrados = [...datos];
        renderizarTablaDeCursos();
    } catch (error) {
        console.error("Error en carga de cursos:", error);
    }

    async function cargarCursos() {
        try {
            const respuesta = await fetch(`/api/v1/cursos?page=${paginaActual}&limit=10`);
            const json = await respuesta.json();
            
            datos = json.data;
            datosFiltrados = [...datos];
            totalPaginas = json.pagination.totalPages || 1; 
            
            renderizarTablaDeCursos();
            
            // Actualizar texto de paginación
            const infoPaginacion = document.getElementById("infoPaginacion");
            if (infoPaginacion) {
                infoPaginacion.textContent = `Página ${paginaActual} de ${totalPaginas}`;
            }

            // Deshabilitar botones si no hay más páginas
            if (btnAnterior) btnAnterior.disabled = (paginaActual <= 1);
            if (btnSiguiente) btnSiguiente.disabled = (paginaActual >= totalPaginas);
            
        } catch (error) {
            console.error("Error en carga de cursos:", error);
        }
    }
    
    const btnSiguiente = document.getElementById("btnSiguiente");
    const btnAnterior = document.getElementById("btnAnterior");

    cargarCursos();

    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                cargarCursos();
            }
        });
    }

    if (btnAnterior) {
        btnAnterior.addEventListener("click", () => {
            if (paginaActual > 1) {
                paginaActual--;
                cargarCursos();
            }
        });
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
    

    async function buscarCursos() {
        try {
            const params = new URLSearchParams();
            if (textoFiltro) {
                params.append("nombre", textoFiltro);
            }
            if (estadoFiltro) {
                params.append("id_curso_estado", estadoFiltro);
            }
            const respuesta = await fetch(`/api/v1/cursos?${params.toString()}`);
            const json = await respuesta.json();
            datos = json.data;
            datosFiltrados = [...datos];
            renderizarTablaDeCursos();
    } catch (error) {
        console.error("Error buscando cursos:", error);
    }
    console.log("Búsqueda realizada con texto:", textoFiltro, "y estado:", estadoFiltro);
    }

    // ==========================================
    // BÚSQUEDA DE CURSOS
    // ==========================================
    const inputBuscar = document.getElementById("buscarCurso");

    if (inputBuscar) {
        inputBuscar.addEventListener("input",  (e) => {
            console.log("Input de búsqueda:", e.target.value);
            textoFiltro = e.target.value.toLowerCase().trim();
            buscarCursos();
        });
    }

    const selectFiltroEstado = document.getElementById("filtroEstado");
    if (selectFiltroEstado) {
        selectFiltroEstado.addEventListener("change", (e) => {
            estadoFiltro = e.target.value;
            buscarCursos();
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
            setCargando("btnConfirmarCrear", "spinnerCrear", true, "Crear curso");
            const response = await fetch('/api/v1/cursos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoCurso)
            });

            const resultado = await response.json();
            
            if (response.ok) {
                // Ocultar modal de creación
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalCrear'));
                if (modalInstance) modalInstance.hide();

                // Mostrar modal de éxito
                const modalExito = new bootstrap.Modal(document.getElementById('modalExito'));
                modalExito.show();

                // Resetear el formulario
                formCrear.reset();

                // Al cerrar el éxito, recargar la tabla (sin recargar la página completa)
                document.getElementById("btnCerrarExito").onclick = async () => {
                    await cargarCursos();
                };
            } else {
                // Mostrar el error real del backend usando el modal
                mostrarError(resultado.error || "Desconocido");
            }
        } catch (error) {
            console.error("Error en el fetch:", error);
            mostrarError("Ocurrió un error inesperado al intentar crear el curso.");
        } finally {
            setCargando("btnConfirmarCrear", "spinnerCrear", false, "Crear curso");
        }
    });
    // parte nueva del diploma

    let estudiantes = [];

    //No va MÁS: const respuestaEst = await fetch("js/estudiantes.json");
    const respuestaEst = await fetch('/api/estudiantes');
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


    // GENERADOR DE PDF
    document.getElementById("btnGenerarPDF").addEventListener("click", async () => {

    // Verificar que haya un estudiante seleccionado
    const nombreEstudiante = document.getElementById("diplomaNombreEstudiante").textContent;
    if (nombreEstudiante === "-" || nombreEstudiante === "") {
        alert("Seleccioná un estudiante antes de generar el PDF.");
        return;
    }

    // Capturar la vista previa como imagen
    const elemento = document.getElementById("vistaPreviaDiploma");
    const canvas = await html2canvas(elemento, { scale: 2 });
    const imagen = canvas.toDataURL("image/png");

    // Crear el PDF en horizontal (landscape) tamaño A4
    const doc = new jsPDF("landscape", "mm", "a4");
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();

    // Agregar la imagen al PDF ocupando toda la página
    doc.addImage(imagen, "PNG", 0, 0, ancho, alto);

    // Descargar con el nombre del estudiante
    doc.save(`diploma-${nombreEstudiante.replace(/ /g, "-")}.pdf`);
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
            document.getElementById('detalleUltimaModificacion').textContent = curso.ultimaModificacion ? new Date(curso.ultimaModificacion).toLocaleString('es-AR') : 'Sin datos';

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
        const id = boton.getAttribute('data-id');
        console.log("Intentando eliminar ID:", id);
        
        const curso = datos.find(c => c.id == id);
        if (!curso) {
            console.error("No se encontró el curso con ID:", id, "en", datos);
            return;
        }
        
        cursoIdAEliminar = curso.id;
        document.getElementById("nombreCursoAEliminar").textContent = curso.nombre;
    });

    document.getElementById("btnConfirmarEliminar").addEventListener("click", async () => {
        if (!cursoIdAEliminar) return;
        
        try {
            setCargando("btnConfirmarEliminar", "spinnerEliminar", true, "Eliminar");
            const respuesta = await fetch(`/api/v1/cursos/${cursoIdAEliminar}`, {
                method: 'DELETE'
            });

            const json = await respuesta.json();

            if (respuesta.ok) {
                // Ocultar modal
                const instanciaModal = bootstrap.Modal.getInstance(modalEliminar);
                instanciaModal.hide();

                // Reset variable
                cursoIdAEliminar = null;

                // Refrescar tabla con datos reales
                await cargarCursos();
            } else {
                // Mostrar error del backend usando el modal
                mostrarError(json.error || "No se pudo eliminar el curso.");
            }
        } catch (error) {
            console.error("Error al eliminar curso:", error);
            mostrarError("Ocurrió un error de red al intentar eliminar el curso.");
        } finally {
            setCargando("btnConfirmarEliminar", "spinnerEliminar", false, "Eliminar");
        }
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

    document.getElementById("btnGuardarCambios").addEventListener("click", async () => {
        if (!cursoEditando) return;

        const cursoActualizado = {
            nombre: document.getElementById("editarNombre").value.trim(),
            descripcion: document.getElementById("editarDescripcion").value.trim(),
            fecha_inicio: document.getElementById("editarFechaInicio").value,
            cantidad_horas: Number(document.getElementById("editarHoras").value),
            inscriptos_max: Number(document.getElementById("editarMax").value),
            id_curso_estado: Number(document.getElementById("editarEstado").value)
        };

        try {
            setCargando("btnGuardarCambios", "spinnerEditar", true, "Guardar cambios");
            const response = await fetch(`/api/v1/cursos/${cursoEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cursoActualizado)
            });

            const resultado = await response.json();

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();
                await cargarCursos();
            } else {
                mostrarError(resultado.error || "Desconocido");
            }
        } catch (error) {
            console.error("Error en el fetch:", error);
            mostrarError("Ocurrió un error inesperado al intentar actualizar el curso.");
        } finally {
            setCargando("btnGuardarCambios", "spinnerEditar", false, "Guardar cambios");
        }
    });

    // ==========================================
    // UTILS
    // ==========================================
    function setCargando(idBoton, idSpinner, cargando, textoOriginal) {
        const boton = document.getElementById(idBoton);
        const spinner = document.getElementById(idSpinner);
        const texto = boton.querySelector('span[id^="texto"]');

        if (cargando) {
            boton.disabled = true;
            spinner.classList.remove("d-none");
            if (texto) texto.textContent = " Procesando...";
        } else {
            boton.disabled = false;
            spinner.classList.add("d-none");
            if (texto) texto.textContent = textoOriginal;
        }
    }

    function mostrarError(mensaje) {
        const modalesParaCerrar = ['modalEditar', 'modalCrear', 'modalEliminar'];
        modalesParaCerrar.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const instance = bootstrap.Modal.getInstance(el);
                if (instance) instance.hide();
            }
        });

        const modalErrorEl = document.getElementById("modalError");
        if (!modalErrorEl) return;

        const mensajeErrorEl = document.getElementById("mensajeError");
        if (mensajeErrorEl) mensajeErrorEl.textContent = mensaje;

        const modalError = new bootstrap.Modal(modalErrorEl);
        modalError.show();

        // Ya no recargamos la página por defecto al cerrar el error
        const btnCerrarError = document.getElementById("btnCerrarError");
        if (btnCerrarError) {
            btnCerrarError.onclick = null; // Limpiar eventos anteriores
        }
    }
});
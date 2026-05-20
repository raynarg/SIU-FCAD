import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js";
import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

document.addEventListener("DOMContentLoaded", async function () {
    // Estado global del módulo
    let datos = [];           // cursos cargados desde la API (página actual)
    let datosFiltrados = [];  // subconjunto de datos tras aplicar filtros locales
    let textoFiltro = ''; 
    let estadoFiltro = '';  

    // Mapa de IDs de estado a etiquetas legibles (debe coincidir con cursos_estados en la BD)
    const estadoTexto = {
        1: 'Borrador',
        2: 'Inscripción Abierta',
        3: 'Inscripción Cerrada'
    };

    // Variables de paginación del lado del servidor
    let paginaActual = 1;
    let totalPaginas = 1;

    // ── Carga inicial ──
    try {
        const respuesta = await fetch('/api/cursos');
        datos = await respuesta.json();
        datosFiltrados = [...datos];
        renderizarTablaDeCursos();
    } catch (error) {
        console.error("Error en carga de cursos:", error);
    }

    // Carga una página de cursos desde la API y actualiza la tabla y controles de paginación
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

    // Navegar a la página siguiente
    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                cargarCursos();
            }
        });
    }

    // Navegar a la página anterior
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

    // Filtra el array local `datos` según textoFiltro y estadoFiltro, luego re-renderiza
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

    // Limpia y reconstruye la tabla con los cursos de datosFiltrados
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

    // Consulta la API con los filtros activos y actualiza la tabla (búsqueda server-side)
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

    // Dispara búsqueda server-side en cada keystroke del input
    if (inputBuscar) {
        inputBuscar.addEventListener("input",  (e) => {
            console.log("Input de búsqueda:", e.target.value);
            textoFiltro = e.target.value.toLowerCase().trim();
            buscarCursos();
        });
    }

    const selectFiltroEstado = document.getElementById("filtroEstado");

    // Dispara búsqueda server-side al cambiar el filtro de estado
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

    // Envía el formulario al backend y recarga la tabla sin recargar la página
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
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalCrear'));
                if (modalInstance) modalInstance.hide();

                const modalExito = new bootstrap.Modal(document.getElementById('modalExito'));
                modalExito.show();

                formCrear.reset();

                document.getElementById("btnCerrarExito").onclick = async () => {
                    await cargarCursos();
                };
            } else {
                mostrarError(resultado.error || "Desconocido");
            }
        } catch (error) {
            console.error("Error en el fetch:", error);
            mostrarError("Ocurrió un error inesperado al intentar crear el curso.");
        } finally {
            setCargando("btnConfirmarCrear", "spinnerCrear", false, "Crear curso");
        }
    });

    // ==========================================
    // MÓDULO: DIPLOMA
    // ==========================================

    // Carga estudiantes desde la API para el selector del modal de diploma
    // TODO: mover a /api/v1/estudiantes cuando se implemente el módulo completo
    let estudiantes = [];
    const respuestaEst = await fetch('/api/estudiantes');
    estudiantes = await respuestaEst.json();

    const modalDiplomaElement = document.getElementById("modalDiploma");

    // Al abrir el modal, poblar el select con estudiantes activos y precargar datos del curso
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

    // Actualiza la vista previa del diploma al seleccionar un estudiante
    document.getElementById("estudianteDiploma").addEventListener("change", (event) => {
        const id = Number(event.target.value);
        const estudiante = estudiantes.find(e => e.id_estudiante === id);
        if (!estudiante) return;

        document.getElementById("diplomaNombreEstudiante").textContent = 
            `${estudiante.nombres} ${estudiante.apellido}`;
    });

    // Captura la vista previa como imagen y genera el PDF en formato A4 horizontal
    document.getElementById("btnGenerarPDF").addEventListener("click", async () => {
        const nombreEstudiante = document.getElementById("diplomaNombreEstudiante").textContent;
        if (nombreEstudiante === "-" || nombreEstudiante === "") {
            alert("Seleccioná un estudiante antes de generar el PDF.");
            return;
        }

        const elemento = document.getElementById("vistaPreviaDiploma");
        const canvas = await html2canvas(elemento, { scale: 2 });
        const imagen = canvas.toDataURL("image/png");

        const doc = new jsPDF("landscape", "mm", "a4");
        const ancho = doc.internal.pageSize.getWidth();
        const alto = doc.internal.pageSize.getHeight();

        doc.addImage(imagen, "PNG", 0, 0, ancho, alto);
        doc.save(`diploma-${nombreEstudiante.replace(/ /g, "-")}.pdf`);
    });

    // ==========================================
    // MÓDULO: VER DETALLE
    // ==========================================
    const modalDetalleElement = document.getElementById('modalDetalle');

    // Busca un curso en el array local por su ID (usado por el modal de detalle)
    const buscarCursoID = id => datos.find(curso => curso.id === Number(id));
    
    // Al abrir el modal, carga los datos del curso seleccionado en los campos del detalle
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

    // Al abrir el modal, guarda el ID del curso a eliminar y muestra su nombre
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

    // Confirma el soft delete enviando DELETE a la API y recarga la tabla
    document.getElementById("btnConfirmarEliminar").addEventListener("click", async () => {
        if (!cursoIdAEliminar) return;
        
        try {
            setCargando("btnConfirmarEliminar", "spinnerEliminar", true, "Eliminar");
            const respuesta = await fetch(`/api/v1/cursos/${cursoIdAEliminar}`, {
                method: 'DELETE'
            });

            const json = await respuesta.json();

            if (respuesta.ok) {
                const instanciaModal = bootstrap.Modal.getInstance(modalEliminar);
                instanciaModal.hide();
                cursoIdAEliminar = null;
                await cargarCursos();
            } else {
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

    // Al abrir el modal, precarga los campos del formulario con los datos actuales del curso
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

    // Envía los cambios al backend con PUT y recarga la tabla
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

    // Muestra/oculta el spinner de un botón y lo habilita/deshabilita durante operaciones async
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

    // Cierra cualquier modal abierto y muestra el modal de error con el mensaje recibido
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

        // Limpiar el onclick anterior para evitar acumulación de handlers
        const btnCerrarError = document.getElementById("btnCerrarError");
        if (btnCerrarError) {
            btnCerrarError.onclick = null;
        }
    }
});
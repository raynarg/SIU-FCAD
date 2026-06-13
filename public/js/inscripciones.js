import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js";
import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

document.addEventListener("DOMContentLoaded", async function () {
    let datos = [];
    let paginaActual = 1;
    let totalPaginas = 1;
    const limit = 10;

    // Elementos del DOM
    const tablaBody = document.getElementById("tablaInscripcionesBody");
    const infoPaginacion = document.getElementById("infoPaginacion");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");
    
    // Filtros
    const inputEstudiante = document.getElementById("buscarEstudiante");
    const selectCurso = document.getElementById("buscarCurso");
    const btnLimpiar = document.getElementById("btnLimpiarFiltros");

    // Formulario Crear
    const formCrear = document.getElementById("formCrearInscripcion");
    const selectNuevoEstudiante = document.getElementById("nuevoEstudiante");
    const selectNuevoCurso = document.getElementById("nuevoCurso");
    const inputNuevaFecha = document.getElementById("nuevaFechaInscripcion");

    // Modal Eliminar
    const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");
    let inscripcionIdAEliminar = null;

    // Establecer fecha por defecto (hoy)
    if (inputNuevaFecha) {
        inputNuevaFecha.value = new Date().toISOString().split('T')[0];
    }

    // Cargar datos iniciales
    await cargarDatosAuxiliares();
    await cargarInscripciones();

    // ==========================================
    // CARGA DE DATOS AUXILIARES (Estudiantes y Cursos para Selects)
    // ==========================================
    async function cargarDatosAuxiliares() {
        try {
            // Cargar estudiantes para el dropdown de creación
            const resEstudiantes = await fetch('/api/v1/estudiantes?limit=100');
            if (resEstudiantes.ok) {
                const jsonEstudiantes = await resEstudiantes.json();
                const estudiantes = jsonEstudiantes.data || [];
                if (selectNuevoEstudiante) {
                    selectNuevoEstudiante.innerHTML = '<option value="">-- Seleccione un estudiante --</option>';
                    estudiantes.forEach(est => {
                        if (est.activo) {
                            const option = document.createElement("option");
                            option.value = est.id_estudiante;
                            option.textContent = `${est.apellido}, ${est.nombres} (DNI: ${est.documento})`;
                            selectNuevoEstudiante.appendChild(option);
                        }
                    });
                }
            }

            // Cargar cursos para los dropdowns de búsqueda y creación
            const resCursos = await fetch('/api/v1/cursos?limit=100');
            if (resCursos.ok) {
                const jsonCursos = await resCursos.json();
                const cursos = jsonCursos.data || [];
                
                // Dropdown filtro
                if (selectCurso) {
                    selectCurso.innerHTML = '<option value="">Todos los cursos</option>';
                    cursos.forEach(curso => {
                        const option = document.createElement("option");
                        option.value = curso.id;
                        option.textContent = curso.nombre;
                        selectCurso.appendChild(option);
                    });
                }

                // Dropdown creación (solo cursos abiertos a inscripción)
                if (selectNuevoCurso) {
                    selectNuevoCurso.innerHTML = '<option value="">-- Seleccione un curso --</option>';
                    cursos.forEach(curso => {
                        if (curso.estado === 2) { // 2 = Inscripción abierta
                            const option = document.createElement("option");
                            option.value = curso.id;
                            option.textContent = `${curso.nombre} (${curso.cantidadHoras} hs)`;
                            selectNuevoCurso.appendChild(option);
                        }
                    });
                }
            }
        } catch (error) {
            console.warn("No se pudieron cargar los datos auxiliares desde la API. Usando mocks para selects.", error);
        }
    }

    // ==========================================
    // FUNCIONES PRINCIPALES
    // ==========================================
    async function cargarInscripciones() {
        try {
            const params = new URLSearchParams();
            params.append("page", paginaActual);
            params.append("limit", limit);
            
            if (inputEstudiante && inputEstudiante.value) {
                params.append("search", inputEstudiante.value.trim());
            }
            if (selectCurso && selectCurso.value) {
                params.append("curso", selectCurso.value);
            }

            const respuesta = await fetch(`/api/v1/inscripciones?${params.toString()}`);
            if (!respuesta.ok) throw new Error("Error al cargar inscripciones");
            
            const json = await respuesta.json();
            datos = json.data || [];
            totalPaginas = (json.pagination && json.pagination.totalPages) || 1;
            
            renderizarTabla();
            actualizarPaginacion();
        } catch (error) {
            console.error("Error al obtener inscripciones:", error);
            mostrarError("No se pudieron cargar las inscripciones. Por favor, intente más tarde.");
        }
    }

    function renderizarTabla() {
        if (!tablaBody) return;
        tablaBody.innerHTML = "";

        if (datos.length === 0) {
            tablaBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No se encontraron inscripciones</td></tr>`;
            return;
        }

        datos.forEach(ins => {
            const fila = document.createElement("tr");
            
            const estudianteNombre = ins.estudiante ? `${ins.estudiante.apellido}, ${ins.estudiante.nombres}` : 'Desconocido';
            const estudianteDNI = ins.estudiante ? ins.estudiante.documento : '-';
            const cursoNombre = ins.curso ? ins.curso.nombre : 'Desconocido';
            const fechaInscripcion = ins.fecha_inscripcion ? new Date(ins.fecha_inscripcion).toLocaleDateString('es-AR') : 'Sin fecha';

            fila.innerHTML = `
                <td>${ins.id_inscripcion}</td>
                <td>
                    <div class="fw-medium">${estudianteNombre}</div>
                    <small class="text-secondary">DNI: ${estudianteDNI}</small>
                </td>
                <td>
                    <div class="fw-medium">${cursoNombre}</div>
                </td>
                <td>${fechaInscripcion}</td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-success py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalDiploma" data-id="${ins.id_inscripcion}" title="Generar Diploma">
                            <i class="bi bi-award"></i>
                        </button>
                        <button class="btn btn-outline-primary py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalDetalle" data-id="${ins.id_inscripcion}" title="Ver Detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-danger py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalEliminar" data-id="${ins.id_inscripcion}" title="Dar de baja">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tablaBody.appendChild(fila);
        });
    }

    function actualizarPaginacion() {
        if (infoPaginacion) infoPaginacion.textContent = `Página ${paginaActual} de ${totalPaginas}`;
        if (btnAnterior) btnAnterior.disabled = (paginaActual <= 1);
        if (btnSiguiente) btnSiguiente.disabled = (paginaActual >= totalPaginas);
    }

    // ==========================================
    // EVENTOS DE BÚSQUEDA Y FILTROS
    // ==========================================
    if (inputEstudiante) {
        inputEstudiante.addEventListener("input", () => {
            paginaActual = 1;
            cargarInscripciones();
        });
    }

    if (selectCurso) {
        selectCurso.addEventListener("change", () => {
            paginaActual = 1;
            cargarInscripciones();
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            document.getElementById("formFiltros").reset();
            paginaActual = 1;
            cargarInscripciones();
        });
    }

    if (btnAnterior) {
        btnAnterior.addEventListener("click", () => {
            if (paginaActual > 1) {
                paginaActual--;
                cargarInscripciones();
            }
        });
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                cargarInscripciones();
            }
        });
    }

    // ==========================================
    // CRUD: CREAR INSCRIPCIÓN
    // ==========================================
    if (formCrear) {
        formCrear.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const nuevaInscripcion = {
                id_estudiante: Number(selectNuevoEstudiante.value),
                id_curso: Number(selectNuevoCurso.value),
                fecha_inscripcion: inputNuevaFecha.value
            };

            try {
                setCargando("btnConfirmarCrear", "spinnerCrear", true, "Inscribir estudiante");
                const response = await fetch('/api/v1/inscripciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevaInscripcion)
                });

                const resultado = await response.json();
                
                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalCrear')).hide();
                    formCrear.reset();
                    if (inputNuevaFecha) inputNuevaFecha.value = new Date().toISOString().split('T')[0];
                    mostrarExito("La inscripción se ha registrado correctamente.");
                    await cargarInscripciones();
                } else {
                    mostrarError(resultado.error || "No se pudo registrar la inscripción.");
                }
            } catch (error) {
                console.error("Error al registrar inscripción:", error);
                mostrarError("Ocurrió un error al intentar crear la inscripción.");
            } finally {
                setCargando("btnConfirmarCrear", "spinnerCrear", false, "Inscribir estudiante");
            }
        });
    }

    // ==========================================
    // CRUD: ELIMINAR INSCRIPCIÓN
    // ==========================================
    const modalEliminar = document.getElementById("modalEliminar");
    if (modalEliminar) {
        modalEliminar.addEventListener("show.bs.modal", (event) => {
            const id = event.relatedTarget.dataset.id;
            const ins = datos.find(i => i.id_inscripcion == id);
            if (!ins) return;
            
            inscripcionIdAEliminar = id;
            document.getElementById("eliminarEstudianteNombre").textContent = ins.estudiante ? `${ins.estudiante.apellido}, ${ins.estudiante.nombres}` : 'Desconocido';
            document.getElementById("eliminarCursoNombre").textContent = ins.curso ? ins.curso.nombre : 'Desconocido';
        });
    }

    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.addEventListener("click", async () => {
            if (!inscripcionIdAEliminar) return;

            try {
                setCargando("btnConfirmarEliminar", "spinnerEliminar", true, "Dar de baja");
                const response = await fetch(`/api/v1/inscripciones/${inscripcionIdAEliminar}`, {
                    method: 'DELETE'
                });

                const json = await response.json();

                if (response.ok) {
                    bootstrap.Modal.getInstance(modalEliminar).hide();
                    mostrarExito("La inscripción ha sido dada de baja.");
                    await cargarInscripciones();
                } else {
                    mostrarError(json.error || "No se pudo dar de baja la inscripción.");
                }
            } catch (error) {
                console.error("Error al dar de baja inscripción:", error);
                mostrarError("Ocurrió un error al intentar dar de baja la inscripción.");
            } finally {
                setCargando("btnConfirmarEliminar", "spinnerEliminar", false, "Dar de baja");
                inscripcionIdAEliminar = null;
            }
        });
    }

    // ==========================================
    // VER DETALLE Y DIPLOMA
    // ==========================================
    const modalDetalle = document.getElementById('modalDetalle');
    if (modalDetalle) {
        modalDetalle.addEventListener('show.bs.modal', event => {
            const id = event.relatedTarget.dataset.id;
            const ins = datos.find(i => i.id_inscripcion == id);
            if (!ins) return;

            const estudianteNombre = ins.estudiante ? `${ins.estudiante.apellido}, ${ins.estudiante.nombres}` : 'Desconocido';
            const estudianteDNI = ins.estudiante ? ins.estudiante.documento : '-';
            const estudianteEmail = ins.estudiante ? ins.estudiante.email : '-';
            
            const cursoNombre = ins.curso ? ins.curso.nombre : 'Desconocido';
            const cursoHoras = ins.curso ? `${ins.curso.cantidadHoras} horas` : '-';
            const cursoFecha = ins.curso && ins.curso.fechaInicio ? new Date(ins.curso.fechaInicio).toLocaleDateString('es-AR') : 'Sin fecha';
            const fechaInscripcion = ins.fecha_inscripcion ? new Date(ins.fecha_inscripcion).toLocaleDateString('es-AR') : 'Sin fecha';

            // Llenar datos de detalle
            document.getElementById('detalleSubtitulo').textContent = `${estudianteNombre} - ${cursoNombre}`;
            document.getElementById('detalleEstudianteNombre').textContent = estudianteNombre;
            document.getElementById('detalleEstudianteDoc').textContent = estudianteDNI;
            document.getElementById('detalleEstudianteEmail').textContent = estudianteEmail;
            
            document.getElementById('detalleCursoNombre').textContent = cursoNombre;
            document.getElementById('detalleCursoHoras').textContent = cursoHoras;
            document.getElementById('detalleCursoFecha').textContent = cursoFecha;
            document.getElementById('detalleInscripcionFecha').textContent = fechaInscripcion;
        });
    }

    const modalDiploma = document.getElementById('modalDiploma');
    if (modalDiploma) {
        modalDiploma.addEventListener('show.bs.modal', event => {
            const id = event.relatedTarget.dataset.id;
            const ins = datos.find(i => i.id_inscripcion == id);
            if (!ins) return;

            const estudianteNombre = ins.estudiante ? `${ins.estudiante.apellido}, ${ins.estudiante.nombres}` : 'Desconocido';
            const cursoNombre = ins.curso ? ins.curso.nombre : 'Desconocido';
            const cursoHoras = ins.curso ? `${ins.curso.cantidadHoras} horas` : '-';
            const cursoFecha = ins.curso && ins.curso.fechaInicio ? new Date(ins.curso.fechaInicio).toLocaleDateString('es-AR') : 'Sin fecha';

            // Llenar vista previa del diploma
            document.getElementById('diplomaSubtitulo').textContent = `${estudianteNombre} - ${cursoNombre}`;
            document.getElementById('diplomaNombreEstudiante').textContent = estudianteNombre.toUpperCase();
            document.getElementById('diplomaNombreCurso').textContent = cursoNombre;
            document.getElementById('diplomaHoras').textContent = cursoHoras;
            document.getElementById('diplomaFecha').textContent = cursoFecha;
        });
    }

    // ==========================================
    // GENERACIÓN DE DIPLOMA PDF (FRONTEND TRIGGER & FLOW)
    // ==========================================
    const btnGenerarPDF = document.getElementById("btnGenerarPDF");
    if (btnGenerarPDF) {
        btnGenerarPDF.addEventListener("click", async () => {
            const nombreEstudiante = document.getElementById("diplomaNombreEstudiante").textContent;
            if (nombreEstudiante === "-" || nombreEstudiante === "") {
                alert("No hay datos de estudiante válidos para generar el diploma.");
                return;
            }

            const elemento = document.getElementById("vistaPreviaDiploma");
            try {
                btnGenerarPDF.disabled = true;
                btnGenerarPDF.textContent = "Generando PDF...";

                const canvas = await html2canvas(elemento, { scale: 2 });
                const imagen = canvas.toDataURL("image/png");

                const doc = new jsPDF("landscape", "mm", "a4");
                const ancho = doc.internal.pageSize.getWidth();
                const alto = doc.internal.pageSize.getHeight();

                doc.addImage(imagen, "PNG", 0, 0, ancho, alto);
                doc.save(`diploma-${nombreEstudiante.trim().replace(/ /g, "-")}.pdf`);
            } catch (err) {
                console.error("Error al generar PDF del diploma:", err);
                alert("Ocurrió un error al generar el PDF del diploma.");
            } finally {
                btnGenerarPDF.disabled = false;
                btnGenerarPDF.innerHTML = `
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                    <path d="M5 20h14"></path>
                  </svg>
                  Descargar Diploma PDF
                `;
            }
        });
    }

    // ==========================================
    // SIMULACIÓN LOCAL (Si las APIs aún no están listas)
    // ==========================================
    function cargarSimulacionLocal() {
        if (datos.length === 0) {
            datos = [
                {
                    id_inscripcion: 1,
                    id_estudiante: 1,
                    id_curso: 1,
                    fecha_inscripcion: "2026-05-10T10:00:00",
                    estudiante: {
                        id_estudiante: 1,
                        documento: "38452167",
                        apellido: "García",
                        nombres: "Mateo Emilio",
                        email: "mateo.garcia@gmail.com",
                        fecha_nacimiento: "2001-03-15",
                        activo: 1
                    },
                    curso: {
                        id: 1,
                        nombre: "Programación Web con React",
                        descripcion: "Aprende React, Hooks, Router y Context API.",
                        fechaInicio: "2026-06-01",
                        cantidadHoras: 60,
                        inscriptosMax: 30,
                        estado: 2
                    }
                },
                {
                    id_inscripcion: 2,
                    id_estudiante: 2,
                    id_curso: 2,
                    fecha_inscripcion: "2026-05-12T14:30:00",
                    estudiante: {
                        id_estudiante: 2,
                        documento: "40123894",
                        apellido: "Torres",
                        nombres: "Santiago Julián",
                        email: "santiago.torres@outlook.com",
                        fecha_nacimiento: "2000-07-22",
                        activo: 1
                    },
                    curso: {
                        id: 2,
                        nombre: "Bases de Datos con PostgreSQL",
                        descripcion: "Diseño, modelado y consultas avanzadas SQL.",
                        fechaInicio: "2026-06-15",
                        cantidadHoras: 45,
                        inscriptosMax: 25,
                        estado: 2
                    }
                },
                {
                    id_inscripcion: 3,
                    id_estudiante: 3,
                    id_curso: 1,
                    fecha_inscripcion: "2026-05-15T11:20:00",
                    estudiante: {
                        id_estudiante: 3,
                        documento: "41987532",
                        apellido: "Gómez",
                        nombres: "Luisa Luciana",
                        email: "luisa.gomez@gmail.com",
                        fecha_nacimiento: "2002-11-08",
                        activo: 1
                    },
                    curso: {
                        id: 1,
                        nombre: "Programación Web con React",
                        descripcion: "Aprende React, Hooks, Router y Context API.",
                        fechaInicio: "2026-06-01",
                        cantidadHoras: 60,
                        inscriptosMax: 30,
                        estado: 2
                    }
                }
            ];
            totalPaginas = 1;
            renderizarTabla();
            actualizarPaginacion();
            populateAuxMocks();
        }
    }

    function populateAuxMocks() {
        if (selectNuevoEstudiante && selectNuevoEstudiante.children.length <= 1) {
            const mockEstudiantes = [
                { id_estudiante: 1, apellido: "García", nombres: "Mateo Emilio", documento: "38452167", email: "mateo.garcia@gmail.com" },
                { id_estudiante: 2, apellido: "Torres", nombres: "Santiago Julián", documento: "40123894", email: "santiago.torres@outlook.com" },
                { id_estudiante: 3, apellido: "Gómez", nombres: "Luisa Luciana", documento: "41987532", email: "luisa.gomez@gmail.com" },
                { id_estudiante: 5, apellido: "Martínez", nombres: "Valentina Sofía", documento: "42301876", email: "valentina.martinez@gmail.com" }
            ];
            selectNuevoEstudiante.innerHTML = '<option value="">-- Seleccione un estudiante --</option>';
            mockEstudiantes.forEach(est => {
                const option = document.createElement("option");
                option.value = est.id_estudiante;
                option.textContent = `${est.apellido}, ${est.nombres} (DNI: ${est.documento})`;
                selectNuevoEstudiante.appendChild(option);
            });
        }

        if (selectCurso && selectCurso.children.length <= 1) {
            const mockCursos = [
                { id: 1, nombre: "Programación Web con React", cantidadHoras: 60 },
                { id: 2, nombre: "Bases de Datos con PostgreSQL", cantidadHoras: 45 }
            ];
            selectCurso.innerHTML = '<option value="">Todos los cursos</option>';
            mockCursos.forEach(curso => {
                const option = document.createElement("option");
                option.value = curso.id;
                option.textContent = curso.nombre;
                selectCurso.appendChild(option);
            });

            if (selectNuevoCurso && selectNuevoCurso.children.length <= 1) {
                selectNuevoCurso.innerHTML = '<option value="">-- Seleccione un curso --</option>';
                mockCursos.forEach(curso => {
                    const option = document.createElement("option");
                    option.value = curso.id;
                    option.textContent = `${curso.nombre} (${curso.cantidadHoras} hs)`;
                    selectNuevoCurso.appendChild(option);
                });
            }
        }
    }

    // ==========================================
    // UTILS
    // ==========================================
    function setCargando(idBoton, idSpinner, cargando, textoOriginal) {
        const boton = document.getElementById(idBoton);
        const spinner = document.getElementById(idSpinner);
        const texto = boton ? boton.querySelector('span[id^="texto"]') : null;

        if (boton && spinner) {
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
    }

    function mostrarExito(mensaje) {
        const msg = document.getElementById("mensajeExito");
        if (msg) msg.textContent = mensaje;
        const modal = new bootstrap.Modal(document.getElementById('modalExito'));
        modal.show();
    }

    function mostrarError(mensaje) {
        const msg = document.getElementById("mensajeError");
        if (msg) msg.textContent = mensaje;
        const modal = new bootstrap.Modal(document.getElementById('modalError'));
        modal.show();
    }
});

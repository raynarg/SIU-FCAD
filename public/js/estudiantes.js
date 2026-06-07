document.addEventListener("DOMContentLoaded", async function () {
    let datos = [];
    let paginaActual = 1;
    let totalPaginas = 1;
    const limit = 10;

    // Elementos del DOM
    const tablaBody = document.getElementById("tablaEstudiantesBody");
    const infoPaginacion = document.getElementById("infoPaginacion");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");
    
    // Filtros
    const inputDocumento = document.getElementById("buscarDocumento");
    const inputNombre = document.getElementById("buscarNombre");
    const inputEmail = document.getElementById("buscarEmail");
    const selectEstado = document.getElementById("filtroEstado");
    const btnLimpiar = document.getElementById("btnLimpiarFiltros");

    // Formulario Crear
    const formCrear = document.getElementById("formCrearEstudiante");
    
    // Formulario Editar
    const formEditar = document.getElementById("formEditarEstudiante");
    const btnGuardarCambios = document.getElementById("btnGuardarCambios");

    // Modal Eliminar
    const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");
    let estudianteIdAEliminar = null;

    // 1. Carga Inicial
    await cargarEstudiantes();

    // ==========================================
    // FUNCIONES PRINCIPALES
    // ==========================================

    async function cargarEstudiantes() {
        try {
            const params = new URLSearchParams();
            params.append("page", paginaActual);
            params.append("limit", limit);
            
            // Agregar filtros si existen
            if (inputDocumento.value) params.append("documento", inputDocumento.value.trim());
            if (inputNombre.value) params.append("nombre", inputNombre.value.trim());
            if (inputEmail.value) params.append("email", inputEmail.value.trim());
            if (selectEstado.value !== "") params.append("activo", selectEstado.value);

            const respuesta = await fetch(`/api/v1/estudiantes?${params.toString()}`);
            if (!respuesta.ok) throw new Error("Error al cargar estudiantes");
            
            const json = await respuesta.json();
            datos = json.data;
            totalPaginas = json.pagination.totalPages || 1;
            
            renderizarTabla();
            actualizarPaginacion();
        } catch (error) {
            console.error("Error:", error);
            // Si falla la API (porque aún no existe), podríamos usar el mock si existiera o mostrar error
            // mostrarError("No se pudo conectar con el servidor.");
        }
    }

    function renderizarTabla() {
        if (!tablaBody) return;
        tablaBody.innerHTML = "";

        if (datos.length === 0) {
            tablaBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No se encontraron estudiantes</td></tr>`;
            return;
        }

        datos.forEach(est => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${est.documento}</td>
                <td>
                    <div class="fw-medium">${est.apellido}, ${est.nombres}</div>
                </td>
                <td>${est.email}</td>
                <td>
                    <span class="badge ${est.activo ? 'text-bg-success-subtle text-success border-success-subtle' : 'text-bg-danger-subtle text-danger border-danger-subtle'} border">
                        ${est.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalDetalle" data-id="${est.id_estudiante}" title="Ver Detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalEditar" data-id="${est.id_estudiante}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger py-0 px-2" data-bs-toggle="modal" data-bs-target="#modalEliminar" data-id="${est.id_estudiante}" title="Dar de baja">
                            <i class="bi bi-person-x"></i>
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

    const inputsFiltro = [inputDocumento, inputNombre, inputEmail, selectEstado];
    inputsFiltro.forEach(input => {
        if (input) {
            input.addEventListener("input", () => {
                paginaActual = 1;
                cargarEstudiantes();
            });
        }
    });

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            document.getElementById("formFiltros").reset();
            paginaActual = 1;
            cargarEstudiantes();
        });
    }

    if (btnAnterior) {
        btnAnterior.addEventListener("click", () => {
            if (paginaActual > 1) {
                paginaActual--;
                cargarEstudiantes();
            }
        });
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                cargarEstudiantes();
            }
        });
    }

    // ==========================================
    // CRUD: CREAR
    // ==========================================
    if (formCrear) {
        formCrear.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const nuevoEstudiante = {
                documento: document.getElementById("nuevoDocumento").value.trim(),
                nombres: document.getElementById("nuevoNombre").value.trim(),
                apellido: document.getElementById("nuevoApellido").value.trim(),
                email: document.getElementById("nuevoEmail").value.trim(),
                fecha_nacimiento: document.getElementById("nuevaFechaNacimiento").value
            };

            try {
                setCargando("btnConfirmarCrear", "spinnerCrear", true, "Guardar estudiante");
                const response = await fetch('/api/v1/estudiantes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoEstudiante)
                });

                const resultado = await response.json();
                
                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalCrear')).hide();
                    formCrear.reset();
                    mostrarExito("El estudiante se ha registrado correctamente.");
                    await cargarEstudiantes();
                } else {
                    mostrarError(resultado.error || "No se pudo registrar el estudiante.");
                }
            } catch (error) {
                mostrarError("Error de conexión al registrar estudiante.");
            } finally {
                setCargando("btnConfirmarCrear", "spinnerCrear", false, "Guardar estudiante");
            }
        });
    }

    // ==========================================
    // CRUD: EDITAR
    // ==========================================
    const modalEditar = document.getElementById("modalEditar");
    if (modalEditar) {
        modalEditar.addEventListener("show.bs.modal", (event) => {
            const id = event.relatedTarget.dataset.id;
            const est = datos.find(e => e.id_estudiante == id);
            if (!est) return;

            document.getElementById("editarIdEstudiante").value = est.id_estudiante;
            document.getElementById("editarDocumento").value = est.documento;
            document.getElementById("editarNombre").value = est.nombres;
            document.getElementById("editarApellido").value = est.apellido;
            document.getElementById("editarEmail").value = est.email;
            document.getElementById("editarFechaNacimiento").value = est.fecha_nacimiento ? est.fecha_nacimiento.split("T")[0] : "";
            document.getElementById("editarActivo").value = est.activo;
        });
    }

    if (btnGuardarCambios) {
        btnGuardarCambios.addEventListener("click", async () => {
            const id = document.getElementById("editarIdEstudiante").value;
            const estudianteActualizado = {
                documento: document.getElementById("editarDocumento").value.trim(),
                nombres: document.getElementById("editarNombre").value.trim(),
                apellido: document.getElementById("editarApellido").value.trim(),
                email: document.getElementById("editarEmail").value.trim(),
                fecha_nacimiento: document.getElementById("editarFechaNacimiento").value,
                activo: Number(document.getElementById("editarActivo").value)
            };

            try {
                setCargando("btnGuardarCambios", "spinnerEditar", true, "Guardar cambios");
                const response = await fetch(`/api/v1/estudiantes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(estudianteActualizado)
                });

                const resultado = await response.json();

                if (response.ok) {
                    bootstrap.Modal.getInstance(modalEditar).hide();
                    mostrarExito("Datos actualizados correctamente.");
                    await cargarEstudiantes();
                } else {
                    mostrarError(resultado.error || "No se pudo actualizar el estudiante.");
                }
            } catch (error) {
                mostrarError("Error de conexión al actualizar estudiante.");
            } finally {
                setCargando("btnGuardarCambios", "spinnerEditar", false, "Guardar cambios");
            }
        });
    }

    // ==========================================
    // CRUD: ELIMINAR (Soft Delete)
    // ==========================================
    const modalEliminar = document.getElementById("modalEliminar");
    if (modalEliminar) {
        modalEliminar.addEventListener("show.bs.modal", (event) => {
            const id = event.relatedTarget.dataset.id;
            const est = datos.find(e => e.id_estudiante == id);
            if (!est) return;
            
            estudianteIdAEliminar = id;
            document.getElementById("nombreEstudianteAEliminar").textContent = `${est.apellido}, ${est.nombres}`;
        });
    }

    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.addEventListener("click", async () => {
            if (!estudianteIdAEliminar) return;

            try {
                setCargando("btnConfirmarEliminar", "spinnerEliminar", true, "Dar de baja");
                const response = await fetch(`/api/v1/estudiantes/${estudianteIdAEliminar}`, {
                    method: 'DELETE'
                });

                const json = await response.json();

                if (response.ok) {
                    bootstrap.Modal.getInstance(modalEliminar).hide();
                    mostrarExito("El estudiante ha sido dado de baja.");
                    await cargarEstudiantes();
                } else {
                    mostrarError(json.error || "No se pudo dar de baja al estudiante.");
                }
            } catch (error) {
                mostrarError("Error de conexión al eliminar estudiante.");
            } finally {
                setCargando("btnConfirmarEliminar", "spinnerEliminar", false, "Dar de baja");
                estudianteIdAEliminar = null;
            }
        });
    }

    // ==========================================
    // MÓDULO: VER DETALLE
    // ==========================================
    const modalDetalle = document.getElementById('modalDetalle');
    if (modalDetalle) {
        modalDetalle.addEventListener('show.bs.modal', event => {
            const id = event.relatedTarget.dataset.id;
            const est = datos.find(e => e.id_estudiante == id);
            if (!est) return;

            document.getElementById('detalleSubtitulo').textContent = `${est.apellido}, ${est.nombres}`;
            document.getElementById('detalleDocumento').textContent = est.documento;
            document.getElementById('detalleFechaNacimiento').textContent = est.fecha_nacimiento ? new Date(est.fecha_nacimiento).toLocaleDateString('es-AR') : 'No registrada';
            document.getElementById('detalleApellido').textContent = est.apellido;
            document.getElementById('detalleNombre').textContent = est.nombres;
            document.getElementById('detalleEmail').textContent = est.email;
            document.getElementById('detalleUltimaModificacion').textContent = est.fecha_hora_modificacion ? new Date(est.fecha_hora_modificacion).toLocaleString('es-AR') : 'Sin datos';
            
            document.getElementById('detalleEstado').innerHTML = `
                <span class="badge ${est.activo ? 'text-bg-success-subtle text-success border-success-subtle' : 'text-bg-danger-subtle text-danger border-danger-subtle'} border">
                    ${est.activo ? 'Activo' : 'Inactivo'}
                </span>
            `;
        });
    }

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

    function mostrarExito(mensaje) {
        document.getElementById("mensajeExito").textContent = mensaje;
        const modal = new bootstrap.Modal(document.getElementById('modalExito'));
        modal.show();
    }

    function mostrarError(mensaje) {
        document.getElementById("mensajeError").textContent = mensaje;
        const modal = new bootstrap.Modal(document.getElementById('modalError'));
        modal.show();
    }
});

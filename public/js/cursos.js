document.addEventListener("DOMContentLoaded", async function () {
    try{
        const respuesta = await fetch("js/cursos.json");
        const datos = await respuesta.json();
        
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
                    <span class="badge text-bg-success-subtle text-success border border-success-subtle">
                    ${curso.id_curso_estado}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group"
                    <!--Añadir botones que abran los dialog. Importante: esto se hace por el data-bs-target y toggle-->
                        <button
                            class="btn btn-outline-success py-0 px-2"
                            data-bs-toggle="modal"
                            data-bs-target="#modalDiploma"
                            data-id="curso.id_curso"
                            title="Generar Diploma"
                        >
                            <i class="bi bi-award"></i>
                        </button>
                        <button
                            class="btn btn-outline-primary py-0 px-2"
                            data-bs-toggle="modal"
                            data-bs-target="#modalDetalle"
                            data-id="curso.id_curso"
                            title="Ver Detalle"
                        >
                            <i class="bi bi-eye"></i>
                        </button>
                        <button
                            class="btn btn-outline-warning py-0 px-2"
                            data-bs-toggle=""
                            data-bs-target=""
                            data-id="curso.id_curso"
                            title="Editar Curso"
                        >
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button
                            class="btn btn-outline-danger py-0 px-2"
                            data-bs-toggle=""
                            data-bs-target=""
                            data-id="curso.id_curso"
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
        console.error("Error al cargar los cursos:", error);
    }
});

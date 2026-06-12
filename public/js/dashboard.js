async function getCursos() {
    const respuesta = await fetch("/api/v1/cursos");
    const json = await respuesta.json();
    return json.data || json;
}

async function getEstudiantes() {
    const respuesta = await fetch("/api/v1/estudiantes?activo=1");
    const json = await respuesta.json();
    return json.data || json;
}

document.addEventListener("DOMContentLoaded", async function () {

    try {
        const cursos = await getCursos();
        const estudiantes = await getEstudiantes();

        // Filtrás los activos una sola vez
        const cursosActivos = cursos.filter(c => c.estado === 1);

        // Totales
        document.getElementById("totalCursos").textContent = cursos.length;
        document.getElementById("totalEstudiantes").textContent = estudiantes.length;
        document.getElementById("totalCursosActivos").textContent = cursosActivos.length;

        // Tabla de cursos activos recientes
        const tbodyCursos = document.getElementById("tablaCursosActivosBody");
        tbodyCursos.innerHTML = "";

        cursosActivos.forEach(curso => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td class="fw-semibold font-monospace">${curso.id}</td>
                <td>${curso.nombre}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1" style="height:6px; max-width:180px;">
                            <div class="progress-bar bg-success" style="width:0%"></div>
                        </div>
                        <span class="text-secondary small">0/${curso.inscriptosMax}</span>
                    </div>
                </td>
                <td class="text-end">
                    <button class="btn btn-outline-secondary btn-sm">Ver Inscripciones</button>
                </td>
            `;
            tbodyCursos.appendChild(fila);
        });

    } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
    }

});
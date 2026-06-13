import { setupPaginaProtegida, apiFetch } from './auth.js';

document.addEventListener("DOMContentLoaded", async function () {
    if (!setupPaginaProtegida()) return;

    try {
        const [resCursos, resEstudiantes] = await Promise.all([
            apiFetch("/api/v1/cursos"),
            apiFetch("/api/v1/estudiantes?activo=1")
        ]);

        const jsonCursos = await resCursos.json();
        const jsonEstudiantes = await resEstudiantes.json();

        const cursos = jsonCursos.data || jsonCursos;
        const estudiantes = jsonEstudiantes.data || jsonEstudiantes;

        const cursosActivos = cursos.filter(c => c.estado === 1);

        document.getElementById("totalCursos").textContent = cursos.length;
        document.getElementById("totalEstudiantes").textContent = estudiantes.length;
        document.getElementById("totalCursosActivos").textContent = cursosActivos.length;

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

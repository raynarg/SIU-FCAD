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
                <td>${curso.id_curso_estado}</td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group" aria-label="Acciones curso">
                        <button type="button" class="btn btn-outline-success" title="Generar diploma">Diploma</button>
                        <button type="button" class="btn btn-outline-secondary" title="Ver">Ver</button>
                        <button type="button" class="btn btn-outline-secondary" title="Editar">Editar</button>
                        <button type="button" class="btn btn-outline-danger" title="Eliminar">Eliminar</button>
                    </div>
                </td>
            `;
            tabla.appendChild(fila);
        });
    } catch (error) {
        console.error("Error al cargar los cursos:", error);
    }
});

//FORMULARIO

const iniciar = () => {
    const btnCrearCurso = document.getElementById("btnCrearCurso");
    btnCrearCurso.addEventListener("click", () => {
        evt.preventDefault();
        evt.stopPropagation();
    });
}
document.addEventListener("DOMContentLoaded", iniciar);
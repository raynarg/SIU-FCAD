const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db'); // Mantenemos esto para que al arrancar te diga "Conexión exitosa"

const app = express();

// Middlewares necesarios para procesar datos de formularios y JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Esta línea hace que todo lo que pongas en la carpeta "public" se vea en el navegador
app.use(express.static('public'));

const PATH_JSON = path.join(__dirname, '..', 'public', 'js', 'cursos.json');

// Ruta para CREAR un curso
app.post('/api/cursos', (req, res) => {
    try {
        const nuevoCurso = req.body;
        
        // se lee el archivo actual
        const data = fs.readFileSync(PATH_JSON, 'utf-8');
        const cursos = JSON.parse(data);

        // genera el id y los campos automaticos
        nuevoCurso.id_curso = cursos.length > 0 ? Math.max(...cursos.map(c => c.id_curso)) + 1 : 1;
        nuevoCurso.fecha_hora_modificacion = new Date().toISOString();
        nuevoCurso.id_usuario_modificacion = "Usuario Admin"; // despues viene desde el logni

        // agrega al arrau y lo guarda
        cursos.push(nuevoCurso);
        fs.writeFileSync(PATH_JSON, JSON.stringify(cursos, null, 2));

        res.status(201).json({ mensaje: "Curso creado con éxito", curso: nuevoCurso });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al guardar el curso" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});
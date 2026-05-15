const express = require('express');
// Este import ya no hace falta: const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db'); // Mantenemos esto para que al arrancar te diga "Conexión exitosa"

const app = express();

// Middlewares necesarios para procesar datos de formularios y JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Esta línea hace que todo lo que pongas en la carpeta "public" se vea en el navegador
app.use(express.static(path.join(__dirname, '../public')));

//Esto no hace falta teniendo el express.static: const PATH_JSON = path.join(__dirname, '..', 'public', 'js', 'cursos.json');

//Ruta TRAER cursos de la BD
app.get('/api/cursos', async (req, res) =>{
    try{
        const resultado = await pool.query('SELECT c.* FROM cursos c JOIN cursos_estados ce ON c.id_curso_estado = ce.id_curso_estado WHERE ce.es_activo = 1');
        res.json(resultado.rows);
    }catch (error){
        res.status(500).json({ error: error.message })
    }
});

//Ruta CREAR curso con actualización en BD
app.post('/api/cursos', async (req, res) => {
    try{
    const { nombre, descripcion, fecha_inicio, cantidad_horas, inscriptos_max, id_curso_estado } = req.body;
    const resultado = await pool.query(
        'INSERT INTO cursos (nombre, descripcion, fecha_inicio, cantidad_horas, inscriptos_max, id_curso_estado, id_usuario_modificacion, fecha_hora_modificacion) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW()) RETURNING *', [nombre, descripcion, fecha_inicio, cantidad_horas, inscriptos_max, id_curso_estado]
    );
    res.status(201).json(resultado.rows[0])
    }catch (error){
        console.log(error);
        res.status(500).json({ error: error.message });
    };
});

/*
// Ruta (vieja) para CREAR un curso
app.post('/api/cursos', (req, res) => {
    try {
        const nuevoCurso = req.body;
        
        // se lee el archivo actual
        const data = fs.readFileSync(PATH_JSON, 'utf-8');
        const cursos = JSON.parse(data);

        // genera el id y los campos automaticos
        nuevoCurso.id_curso = cursos.length > 0 ? Math.max(...cursos.map(c => c.id_curso)) + 1 : 1;
        nuevoCurso.fecha_hora_modificacion = new Date().toISOString();
        nuevoCurso.id_usuario_modificacion = "Usuario Admin"; // despues viene desde el login

        // agrega al array y lo guarda
        cursos.push(nuevoCurso);
        fs.writeFileSync(PATH_JSON, JSON.stringify(cursos, null, 2));

        res.status(201).json({ mensaje: "Curso creado con éxito", curso: nuevoCurso });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al guardar el curso" });
    }
});
*/

app.get('/api/estudiantes', async (req, res) =>{
    try{
        const resultado = await pool.query('SELECT * FROM estudiantes WHERE activo = 1');
        res.json(resultado.rows);
    }catch (error){
        res.status(500).json({ error: error.message })
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});
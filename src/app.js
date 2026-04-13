const express = require('express');
require('dotenv').config();
const pool = require('./db'); // Mantenemos esto para que al arrancar te diga "Conexión exitosa"
const app = express();

// Esta línea hace que todo lo que pongas en la carpeta "public" se vea en el navegador
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});
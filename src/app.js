const express = require('express');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

// Ruta para probar que trae los cursos del integrador
app.get('/api/cursos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.cursos');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al conectar con la DB' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
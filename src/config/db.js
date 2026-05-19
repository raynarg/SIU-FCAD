import pg from 'pg';
import dotenv from 'dotenv';

const resultadoDotenv = dotenv.config();
console.log("Variables cargadas por dotenv:", resultadoDotenv);
console.log("El usuario que veo es:", process.env.DB_USER);
const { Pool } = pg;

export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.query('SELECT NOW()')
    .then(() => {
        console.log('Conexión a PostgreSQL exitosa');
    })
    .catch((err) => {
        console.error('Error en la base de datos:', err.stack);
    });

//prueba
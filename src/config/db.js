// ============================================================
//  src/config/db.js
//  Configuración de Base de Datos — Pool de conexiones PostgreSQL
//
//  Responsabilidades:
//    · Cargar variables de entorno desde .env (via dotenv)
//    · Crear y exportar el pool de conexiones reutilizables (pg.Pool)
//    · Verificar la conexión al inicio para detectar errores de configuración
//
//  El pool es importado directamente por el repository.
// ============================================================

import pg from 'pg';
import dotenv from 'dotenv';

// dotenv.config() debe ejecutarse antes de leer process.env
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
    user:     process.env.DB_USER,
    host:     process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:     process.env.DB_PORT,
});

pool.query('SELECT NOW()')
    .then(() => {
        console.log('Conexión a PostgreSQL exitosa');
    })
    .catch((err) => {
        console.error('Error en la base de datos:', err.stack);
    });

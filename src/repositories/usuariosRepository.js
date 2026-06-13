// ============================================================
//  src/repositories/usuariosRepository.js
//  Capa de Repositorio — Acceso a datos de la tabla usuarios
//
//  Responsabilidad única: ejecutar queries SQL sobre usuarios.
//  No aplica lógica de negocio (eso es trabajo del servicio).
// ============================================================

import { pool } from '../config/db.js'; // pool de conexiones a PostgreSQL

// ─────────────────────────────────────────────────────────────
//  Buscar usuario por nombre de usuario (para el proceso de login)
// ─────────────────────────────────────────────────────────────
/**
 * Retorna el registro completo del usuario (incluye la contraseña hasheada)
 * o `undefined` si no existe o está inactivo.
 *
 * @param {string} nombre_usuario - Nombre de usuario a buscar
 * @returns {Promise<object|undefined>}
 */
export async function findById(id) {
    const resultado = await pool.query(
        `SELECT id_usuario, apellido, nombre, nombre_usuario, contrasenia
         FROM usuarios
         WHERE id_usuario = $1
           AND activo = 1`,
        [id]
    );
    return resultado.rows[0];
}

export async function updatePassword(id, hashedPassword) {
    await pool.query(
        `UPDATE usuarios
         SET contrasenia = $1
         WHERE id_usuario = $2`,
        [hashedPassword, id]
    );
}

export async function findByUsername(nombre_usuario) {
    const resultado = await pool.query(
        `SELECT id_usuario, apellido, nombre, nombre_usuario, contrasenia
         FROM usuarios
         WHERE nombre_usuario = $1
           AND activo = 1`,
        [nombre_usuario]
    );

    return resultado.rows[0];
}

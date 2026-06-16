// ============================================================
//  src/repositories/usuariosRepository.js
//  Capa de Acceso a Datos — Queries SQL de la tabla usuarios
//
//  Responsabilidades:
//    · Ejecutar queries SQL contra la tabla usuarios en PostgreSQL
//    · Retornar filas crudas del modelo DB (sin transformar)
//
//  Funciones exportadas:
//    · findAll        — lista todos los usuarios activos (sin contraseña)
//    · findById       — un usuario por ID incluyendo contraseña (para auth)
//    · findByUsername — un usuario por nombre_usuario incluyendo contraseña (para login)
//    · create         — inserta un nuevo usuario activo
//    · update         — actualiza nombre, apellido y nombre_usuario
//    · updatePassword — actualiza solo la contraseña hasheada
//    · deactivate     — soft delete: marca activo = 0
//
//  Seguridad:
//    · findAll, create, update y deactivate NO retornan la columna `contrasenia`
//    · Solo findById y findByUsername la retornan, porque el service la necesita
//      para comparar hashes durante la autenticación
//
//  NO hace:
//    · Hashear contraseñas (delegado a authService y usuariosService)
//    · Aplicar reglas de negocio (delegado a los services)
// ============================================================

import { pool } from '../config/db.js';

// ─────────────────────────────────────────────────────────────
//  Listar todos los usuarios activos
// ─────────────────────────────────────────────────────────────
/**
 * Retorna todos los usuarios activos ordenados alfabéticamente.
 * No incluye la columna `contrasenia` por seguridad.
 *
 * @returns {Promise<object[]>} Array de filas con { id_usuario, apellido, nombre, nombre_usuario }
 */
export async function findAll() {
    const resultado = await pool.query(
        `SELECT id_usuario, apellido, nombre, nombre_usuario
         FROM usuarios
         WHERE activo = 1
         ORDER BY apellido ASC, nombre ASC`
    );
    return resultado.rows;
}

// ─────────────────────────────────────────────────────────────
//  Buscar usuario por ID (para verificación en cambio de contraseña)
// ─────────────────────────────────────────────────────────────
/**
 * Busca un usuario activo por su ID primario.
 * Incluye la columna `contrasenia` porque el service la necesita para
 * comparar el hash al validar la contraseña actual antes de cambiarla.
 *
 * @param {number} id - ID primario del usuario (id_usuario)
 * @returns {Promise<object|undefined>} Fila con contrasenia incluida, o undefined si no existe/inactivo
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

// ─────────────────────────────────────────────────────────────
//  Buscar usuario por nombre de usuario (para el proceso de login)
// ─────────────────────────────────────────────────────────────
/**
 * Busca un usuario activo por su nombre de usuario.
 * Incluye la columna `contrasenia` porque authService la necesita para
 * comparar el hash SHA-256 durante el proceso de login.
 * Retorna undefined si el usuario no existe o está inactivo.
 *
 * @param {string} nombre_usuario - Nombre de usuario a buscar
 * @returns {Promise<object|undefined>} Fila con contrasenia incluida, o undefined si no existe/inactivo
 */
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

// ─────────────────────────────────────────────────────────────
//  Insertar un nuevo usuario
// ─────────────────────────────────────────────────────────────
/**
 * Inserta un nuevo usuario activo y retorna sus datos sin la contraseña.
 * El campo `activo = 1` se hardcodea: todo usuario nuevo comienza activo.
 * La contraseña recibida ya debe estar hasheada (el service la hashea antes).
 *
 * @param {object} params
 * @param {string} params.nombre          - Nombre del usuario
 * @param {string} params.apellido        - Apellido del usuario
 * @param {string} params.nombre_usuario  - Nombre de usuario único
 * @param {string} params.contrasenia     - Contraseña ya hasheada (SHA-256)
 * @returns {Promise<object>} Fila con { id_usuario, nombre, apellido, nombre_usuario } (sin contrasenia)
 */
export async function create({ nombre, apellido, nombre_usuario, contrasenia }) {
    const resultado = await pool.query(
        `INSERT INTO usuarios (nombre, apellido, nombre_usuario, contrasenia, activo)
         VALUES ($1, $2, $3, $4, 1)
         RETURNING id_usuario, nombre, apellido, nombre_usuario`,
        [nombre, apellido, nombre_usuario, contrasenia]
    );
    return resultado.rows[0];
}

// ─────────────────────────────────────────────────────────────
//  Actualizar datos de perfil de un usuario
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza nombre, apellido y nombre_usuario de un usuario activo.
 * No modifica la contraseña — para eso existe `updatePassword`.
 * La condición `activo = 1` impide editar usuarios dados de baja.
 *
 * @param {number} id                       - ID del usuario a actualizar
 * @param {object} params
 * @param {string} params.nombre            - Nuevo nombre
 * @param {string} params.apellido          - Nuevo apellido
 * @param {string} params.nombre_usuario    - Nuevo nombre de usuario
 * @returns {Promise<object>} Fila actualizada con { id_usuario, nombre, apellido, nombre_usuario }
 */
export async function update(id, { nombre, apellido, nombre_usuario }) {
    const resultado = await pool.query(
        `UPDATE usuarios
         SET nombre          = $1,
             apellido        = $2,
             nombre_usuario  = $3
         WHERE id_usuario = $4
           AND activo = 1
         RETURNING id_usuario, nombre, apellido, nombre_usuario`,
        [nombre, apellido, nombre_usuario, id]
    );
    return resultado.rows[0];
}

// ─────────────────────────────────────────────────────────────
//  Actualizar contraseña de un usuario
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza solo la columna `contrasenia` de un usuario activo.
 * La contraseña recibida ya debe estar hasheada (el service la hashea antes).
 * La condición `activo = 1` impide actualizar usuarios dados de baja.
 *
 * @param {number} id             - ID del usuario
 * @param {string} hashedPassword - Nueva contraseña ya hasheada (SHA-256)
 * @returns {Promise<void>}
 */
export async function updatePassword(id, hashedPassword) {
    await pool.query(
        `UPDATE usuarios
         SET contrasenia = $1
         WHERE id_usuario = $2
           AND activo = 1`,
        [hashedPassword, id]
    );
}

// ─────────────────────────────────────────────────────────────
//  Soft delete — desactivar un usuario
// ─────────────────────────────────────────────────────────────
/**
 * Desactiva un usuario marcando activo = 0. No borra el registro.
 * No aplica guarda de estado activo porque el controller ya verificó
 * que no sea el propio administrador antes de llamar a este método.
 *
 * @param {number} id - ID del usuario a desactivar
 * @returns {Promise<object>} Fila con { id_usuario } del usuario desactivado (RETURNING)
 */
export async function deactivate(id) {
    const resultado = await pool.query(
        `UPDATE usuarios
         SET activo = 0
         WHERE id_usuario = $1
         RETURNING id_usuario`,
        [id]
    );
    return resultado.rows[0];
}

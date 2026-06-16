// ============================================================
//  src/services/usuariosService.js
//  Capa de Servicio — Lógica de negocio del módulo Usuarios (admin)
//
//  Responsabilidades:
//    · Verificar unicidad de nombre_usuario antes de crear o editar
//    · Hashear contraseñas con SHA-256 antes de persistirlas
//    · Lanzar errores con statusCode para que el errorHandler los capture
//
//  Funciones exportadas:
//    · listarUsuarios        — retorna todos los usuarios activos
//    · registrarUsuario      — crea con validación de nombre único y hash de contraseña
//    · editarUsuario         — actualiza datos de perfil con validación de nombre único
//    · cambiarPasswordUsuario — actualiza la contraseña hasheada (reset por admin)
//    · darDeBajaUsuario      — soft delete del usuario
//
//  NO hace:
//    · Conocer req/res (delegado al controller)
//    · Ejecutar SQL directamente (delegado a usuariosRepository)
//    · Verificar la contraseña actual antes del cambio (eso lo hace authService)
// ============================================================

import crypto from 'crypto';
import * as repo from '../repositories/usuariosRepository.js';

// Helper interno: genera el hash SHA-256 de un texto.
// Se usa para hashear contraseñas antes de persistirlas en la BD.
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// ─────────────────────────────────────────────────────────────
//  listarUsuarios — retorna todos los usuarios activos
// ─────────────────────────────────────────────────────────────
/**
 * Retorna la lista completa de usuarios activos del sistema.
 * Delega directamente al repository sin lógica adicional.
 *
 * @returns {Promise<object[]>} Array de usuarios sin la columna contrasenia
 */
export async function listarUsuarios() {
    return await repo.findAll();
}

// ─────────────────────────────────────────────────────────────
//  registrarUsuario — crea un nuevo usuario
// ─────────────────────────────────────────────────────────────
/**
 * Valida que el nombre de usuario no esté en uso y crea el nuevo usuario
 * con la contraseña hasheada.
 *
 * Reglas de negocio aplicadas:
 *   1. El nombre_usuario debe ser único en el sistema.
 *
 * @param {object} params
 * @param {string} params.nombre          - Nombre del usuario
 * @param {string} params.apellido        - Apellido del usuario
 * @param {string} params.nombre_usuario  - Nombre de usuario único
 * @param {string} params.contrasenia     - Contraseña en texto plano (se hashea antes de persistir)
 * @returns {Promise<object>} Datos del usuario creado (sin contraseña)
 * @throws {Error} 400 si el nombre de usuario ya está en uso
 */
export async function registrarUsuario({ nombre, apellido, nombre_usuario, contrasenia }) {
    // Regla 1: verificar unicidad del nombre de usuario antes de insertar
    const existente = await repo.findByUsername(nombre_usuario);
    if (existente) {
        const error = new Error('El nombre de usuario ya está en uso');
        error.statusCode = 400;
        throw error;
    }

    // Hashear la contraseña antes de persistirla; nunca se guarda en texto plano
    return await repo.create({
        nombre,
        apellido,
        nombre_usuario,
        contrasenia: sha256(contrasenia),
    });
}

// ─────────────────────────────────────────────────────────────
//  editarUsuario — actualiza datos de perfil
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza nombre, apellido y nombre_usuario de un usuario existente.
 * Si se cambia el nombre_usuario, verifica que no esté tomado por otro usuario.
 *
 * Reglas de negocio aplicadas:
 *   1. Si se envía nombre_usuario, debe ser único (excluyendo al propio usuario).
 *   2. El usuario debe existir y estar activo (lo garantiza el repository).
 *
 * @param {number|string} id    - ID del usuario a editar
 * @param {object}        datos - Campos a actualizar (nombre, apellido, nombre_usuario)
 * @returns {Promise<object>} Datos del usuario actualizado (sin contraseña)
 * @throws {Error} 400 si el nombre de usuario ya está en uso por otro usuario
 * @throws {Error} 404 si el usuario no existe o está inactivo
 */
export async function editarUsuario(id, datos) {
    if (datos.nombre_usuario) {
        // Verificar si el nombre_usuario ya pertenece a OTRO usuario distinto al que se edita.
        // Se compara con parseInt(id) porque findByUsername retorna id_usuario como número.
        const existente = await repo.findByUsername(datos.nombre_usuario);
        if (existente && existente.id_usuario !== parseInt(id)) {
            const error = new Error('El nombre de usuario ya está en uso');
            error.statusCode = 400;
            throw error;
        }
    }

    // El repository aplica AND activo = 1; si el usuario no existe o está inactivo,
    // update() retorna undefined y lanzamos 404
    const actualizado = await repo.update(id, datos);
    if (!actualizado) {
        const error = new Error('Usuario no encontrado o inactivo');
        error.statusCode = 404;
        throw error;
    }
    return actualizado;
}

// ─────────────────────────────────────────────────────────────
//  cambiarPasswordUsuario — reset de contraseña por admin
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza la contraseña de un usuario sin verificar la contraseña actual.
 * Esta función es de uso exclusivo del administrador (reset forzado).
 * Para el cambio propio del usuario autenticado, ver authService.cambiarContrasenia.
 *
 * @param {number|string} id              - ID del usuario al que se le resetea la contraseña
 * @param {string}        contraseniaNueva - Nueva contraseña en texto plano (se hashea antes de persistir)
 * @returns {Promise<void>}
 */
export async function cambiarPasswordUsuario(id, contraseniaNueva) {
    // Hashear la nueva contraseña antes de persistirla
    await repo.updatePassword(id, sha256(contraseniaNueva));
}

// ─────────────────────────────────────────────────────────────
//  darDeBajaUsuario — soft delete del usuario
// ─────────────────────────────────────────────────────────────
/**
 * Desactiva un usuario (soft delete: activo → 0).
 * Lanza 404 si el usuario no existe o ya estaba desactivado.
 * La guarda de auto-protección (no desactivarse a uno mismo) la aplica el controller.
 *
 * @param {number|string} id - ID del usuario a desactivar
 * @returns {Promise<object>} Fila con { id_usuario } del usuario desactivado
 * @throws {Error} 404 si el usuario no existe o ya estaba desactivado
 */
export async function darDeBajaUsuario(id) {
    const desactivado = await repo.deactivate(id);
    if (!desactivado) {
        const error = new Error('Usuario no encontrado o ya desactivado');
        error.statusCode = 404;
        throw error;
    }
    return desactivado;
}

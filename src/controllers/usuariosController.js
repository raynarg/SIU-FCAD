// ============================================================
//  src/controllers/usuariosController.js
//  Capa de Controlador — HTTP handlers del módulo Usuarios (admin)
//
//  Responsabilidades:
//    · Extraer datos de req (params, body)
//    · Validar presencia de campos obligatorios antes de llamar al service
//    · Llamar al servicio correspondiente
//    · Retornar la respuesta HTTP con el status code correcto
//    · Delegar errores al errorHandler mediante next(error)
//
//  Handlers exportados:
//    · listar        — GET    /api/v1/usuarios
//    · crear         — POST   /api/v1/usuarios
//    · actualizar    — PUT    /api/v1/usuarios/:id
//    · resetPassword — PUT    /api/v1/usuarios/:id/reset-password
//    · desactivar    — DELETE /api/v1/usuarios/:id
//
//  Acceso restringido: todas las rutas requieren JWT + rol admin
//  (doble guarda aplicada en app.js con authMiddleware + adminMiddleware).
//
//  NO hace:
//    · Lógica de negocio como hashing de contraseñas (delegada a usuariosService)
//    · Acceso a la base de datos (delegado a usuariosRepository)
// ============================================================

import * as service from '../services/usuariosService.js';

// ─────────────────────────────────────────────────────────────
//  B R O W S E  — GET /api/v1/usuarios
// ─────────────────────────────────────────────────────────────
/**
 * Retorna la lista completa de usuarios del sistema (sin paginación).
 *
 * @param {import('express').Request}      req  - Express request
 * @param {import('express').Response}     res  - Express response
 * @param {import('express').NextFunction} next - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, data: UsuarioDTO[] }
 */
export async function listar(req, res, next) {
    try {
        const lista = await service.listarUsuarios();
        res.json({ success: true, data: lista });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  A D D  — POST /api/v1/usuarios
// ─────────────────────────────────────────────────────────────
/**
 * Crea un nuevo usuario administrativo con contraseña hasheada.
 * Valida manualmente la presencia de todos los campos requeridos antes
 * de delegar al service (este endpoint no usa express-validator).
 *
 * @param {import('express').Request}      req                        - Express request
 * @param {string}                         req.body.nombre            - Nombre del usuario
 * @param {string}                         req.body.apellido          - Apellido del usuario
 * @param {string}                         req.body.nombre_usuario    - Nombre de usuario único
 * @param {string}                         req.body.contrasenia       - Contraseña en texto plano (el service la hashea)
 * @param {import('express').Response}     res                        - Express response
 * @param {import('express').NextFunction} next                       - Pasa errores al errorHandler
 * @returns {Promise<void>} 201 { success: true, data: UsuarioDTO } o 400 si faltan campos
 */
export async function crear(req, res, next) {
    try {
        const { nombre, apellido, nombre_usuario, contrasenia } = req.body;

        // Validación manual de presencia: este endpoint no pasa por express-validator,
        // por lo que la verificación de campos se hace aquí mismo en el controller.
        if (!nombre || !apellido || !nombre_usuario || !contrasenia) {
            return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
        }

        const nuevo = await service.registrarUsuario({ nombre, apellido, nombre_usuario, contrasenia });
        res.status(201).json({ success: true, data: nuevo });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  E D I T  — PUT /api/v1/usuarios/:id
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza los datos de un usuario existente (excluye contraseña).
 * Para cambiar la contraseña existe el endpoint específico `resetPassword`.
 *
 * @param {import('express').Request}      req                     - Express request
 * @param {string}                         req.params.id           - ID del usuario a actualizar
 * @param {string}                         req.body.nombre         - Nombre del usuario
 * @param {string}                         req.body.apellido       - Apellido del usuario
 * @param {string}                         req.body.nombre_usuario - Nombre de usuario único
 * @param {import('express').Response}     res                     - Express response
 * @param {import('express').NextFunction} next                    - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, data: UsuarioDTO } o 400 si faltan campos
 */
export async function actualizar(req, res, next) {
    try {
        const { id } = req.params;
        const { nombre, apellido, nombre_usuario } = req.body;

        // Validación manual de presencia: todos los campos de perfil son obligatorios.
        if (!nombre || !apellido || !nombre_usuario) {
            return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
        }

        const actualizado = await service.editarUsuario(id, { nombre, apellido, nombre_usuario });
        res.json({ success: true, data: actualizado });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  RESET PASSWORD  — PUT /api/v1/usuarios/:id/reset-password
// ─────────────────────────────────────────────────────────────
/**
 * Permite al administrador resetear la contraseña de cualquier usuario.
 * A diferencia de `cambiarContrasenia` (authController), aquí no se requiere
 * la contraseña actual: el admin tiene potestad para forzar el cambio.
 *
 * @param {import('express').Request}      req                       - Express request
 * @param {string}                         req.params.id             - ID del usuario al que se le resetea la contraseña
 * @param {string}                         req.body.contrasenia_nueva - Nueva contraseña (mín. 4 caracteres)
 * @param {import('express').Response}     res                       - Express response
 * @param {import('express').NextFunction} next                      - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, message } o 400 si la contraseña es inválida
 */
export async function resetPassword(req, res, next) {
    try {
        const { id } = req.params;
        const { contrasenia_nueva } = req.body;

        // Política mínima para reset admin: 4 caracteres (más permisiva que el
        // cambio propio en authController que exige 6).
        if (!contrasenia_nueva || contrasenia_nueva.length < 4) {
            return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 4 caracteres' });
        }

        await service.cambiarPasswordUsuario(id, contrasenia_nueva);
        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────
//  D E L E T E  — DELETE /api/v1/usuarios/:id
// ─────────────────────────────────────────────────────────────
/**
 * Desactiva un usuario (soft delete / baja lógica).
 * Incluye una guarda de auto-protección: el administrador autenticado
 * no puede desactivar su propia cuenta para evitar quedar sin acceso al sistema.
 *
 * @param {import('express').Request}      req           - Express request
 * @param {string}                         req.params.id - ID del usuario a desactivar
 * @param {import('express').Response}     res           - Express response
 * @param {import('express').NextFunction} next          - Pasa errores al errorHandler
 * @returns {Promise<void>} 200 { success: true, message } o 400 si intenta desactivarse a sí mismo
 */
export async function desactivar(req, res, next) {
    try {
        const { id } = req.params;

        // Guarda de auto-protección: comparar el ID del parámetro con el del usuario
        // autenticado (req.user.id inyectado por authMiddleware). Se parsea a entero
        // porque req.params.id llega como string desde la URL.
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ success: false, error: 'No puedes desactivar tu propia cuenta de administrador' });
        }

        await service.darDeBajaUsuario(id);
        res.json({ success: true, message: 'Usuario dado de baja correctamente' });
    } catch (error) {
        next(error);
    }
}

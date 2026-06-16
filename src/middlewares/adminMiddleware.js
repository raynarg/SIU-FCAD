// ============================================================
//  src/middlewares/adminMiddleware.js
//  Middleware de Autorización — Rol Administrador
//
//  Responsabilidades:
//    · Verificar que el usuario autenticado tenga privilegios de administrador
//    · Comparar req.user.nombre_usuario contra ADMIN_USERNAME del .env
//    · Si no es admin: cortar el pipeline y responder 403 Forbidden
//    · Si es admin: delegar al siguiente middleware o controlador
//
//  Dependencias de orden:
//    · DEBE ejecutarse DESPUÉS de authMiddleware, ya que depende de req.user
//      que authMiddleware inyecta en el pipeline. Si se invierte el orden,
//      req.user estará vacío y todo request será rechazado con 403.
//
//  Uso en app.js:
//    app.use('/api/v1/usuarios', authMiddleware, adminMiddleware, usuariosRouter)
//
//  NO hace:
//    · Verificar la validez o expiración del JWT (eso lo hace authMiddleware)
//    · Consultar la base de datos para resolver el rol (el rol viene en req.user)
// ============================================================

/**
 * Middleware Express que restringe el acceso a usuarios administradores.
 * Compara `req.user.nombre_usuario` contra la variable de entorno
 * `ADMIN_USERNAME` (por defecto: 'admin').
 *
 * Regla de negocio: solo existe un administrador identificado por nombre de
 * usuario; cualquier otro usuario autenticado recibe 403 Forbidden.
 *
 * @param {import('express').Request}      req  - Express request; debe tener
 *   `req.user` poblado por authMiddleware con al menos { nombre_usuario }
 * @param {import('express').Response}     res  - Express response
 * @param {import('express').NextFunction}  next - Siguiente middleware o controlador
 * @returns {void}
 */
export function adminMiddleware(req, res, next) {
    // Leer el nombre de usuario admin desde .env para no hardcodear el valor.
    // El fallback 'admin' garantiza funcionamiento si la variable no está definida.
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    // Si req.user no existe (authMiddleware no corrió) o el usuario no es admin,
    // responder 403: el recurso existe pero el usuario no tiene permisos suficientes.
    if (!req.user || req.user.nombre_usuario !== adminUsername) {
        return res.status(403).json({
            success: false,
            error: 'Acceso denegado: se requieren privilegios de administrador'
        });
    }

    // Usuario autenticado y con rol admin → continuar al siguiente handler
    next();
}

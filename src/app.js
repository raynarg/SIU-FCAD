// ============================================================
//  src/app.js
//  Punto de entrada de la aplicación Express
//
//  Responsabilidades:
//    · Inicializar y configurar la instancia de Express
//    · Aplicar middlewares globales de seguridad, parseo y archivos estáticos
//    · Registrar todas las rutas versionadas de la API (/api/v1/...)
//    · Montar la documentación interactiva (Swagger UI en /api-docs)
//    · Registrar el manejador de errores global al final de la cadena
//
//  Rutas registradas:
//    POST /api/v1/auth/**             — autenticación pública (sin JWT)
//    GET|POST|PUT|DELETE /api/v1/cursos/**        — requiere JWT válido
//    GET|POST|PUT|DELETE /api/v1/estudiantes/**   — requiere JWT válido
//    GET|POST|PUT|DELETE /api/v1/inscripciones/** — requiere JWT válido
//    GET|POST|PUT|DELETE /api/v1/usuarios/**      — requiere JWT + rol admin
//
//  NO hace:
//    · Lógica de negocio (delegada a services)
//    · Validación de datos (delegada a middlewares/validators)
//    · Acceso a la base de datos (delegado a repositories)
//
//  Inicialización en orden:
//    1. Seguridad HTTP  (helmet + cors)
//    2. Parseo de body  (JSON y urlencoded)
//    3. Archivos estáticos (carpeta /public)
//    4. Documentación Swagger UI
//    5. Rutas versionadas de la API (/api/v1/...)
//    6. Manejador de errores global (siempre al final)
// ============================================================

import { pool } from './config/db.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import cursosRouter from './routes/cursosRoutes.js';
import estudiantesRouter from './routes/estudiantesRoutes.js';
import inscripcionesRouter from './routes/inscripcionesRoutes.js';
import authRouter from './routes/authRoutes.js';
import usuariosRouter from './routes/usuariosRoutes.js';
import { authMiddleware } from './middlewares/authMiddleware.js';
import { adminMiddleware } from './middlewares/adminMiddleware.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Seguridad HTTP ────────────────────────────────────────────
// helmet agrega headers de seguridad por defecto.
// La CSP personalizada permite cargar assets externos necesarios
// para la documentación interactiva (Swagger UI vía cdn.jsdelivr.net
// y fuentes de Google Fonts).
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src":  ["'self'", "cdn.jsdelivr.net"],
            "style-src":   ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
            "font-src":    ["'self'", "fonts.gstatic.com", "cdn.jsdelivr.net"],
            "img-src":     ["'self'", "data:", "cdn.jsdelivr.net"],
            "connect-src": ["'self'", "cdn.jsdelivr.net"],
        },
    },
}));
app.use(cors());

// ── Parseo de body ────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos ────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Documentación Swagger ──────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Rutas de la API ──────────────────────────────────────────
// Las rutas de auth son públicas: login y registro no requieren JWT.
// El resto de los recursos exige authMiddleware para verificar el token
// en cada request; usuarios además exige adminMiddleware (rol admin).
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/cursos', authMiddleware, cursosRouter);
app.use('/api/v1/estudiantes', authMiddleware, estudiantesRouter);
app.use('/api/v1/inscripciones', authMiddleware, inscripcionesRouter);
// Solo administradores pueden gestionar usuarios (doble guarda: JWT + rol)
app.use('/api/v1/usuarios', authMiddleware, adminMiddleware, usuariosRouter);

// ── Manejador de errores global ───────────────────────────────
// Debe registrarse después de todas las rutas para capturar cualquier
// error propagado con next(err) desde controllers, services o middlewares.
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});

export default app;

// ============================================================
//  src/app.js
//  Punto de entrada de la aplicación Express
//
//  Inicialización en orden:
//    1. Seguridad HTTP  (helmet + cors)
//    2. Parseo de body  (JSON y urlencoded)
//    3. Archivos estáticos (carpeta /public)
//    4. Rutas versionadas de la API (/api/v1/...)
//    5. Manejador de errores global (siempre al final)
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

// ── Rutas de la API (versionadas) ────────────────────────────
app.use('/api/v1/cursos', cursosRouter);
app.use('/api/v1/estudiantes', estudiantesRouter);
app.use('/api/v1/inscripciones', inscripcionesRouter);

// Manejador de errores global — siempre va al final
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});

export default app;

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import cursosRouter from './routes/cursosRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
            "font-src": ["'self'", "fonts.gstatic.com", "cdn.jsdelivr.net"],
            "img-src": ["'self'", "data:", "cdn.jsdelivr.net"],
            "connect-src": ["'self'", "cdn.jsdelivr.net"],
        },
    },
}));
app.use(cors());

// Parseo de body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API (con versión)
app.use('/api/v1/cursos', cursosRouter);

// Manejador de errores global — siempre va al final
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});

export default app;
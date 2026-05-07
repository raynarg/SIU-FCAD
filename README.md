# integrador_prog4
Proyecto final integrador de la materia Programación 4 de la UNER FCAD. Aplicación WEB para sistema de inscripciones.

## Estructura de Carpetas

El proyecto sigue una estructura típica para un stack Node.js con Express, separando claramente el frontend y el backend:

- **public/**: Contiene los archivos estáticos del frontend.
  - **js/**: Archivos JavaScript del cliente (ej. `cursos.js`).
  - **css/**: Hojas de estilo (ej. `admin-layout.css`, `auth.css`).
  - **components/**: Componentes reutilizables (ej. `Sidebar.txt`).
  - Archivos HTML principales (ej. `index.html`, `dashboard.html`, etc.).

- **api/**: Contiene el código del backend (servidor Express). Nota: Considera renombrar a `backend/` o `server/` para mayor claridad, ya que "api" podría confundirse con rutas específicas de API.
  - **app.js**: Punto de entrada del servidor.
  - **config/**: Archivos de configuración, incluyendo la conexión a la base de datos (`db.js`). Esta ubicación es apropiada para mantener las configuraciones centralizadas.
  - **controllers/**: Lógica de controladores para manejar las solicitudes.
  - **middlewares/**: Middlewares personalizados.
  - **routes/**: Definición de rutas de la API.

- **prototipo/**: Archivos relacionados con prototipos o versiones preliminares.

- **dump_bd.txt**: Archivo de volcado de la base de datos.

- **package.json**: Archivo de configuración de dependencias de Node.js.

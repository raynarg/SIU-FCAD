# integrador_prog4
Proyecto final integrador de la materia Programación 4 de la UNER FCAD. Aplicación WEB para sistema de inscripciones.

## Estructura de Carpetas

El proyecto sigue una estructura típica para un stack Node.js con Express, separando claramente el frontend y el backend:

**integrador_prog4/**
```text
├── public/                # Frontend (Vainilla JS, HTML, CSS)
│   ├── css/               # Hojas de estilo (Bootstrap personalizado y layouts)
│   ├── js/                # Lógica del lado del cliente y archivos de datos
│   └── *.html             # Vistas de la aplicación (Dashboard, Cursos, Estudiantes)
├── src/                   # Backend (Node.js/Express)
│   ├── config/            # Configuración de base de datos y entorno
│   ├── controllers/       # Controladores (manejo de peticiones HTTP)
│   ├── dtos/              # Objetos de Transferencia de Datos (DTOs)
│   ├── middlewares/       # Funciones intermedias (validación, errores)
│   ├── repositories/      # Capa de acceso a datos (consultas SQL)
│   ├── routes/            # Definición de rutas de la API
│   ├── services/          # Capa de servicios (lógica de negocio)
│   └── app.js             # Punto de entrada de la aplicación
├── .env                   # Variables de entorno (no incluido en git)
├── .gitignore             # Archivos y carpetas ignorados por git
├── package.json           # Dependencias y scripts del proyecto
└── README.md              # Documentación del proyecto
```

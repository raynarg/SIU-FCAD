# integrador_prog4
Proyecto final integrador de la materia Programación 4 de la UNER FCAD. Aplicación WEB para sistema de inscripciones.

## Estructura de Carpetas

El proyecto sigue una estructura típica para un stack Node.js con Express, separando claramente el frontend y el backend:

**integrador_prog4/**
├── node_modules/
├── public/                # Carpeta frontend (Vanilla JS)
│   ├── css/
│   ├── js/
│   ├── components/
│   └── *.html
├── src/                   # Carpeta backend (Node/Express)
│   ├── config/            # Configuración (.env, base de datos)
│   ├── controllers/       # Lógica de controladores
│   ├── middlewares/       # Middlewares personalizados
│   ├── routes/            # Definición de rutas API
│   └── app.js             # Punto de entrada del servidor
├── .env                   # Variables de entorno
├── .gitignore
├── package.json
└── README.md

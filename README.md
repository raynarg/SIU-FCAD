# integrador_prog4
Proyecto final integrador de la materia Programación 4 de la UNER FCAD. Aplicación WEB para sistema de inscripciones.

## Estructura de Carpetas

El proyecto sigue una estructura típica para un stack Node.js con Express, separando claramente el frontend y el backend:

**integrador_prog4/**
```text
├── public/                # Frontend (Vanilla JS)
│   ├── css/               # Estilos globales y módulos
│   ├── js/                # Lógica del cliente
│   ├── components/        # Componentes reutilizables de UI
│   └── *.html             # Vistas de la aplicación
├── src/                   # Backend (Node/Express)
│   ├── config/            # Configuración (.env, DB)
│   ├── controllers/       # Lógica de negocio (Controladores)
│   ├── middlewares/       # Validaciones y filtros
│   ├── routes/            # Definición de end-points (API)
│   └── app.js             # Punto de entrada del servidor
├── .env                   # Variables sensibles
├── .gitignore             # Archivos ignorados por Git
├── package.json           # Dependencias y scripts
└── README.md              # Documentación
```
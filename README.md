# SIU-FCAD

Proyecto final integrador de la materia Programación 4 de la UNER FCAD. Aplicación WEB para la gestión de inscripciones, cursos y estudiantes.



## Tecnologías utilizadas

- **Backend:** Node.js, Express.js (v5.x)
- **Base de Datos:** PostgreSQL
- **Seguridad:** Helmet, CORS, Express-validator
- **Frontend:** HTML5, CSS3 (Bootstrap), JavaScript Vanilla

## Requisitos previos

- [Node.js](https://nodejs.org/) (versión 18.11.0 o superior para soporte de `--watch`)
- [PostgreSQL](https://www.postgresql.org/) instalado y en ejecución

## Instalación

1. Clona el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd integrador_prog4
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   Copia el archivo de ejemplo y completa tus credenciales:
   ```bash
   cp .env.example .env
   ```

## Ejecución

Para iniciar el servidor en producción:
```bash
npm start
```

Para modo desarrollo (con reinicio automático al detectar cambios):
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`.

## Documentación de la API

La API cuenta con documentación interactiva generada con Swagger UI.

- **URL de acceso:** `http://localhost:3000/api-docs`
- **Generación de esquema estático:** Para generar el archivo `swagger.json` actualizado, ejecute:
  ```bash
  npm run swagger-gen
  ```

## Estructura de Carpetas

El proyecto sigue una estructura modular separando claramente el frontend y el backend:

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

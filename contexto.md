# Contexto del Proyecto: Sistema de Inscripciones FCAD-UNER

## Objetivo General
Desarrollar un sistema administrativo web para la gestión de alumnos, cursos e inscripciones de la facultad. 

## Stack Tecnológico (Estricto)
- **Backend:** Node.js, Express.
- **Base de Datos:** PostgreSQL (usando la librería `pg` con Pool de conexiones).
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla - SIN React, SIN jQuery).
- **Framework CSS:** Bootstrap 5 (CDN).

## Arquitectura del Proyecto
El proyecto respeta una separación estricta entre cliente y servidor:
- `/public`: Archivos estáticos del frontend (HTML, CSS, JS del cliente). Express los sirve usando `app.use(express.static('public'))`.
- `/src`: Lógica del backend (`app.js`, `db.js`, rutas, controladores).
- `.env`: Variables de entorno (DB_USER, DB_PASS, PORT). NO SE SUBE AL REPO.

## Requisitos Funcionales Clave
1. **Login:** Acceso exclusivo para personal administrativo.
2. **Dashboard:** Panel principal con tarjetas de resumen (totales).
3. **BREAD de Estudiantes:** Browse (Listar con paginación/buscador), Read, Edit, Add, Delete (Debe ser SOFT DELETE, actualizando el campo `activo = 0`).
4. **BREAD de Cursos:** Misma lógica que estudiantes.
5. **Inscripciones:** Vincular estudiantes con cursos validando cupos.

---

## Consigna Oficial / PDF del Trabajo Práctico
[PEGAR AQUÍ EL TEXTO DEL PDF O LAS CONSIGNAS EXACTAS DEL PROFESOR]

---

## Instrucciones para el Asistente AI (Copilot)
- Priorizar código limpio, modular y comentado.
- Al generar HTML, utilizar siempre clases nativas de Bootstrap 5 para el diseño responsivo.
- Al generar SQL, tener en cuenta la estructura de PostgreSQL.
- No sugerir librerías frontend adicionales, mantenerse en Vanilla JS.
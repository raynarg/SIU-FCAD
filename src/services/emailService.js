// ============================================================
//  src/services/emailService.js
//  Capa de Servicio — Envío de emails transaccionales (nodemailer)
//
//  Responsabilidades:
//    · Configurar el transporte SMTP con las credenciales del .env
//    · Construir y enviar el HTML del email de confirmación de inscripción
//
//  Variables de entorno requeridas:
//    SMTP_HOST — servidor SMTP (ej.: smtp.gmail.com)
//    SMTP_PORT — puerto SMTP (ej.: 587 para TLS, 465 para SSL)
//    SMTP_USER — dirección de correo remitente
//    SMTP_PASS — contraseña o app password del remitente
//
//  Patrón de uso (fire-and-forget desde inscripcionesService):
//    sendConfirmacionInscripcion(dto).catch(err => console.warn(...))
//    Un error en el envío no debe interrumpir ni revertir la operación principal.
//
//  NO hace:
//    · Lógica de negocio ni validaciones de datos (delegado a inscripcionesService)
//    · Persistir ni leer registros de la BD
//    · Reintentar envíos fallidos (responsabilidad del servicio SMTP externo)
// ============================================================

import nodemailer from 'nodemailer';

// Crear el transporte SMTP reutilizable una sola vez al iniciar el módulo.
// Las credenciales se leen del .env para no hardcodearlas en el código.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// ─────────────────────────────────────────────────────────────
//  sendConfirmacionInscripcion — email de bienvenida al curso
// ─────────────────────────────────────────────────────────────
/**
 * Envía un email HTML al estudiante confirmando su inscripción a un curso.
 * Recibe un DTO de inscripción (ya transformado por toInscripcionDTO) con
 * los datos anidados de estudiante y curso.
 *
 * Es invocado de forma no bloqueante (fire-and-forget) desde inscripcionesService:
 * si lanza, el error se loguea como advertencia pero no revierte la inscripción.
 *
 * @param {object} inscripcion                    - DTO de inscripción (toInscripcionDTO)
 * @param {object} inscripcion.estudiante         - Datos del estudiante
 * @param {string} inscripcion.estudiante.email   - Dirección de destino del email
 * @param {string} inscripcion.estudiante.nombres - Nombre(s) del estudiante
 * @param {string} inscripcion.estudiante.apellido- Apellido del estudiante
 * @param {object} inscripcion.curso              - Datos del curso
 * @param {string} inscripcion.curso.nombre       - Nombre del curso (aparece en asunto y cuerpo)
 * @param {string} inscripcion.curso.fechaInicio  - Fecha de inicio en formato ISO (se formatea a es-AR)
 * @param {number} inscripcion.curso.cantidadHoras- Duración del curso en horas
 * @returns {Promise<void>}
 * @throws {Error} Si el servidor SMTP rechaza la conexión o el envío
 */
export async function sendConfirmacionInscripcion(inscripcion) {
    const { estudiante, curso } = inscripcion;

    await transporter.sendMail({
        // El remitente muestra el nombre institucional pero usa la dirección del .env
        from:    `"FCAD UNER" <${process.env.SMTP_USER}>`,
        to:      estudiante.email,
        subject: `Confirmación de inscripción — ${curso.nombre}`,
        html: `
            <h2>¡Inscripción confirmada!</h2>
            <p>Hola <strong>${estudiante.nombres} ${estudiante.apellido}</strong>,</p>
            <p>Tu inscripción al siguiente curso fue registrada exitosamente:</p>
            <ul>
                <li><strong>Curso:</strong> ${curso.nombre}</li>
                <li><strong>Fecha de inicio:</strong> ${new Date(curso.fechaInicio).toLocaleDateString('es-AR')}</li>
                <li><strong>Duración:</strong> ${curso.cantidadHoras} horas</li>
            </ul>
            <p>Ante cualquier consulta, comunicate con la administración.</p>
            <p>— FCAD UNER</p>
        `,
    });
}

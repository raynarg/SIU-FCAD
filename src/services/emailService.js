import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendConfirmacionInscripcion(inscripcion) {
    const { estudiante, curso } = inscripcion;

    await transporter.sendMail({
        from: `"FCAD UNER" <${process.env.SMTP_USER}>`,
        to: estudiante.email,
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

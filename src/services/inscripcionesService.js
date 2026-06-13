// ============================================================
//  src/services/inscripcionesService.js
// ============================================================
import * as inscripcionesRepo from '../repositories/inscripcionesRepository.js';
import * as cursosRepo from '../repositories/cursosRepository.js';
import * as estudiantesRepo from '../repositories/estudiantesRepository.js';
import { toInscripcionDTO } from '../dtos/inscripcionesDTO.js';
import { sendConfirmacionInscripcion } from './emailService.js';

export async function getInscripciones({ page = 1, limit = 10, search = '', curso = null }) {
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const pageNum = Math.max(parseInt(page) || 1, 1);

    const { rows, total } = await inscripcionesRepo.findAll({
        page: pageNum,
        limit: limitNum,
        search,
        curso
    });

    return {
        data: rows.map(toInscripcionDTO),
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1
        }
    };
}

export async function getInscripcionById(id) {
    const row = await inscripcionesRepo.findById(id);
    if (!row) {
        const err = new Error('Inscripción no encontrada');
        err.status = 404;
        throw err;
    }
    return toInscripcionDTO(row);
}

export async function createInscripcion(data, userId) {
    const { id_estudiante, id_curso, fecha_inscripcion } = data;

    // 1. Validar que el estudiante exista y esté activo
    const estudiante = await estudiantesRepo.findById(id_estudiante);
    if (!estudiante) {
        const err = new Error('Estudiante no encontrado o inactivo');
        err.status = 404;
        throw err;
    }

    // 2. Validar que el curso exista y esté habilitado para inscripciones
    const curso = await cursosRepo.findById(id_curso);
    if (!curso) {
        const err = new Error('Curso no encontrado');
        err.status = 404;
        throw err;
    }
    
    // id_curso_estado == 2 es "Inscripción Abierta"
    if (curso.id_curso_estado !== 2) {
        const err = new Error('El curso no está habilitado para inscripciones');
        err.status = 400;
        throw err;
    }

    // 3. Validar inscripciones duplicadas
    const duplicada = await inscripcionesRepo.findByEstudianteAndCurso(id_estudiante, id_curso);
    if (duplicada) {
        const err = new Error('El estudiante ya se encuentra inscripto en este curso');
        err.status = 400;
        throw err;
    }

    // 4. Validar cupo disponible
    const inscriptosActuales = await inscripcionesRepo.countByCurso(id_curso);
    if (inscriptosActuales >= curso.inscriptos_max) {
        const err = new Error('Se ha superado el cupo máximo de inscriptos para este curso');
        err.status = 400;
        throw err;
    }

    // Crear la inscripción
    const inscripcion = await inscripcionesRepo.create({
        id_estudiante,
        id_curso,
        fecha_inscripcion: fecha_inscripcion || new Date().toISOString(),
        id_usuario_modificacion: userId
    });

    // Retornamos el DTO de la inscripción recién creada consultando su información completa (con JOINs)
    const rowComplete = await inscripcionesRepo.findById(inscripcion.id_inscripcion);
    const dto = toInscripcionDTO(rowComplete);
    await sendConfirmacionInscripcion(dto);
    return dto;
}

export async function deleteInscripcion(id, userId) {
    const row = await inscripcionesRepo.findById(id);
    if (!row) {
        const err = new Error('Inscripción no encontrada');
        err.status = 404;
        throw err;
    }

    await inscripcionesRepo.deleteById(id, userId);
    return true;
}

import * as estRepo from '../repositories/estudiantesRepository.js';
import { toEstudianteDTO } from '../dtos/estudiantesDto.js';

function crearError(mensaje, statusCode = 500) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

export async function getEstudiantes({ 
    page = 1, 
    limit = 10, 
    documento = '', 
    nombre = '', 
    email = '', 
    activo = null 
}) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const { rows, total } = await estRepo.findAll({
        page: pageNum,
        limit: limitNum,
        documento: documento.trim(),
        nombre: nombre.trim(),
        email: email.trim(),
        activo: activo !== null && activo !== '' ? parseInt(activo) : null
    });

    const totalPages = Math.ceil(total / limitNum);

    return {
        data: rows.map(toEstudianteDTO),
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
        }
    };
}

export async function getEstudianteById(id) {
    const est = await estRepo.findById(parseInt(id));
    if (!est) {
        throw crearError(`No se encontró el estudiante con ID ${id}.`, 404);
    }
    return toEstudianteDTO(est);
}

export async function createEstudiante(data, userId) {
    // Validar si el documento ya existe
    const { rows } = await estRepo.findAll({ documento: data.documento, limit: 1 });
    if (rows.length > 0) {
        throw crearError(`Ya existe un estudiante con el documento ${data.documento}.`, 400);
    }

    const nuevo = await estRepo.create({
        ...data,
        id_usuario_modificacion: userId
    });
    return toEstudianteDTO(nuevo);
}

export async function updateEstudiante(id, data, userId) {
    const existente = await estRepo.findById(parseInt(id));
    if (!existente) {
        throw crearError(`No se encontró el estudiante con ID ${id}.`, 404);
    }

    const actualizado = await estRepo.update(parseInt(id), {
        ...data,
        id_usuario_modificacion: userId
    });
    return toEstudianteDTO(actualizado);
}

export async function deleteEstudiante(id, userId) {
    const existente = await estRepo.findById(parseInt(id));
    if (!existente) {
        throw crearError(`No se encontró el estudiante con ID ${id}.`, 404);
    }
    await estRepo.softDelete(parseInt(id), userId);
}

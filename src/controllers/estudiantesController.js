import * as estService from '../services/estudiantesService.js';

export async function getEstudiantes(req, res, next) {
    try {
        const resultado = await estService.getEstudiantes(req.query);
        res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        next(error);
    }
}

export async function getEstudianteById(req, res, next) {
    try {
        const est = await estService.getEstudianteById(req.params.id);
        res.status(200).json({ success: true, data: est });
    } catch (error) {
        next(error);
    }
}

export async function createEstudiante(req, res, next) {
    try {
        const userId = req.user?.id ?? 1;
        const nuevo = await estService.createEstudiante(req.body, userId);
        res.status(201).json({ success: true, data: nuevo });
    } catch (error) {
        next(error);
    }
}

export async function updateEstudiante(req, res, next) {
    try {
        const userId = req.user?.id ?? 1;
        const actualizado = await estService.updateEstudiante(req.params.id, req.body, userId);
        res.status(200).json({ success: true, data: actualizado });
    } catch (error) {
        next(error);
    }
}

export async function deleteEstudiante(req, res, next) {
    try {
        const userId = req.user?.id ?? 1;
        await estService.deleteEstudiante(req.params.id, userId);
        res.status(200).json({ success: true, message: `Estudiante ${req.params.id} dado de baja.` });
    } catch (error) {
        next(error);
    }
}

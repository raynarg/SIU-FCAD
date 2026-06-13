// ============================================================
//  src/controllers/inscripcionesController.js
// ============================================================

import * as inscripcionesService from '../services/inscripcionesService.js';

export async function getInscripciones(req, res, next) {
    try {
        const { page, limit, search, curso } = req.query;
        const resultado = await inscripcionesService.getInscripciones({ page, limit, search, curso });
        res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        next(error);
    }
}

export async function getInscripcionById(req, res, next) {
    try {
        const inscripcion = await inscripcionesService.getInscripcionById(req.params.id);
        res.status(200).json({ success: true, data: inscripcion });
    } catch (error) {
        next(error);
    }
}

export async function createInscripcion(req, res, next) {
    try {
        // En una app real, el userId vendría del middleware de autenticación en req.user
        const userId = req.user?.id ?? 1; 
        const nueva = await inscripcionesService.createInscripcion(req.body, userId);
        res.status(201).json({ success: true, data: nueva });
    } catch (error) {
        next(error);
    }
}

export async function deleteInscripcion(req, res, next) {
    try {
        await inscripcionesService.deleteInscripcion(req.params.id);
        res.status(200).json({ success: true, message: 'Inscripción dada de baja exitosamente' });
    } catch (error) {
        next(error);
    }
}

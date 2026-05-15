// ============================================================
//  src/controllers/cursos.controller.js
// ============================================================

import * as cursosService from '../services/cursosService.js';

export async function getCursos(req, res, next) {
    try {
        const { page, limit, nombre, id_curso_estado } = req.query;
        const resultado = await cursosService.getCursos({ page, limit, nombre, id_curso_estado });
        res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        next(error);
    }
}

export async function getCursoById(req, res, next) {
    try {
        const curso = await cursosService.getCursoById(req.params.id);
        res.status(200).json({ success: true, data: curso });
    } catch (error) {
        next(error);
    }
}

export async function createCurso(req, res, next) {
    try {
        const userId = req.user?.id ?? 1;
        const nuevo  = await cursosService.createCurso(req.body, userId);
        res.status(201).json({ success: true, data: nuevo });
    } catch (error) {
        next(error);
    }
}

export async function updateCurso(req, res, next) {
    try {
        const userId      = req.user?.id ?? 1;
        const actualizado = await cursosService.updateCurso(req.params.id, req.body, userId);
        res.status(200).json({ success: true, data: actualizado });
    } catch (error) {
        next(error);
    }
}

export async function deleteCurso(req, res, next) {
    try {
        const userId = req.user?.id ?? 1;
        await cursosService.deleteCurso(req.params.id, userId);
        res.status(200).json({ success: true, message: `Curso ${req.params.id} eliminado correctamente.` });
    } catch (error) {
        next(error);
    }
}
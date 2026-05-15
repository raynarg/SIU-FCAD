// src/routes/cursos.routes.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middlewares/validateBody.js';
import * as ctrl from '../controllers/cursosController.js';

const router = Router();

const validarCurso = [
    body('nombre').trim().notEmpty().isLength({ max: 200 }),
    body('fecha_inicio').isDate(),
    body('cantidad_horas').isInt({ min: 1, max: 500 }),
    body('inscriptos_max').isInt({ min: 1 }),
    body('id_curso_estado').isInt({ min: 1, max: 3 }),
];

const validarId = [ param('id').isInt({ min: 1 }) ];

router.get('/', ctrl.getCursos);
router.get('/:id', validarId, validate, ctrl.getCursoById);
router.post('/', validarCurso, validate, ctrl.createCurso);
router.put('/:id', validarId, validarCurso, validate, ctrl.updateCurso);
router.delete('/:id', validarId, validate, ctrl.deleteCurso);
export default router;
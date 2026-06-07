import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middlewares/validateBody.js';
import * as ctrl from '../controllers/estudiantesController.js';

const router = Router();

const validarEstudiante = [
    body('documento').trim().notEmpty().isLength({ min: 7, max: 20 }),
    body('nombres').trim().notEmpty().isLength({ max: 100 }),
    body('apellido').trim().notEmpty().isLength({ max: 100 }),
    body('email').trim().isEmail().isLength({ max: 150 }),
    body('fecha_nacimiento').isDate(),
];

const validarId = [ param('id').isInt({ min: 1 }) ];

router.get('/', ctrl.getEstudiantes);
router.get('/:id', validarId, validate, ctrl.getEstudianteById);
router.post('/', validarEstudiante, validate, ctrl.createEstudiante);
router.put('/:id', validarId, validarEstudiante, validate, ctrl.updateEstudiante);
router.delete('/:id', validarId, validate, ctrl.deleteEstudiante);

export default router;

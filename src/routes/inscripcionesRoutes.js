import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middlewares/validateBody.js';
import {
    getInscripciones,
    getInscripcionById,
    createInscripcion,
    deleteInscripcion
} from '../controllers/inscripcionesController.js';

const router = Router();

// Reglas de validación
const validarId = [
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo')
];

const validarInscripcion = [
    body('id_estudiante').isInt({ min: 1 }).withMessage('El ID del estudiante es requerido y debe ser entero'),
    body('id_curso').isInt({ min: 1 }).withMessage('El ID del curso es requerido y debe ser entero'),
    body('fecha_inscripcion').optional().isISO8601().withMessage('La fecha debe tener formato ISO8601')
];

// BROWSE - Listar inscripciones (con paginación y filtros)
router.get('/', getInscripciones);

// READ - Obtener inscripción por ID
router.get('/:id', validarId, validate, getInscripcionById);

// ADD - Crear una nueva inscripción
router.post('/', validarInscripcion, validate, createInscripcion);

// DELETE - Dar de baja una inscripción
router.delete('/:id', validarId, validate, deleteInscripcion);

export default router;

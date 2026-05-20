// ============================================================
//  src/routes/cursosRoutes.js
//  Capa de Rutas — Definición de endpoints del módulo Cursos
//
//  Responsabilidades de esta capa:
//    · Declarar las rutas HTTP y asociarlas a sus controladores
//    · Definir las reglas de validación de entrada (express-validator)
//    · Aplicar el middleware validate() para cortar el pipeline si hay errores
//
//  Esta capa NO maneja lógica de negocio ni accede a servicios directamente.
// ============================================================

import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middlewares/validateBody.js';
import * as ctrl from '../controllers/cursosController.js';

const router = Router();

// Reglas para los endpoints que reciben un :id en la URL
const validarId = [
    param('id').isInt({ min: 1 }),  // el ID debe ser un entero positivo
];

// Reglas para el body en creación y edición de cursos
const validarCurso = [
    body('nombre').trim().notEmpty().isLength({ max: 200 }),    // requerido, máximo 200 caracteres
    body('fecha_inicio').isDate(),                              // formato de fecha válido (YYYY-MM-DD)
    body('cantidad_horas').isInt({ min: 1, max: 500 }),         // entre 1 y 500 horas
    body('inscriptos_max').isInt({ min: 1 }),                   // al menos 1 inscripto permitido
    body('id_curso_estado').isInt({ min: 1, max: 3 }),          // estados válidos: 1 (Borrador), 2 (Abierto), 3 (Cerrado)
];

router.get('/',     ctrl.getCursos);
router.get('/:id',  validarId, validate, ctrl.getCursoById);
router.post('/',    validarCurso, validate, ctrl.createCurso);
router.put('/:id',  validarId, validarCurso, validate, ctrl.updateCurso);
router.delete('/:id', validarId, validate, ctrl.deleteCurso);

export default router;

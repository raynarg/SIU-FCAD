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

/**
 * @swagger
 * components:
 *   schemas:
 *     Curso:
 *       type: object
 *       required:
 *         - nombre
 *         - descripcion
 *         - fecha_inicio
 *         - cantidad_horas
 *         - inscriptos_max
 *         - id_curso_estado
 *       properties:
 *         id:
 *           type: integer
 *           description: El ID autogenerado del curso
 *         nombre:
 *           type: string
 *           description: Nombre del curso (máx 200 caracteres)
 *         descripcion:
 *           type: string
 *           description: Descripción detallada del curso
 *         fecha_inicio:
 *           type: string
 *           format: date
 *           description: Fecha de inicio del curso (YYYY-MM-DD)
 *         cantidad_horas:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           description: Duración total en horas
 *         inscriptos_max:
 *           type: integer
 *           minimum: 1
 *           description: Cantidad máxima de alumnos permitidos
 *         id_curso_estado:
 *           type: integer
 *           enum: [1, 2, 3]
 *           description: "Estado del curso: 1 (Borrador), 2 (Abierto), 3 (Cerrado)"
 *       example:
 *         nombre: "Programación Web con Node.js"
 *         descripcion: "Aprende a crear aplicaciones escalables con Express y PostgreSQL."
 *         fecha_inicio: "2026-06-01"
 *         cantidad_horas: 40
 *         inscriptos_max: 30
 *         id_curso_estado: 1
 */

/**
 * @swagger
 * tags:
 *   name: Cursos
 *   description: API para la gestión de cursos
 */

// Reglas para los endpoints que reciben un :id en la URL
const validarId = [
    param('id').isInt({ min: 1 }),  // el ID debe ser un entero positivo
];

// Reglas para el body en creación y edición de cursos
const validarCurso = [
    body('nombre').trim().notEmpty().isLength({ max: 200 }),    // requerido, máximo 200 caracteres
    body('descripcion').trim().notEmpty(),                      // requerido
    body('fecha_inicio').isDate(),                              // formato de fecha válido (YYYY-MM-DD)
    body('cantidad_horas').isInt({ min: 1, max: 500 }),         // entre 1 y 500 horas
    body('inscriptos_max').isInt({ min: 1 }),                   // al menos 1 inscripto permitido
    body('id_curso_estado').isInt({ min: 1, max: 3 }),          // estados válidos: 1 (Borrador), 2 (Abierto), 3 (Cerrado)
];

/**
 * @swagger
 * /api/v1/cursos:
 *   get:
 *     summary: Obtiene la lista de todos los cursos
 *     tags: [Cursos]
 *     responses:
 *       200:
 *         description: Lista de cursos obtenida con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Curso'
 */
router.get('/',     ctrl.getCursos);

/**
 * @swagger
 * /api/v1/cursos/{id}:
 *   get:
 *     summary: Obtiene un curso por su ID
 *     tags: [Cursos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del curso
 *     responses:
 *       200:
 *         description: Datos del curso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Curso'
 *       404:
 *         description: Curso no encontrado
 */
router.get('/:id',  validarId, validate, ctrl.getCursoById);

/**
 * @swagger
 * /api/v1/cursos:
 *   post:
 *     summary: Crea un nuevo curso
 *     tags: [Cursos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Curso'
 *     responses:
 *       201:
 *         description: Curso creado con éxito
 *       400:
 *         description: Error en los datos de entrada
 */
router.post('/',    validarCurso, validate, ctrl.createCurso);

/**
 * @swagger
 * /api/v1/cursos/{id}:
 *   put:
 *     summary: Actualiza un curso existente
 *     tags: [Cursos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del curso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Curso'
 *     responses:
 *       200:
 *         description: Curso actualizado con éxito
 *       404:
 *         description: Curso no encontrado
 *       400:
 *         description: Error en los datos de entrada
 */
router.put('/:id',  validarId, validarCurso, validate, ctrl.updateCurso);

/**
 * @swagger
 * /api/v1/cursos/{id}:
 *   delete:
 *     summary: Elimina un curso (borrado lógico)
 *     tags: [Cursos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del curso
 *     responses:
 *       204:
 *         description: Curso eliminado con éxito
 *       404:
 *         description: Curso no encontrado
 */
router.delete('/:id', validarId, validate, ctrl.deleteCurso);

export default router;

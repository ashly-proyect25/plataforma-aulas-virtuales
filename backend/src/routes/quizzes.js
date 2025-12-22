// backend/src/routes/quizzes.js

import express from 'express';
import * as quizController from '../controllers/quiz.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

/**
 * Rutas de Quizzes
 */

// Obtener quizzes de un curso
router.get(
  '/courses/:courseId/quizzes',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  quizController.getCourseQuizzes
);

// Crear quiz en un curso
router.post(
  '/courses/:courseId/quizzes',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  quizController.createQuiz
);

// Obtener quiz específico
router.get(
  '/quizzes/:quizId',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  quizController.getQuizById
);

// Actualizar quiz
router.patch(
  '/quizzes/:quizId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  quizController.updateQuiz
);

// Eliminar quiz
router.delete(
  '/quizzes/:quizId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  quizController.deleteQuiz
);

// Agregar preguntas a un quiz
router.post(
  '/quizzes/:quizId/questions',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  quizController.addQuestions
);

// Actualizar todas las preguntas de un quiz
router.put(
  '/quizzes/:quizId/questions',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  quizController.updateQuestions
);

// Eliminar una pregunta
router.delete(
  '/questions/:questionId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  quizController.deleteQuestion
);

// Iniciar intento de quiz (estudiante)
router.post(
  '/quizzes/:quizId/attempt',
  authenticate,
  authorize('STUDENT'),
  quizController.startQuizAttempt
);

// Enviar respuestas del quiz (estudiante)
router.post(
  '/quizzes/:quizId/submit',
  authenticate,
  authorize('STUDENT'),
  quizController.submitQuizAttempt
);

// Obtener intentos del estudiante para un quiz
router.get(
  '/quizzes/:quizId/my-attempts',
  authenticate,
  authorize('STUDENT'),
  quizController.getMyAttempts
);

export default router;

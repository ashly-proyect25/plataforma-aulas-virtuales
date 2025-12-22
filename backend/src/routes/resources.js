// backend/src/routes/resources.js

import express from 'express';
import * as resourceController from '../controllers/resource.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// ==================== COURSE RESOURCES ====================

// Crear recurso
router.post(
  '/courses/:courseId/resources',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  resourceController.createResource
);

// Obtener recursos de un curso
router.get(
  '/courses/:courseId/resources',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  resourceController.getCourseResources
);

// Actualizar recurso
router.patch(
  '/resources/:id',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  resourceController.updateResource
);

// Eliminar recurso
router.delete(
  '/resources/:id',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  resourceController.deleteResource
);

// ==================== QUIZZES ====================
// NOTA: Las rutas de CRUD de quizzes están en quizzes.js
// Estas rutas solo manejan la funcionalidad de estudiantes

// Enviar intento de quiz
router.post(
  '/quizzes/:id/submit',
  authenticate,
  authorize('STUDENT'),
  resourceController.submitQuizAttempt
);

// ==================== FORUMS ====================

// Crear foro
router.post(
  '/courses/:courseId/forums',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  resourceController.createForum
);

// Obtener foros de un curso
router.get(
  '/courses/:courseId/forums',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  resourceController.getCourseForums
);

// Obtener posts de un foro
router.get(
  '/forums/:id/posts',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  resourceController.getForumPosts
);

// Crear post en foro
router.post(
  '/forums/:id/posts',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  resourceController.createForumPost
);

// Crear respuesta a post
router.post(
  '/posts/:id/replies',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  resourceController.createForumReply
);

// Eliminar foro
router.delete(
  '/forums/:id',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  resourceController.deleteForum
);

export default router;

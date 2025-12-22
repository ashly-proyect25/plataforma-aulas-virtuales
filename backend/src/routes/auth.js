// backend/src/routes/auth.js

import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

/**
 * 🔐 RUTAS PÚBLICAS
 */

// Login universal
router.post('/auth/login', authController.login);

// Logout
router.post('/auth/logout', authenticate, authController.logout);

// Get current user
router.get('/auth/me', authenticate, authController.getMe);

// Change password (all authenticated users)
router.post('/auth/change-password', authenticate, authController.changePassword);

// Update profile (all authenticated users)
router.patch('/auth/profile', authenticate, authController.updateProfile);

/**
 * 🔐 RUTAS PROTEGIDAS - ADMIN ONLY
 */

// Crear docente
router.post(
  '/auth/users/teacher',
  authenticate,
  authorize('ADMIN'),
  authController.createTeacher
);

// Listar docentes
router.get(
  '/auth/users/teachers',
  authenticate,
  authorize('ADMIN'),
  authController.getTeachers
);

// Cambiar estado de usuario
router.patch(
  '/auth/users/:id/toggle-status',
  authenticate,
  authorize('ADMIN'),
  authController.toggleUserStatus
);

// Editar usuario
router.patch(
  '/auth/users/:id',
  authenticate,
  authorize('ADMIN'),
  authController.updateUser
);

// Resetear contraseña de usuario
router.post(
  '/auth/users/:id/reset-password',
  authenticate,
  authorize('ADMIN'),
  authController.resetUserPassword
);

// Eliminar usuario
router.delete(
  '/auth/users/:id',
  authenticate,
  authorize('ADMIN'),
  authController.deleteUser
);

/**
 * 🔐 RUTAS PROTEGIDAS - TEACHER
 */

// Crear estudiante
router.post(
  '/auth/users/student',
  authenticate,
  authorize('TEACHER'),
  authController.createStudent
);

// Listar estudiantes
router.get(
  '/auth/users/students',
  authenticate,
  authorize('TEACHER'),
  authController.getStudents
);

// Cambiar estado de estudiante
router.patch(
  '/auth/users/students/:id/toggle-status',
  authenticate,
  authorize('TEACHER'),
  authController.toggleStudentStatus
);
// Obtener todos los estudiantes
router.get(
  '/users/students',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  authController.getAllStudents
);

export default router;
// backend/src/routes/courses.js

import express from 'express';
import * as courseController from '../controllers/course.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

/**
 * 🔐 RUTAS PROTEGIDAS - TEACHER
 */

// Obtener mis materias asignadas (Docente) - DEBE IR ANTES DE /:id
router.get(
  '/my-courses',
  authenticate,
  authorize('TEACHER'),
  courseController.getMyCoursesAsTeacher
);

/**
 * 🔐 RUTAS PROTEGIDAS - STUDENT
 */

// Obtener mis materias inscritas (Estudiante) - DEBE IR ANTES DE /:id
router.get(
  '/my-enrollments',
  authenticate,
  authorize('STUDENT'),
  courseController.getMyEnrollments
);

// Obtener clases programadas próximas (Estudiante) - DEBE IR ANTES DE /:id
router.get(
  '/upcoming-classes',
  authenticate,
  authorize('STUDENT'),
  courseController.getUpcomingClasses
);

// Obtener clases en vivo activas (Estudiante) - DEBE IR ANTES DE /:id
router.get(
  '/active-live-classes',
  authenticate,
  authorize('STUDENT'),
  courseController.getActiveLiveClasses
);

/**
 * 🔐 RUTAS PROTEGIDAS - ADMIN ONLY
 */

// Obtener todas las materias (Admin) - DEBE IR ANTES DE /:id
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  courseController.getAllCourses
);

// Crear materia (solo Admin)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  courseController.createCourse
);

/**
 * 🔐 RUTAS COMPARTIDAS - ADMIN/TEACHER
 */

// Importar estudiantes desde Excel - DEBE IR ANTES DE /:id
router.post(
  '/import-students',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.importStudents
);

// Cambiar estado de materia (solo Admin) - DEBE IR ANTES DE /:id
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('ADMIN'),
  courseController.toggleCourseStatus
);

// Obtener estudiantes de un curso - DEBE IR ANTES DE /:id
router.get(
  '/:id/students',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  courseController.getCourseStudents
);

// Obtener estadísticas del curso - DEBE IR ANTES DE /:id
router.get(
  '/:id/statistics',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.getCourseStatistics
);

// Obtener clases programadas - DEBE IR ANTES DE /:id
router.get(
  '/:id/scheduled-classes',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  courseController.getScheduledClasses
);

// Programar una clase - DEBE IR ANTES DE /:id
router.post(
  '/:id/schedule-class',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.scheduleClass
);

// Cancelar clase programada - DEBE IR ANTES DE /:id
router.delete(
  '/:id/scheduled-classes/:classId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.cancelScheduledClass
);

// Obtener calificaciones detalladas de un estudiante - DEBE IR ANTES DE /:id
router.get(
  '/:courseId/students/:studentId/grades',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.getStudentGrades
);

// Inscribir estudiante - DEBE IR ANTES DE /:id
router.post(
  '/:id/enroll',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.enrollStudent
);

// Desinscribir estudiante - DEBE IR ANTES DE /:id
router.delete(
  '/:id/students/:studentId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.unenrollStudent
);

// Obtener un curso específico - DEBE IR DESPUÉS DE TODAS LAS RUTAS ESPECÍFICAS
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  courseController.getCourseById
);

// Actualizar materia (solo Admin)
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  courseController.updateCourse
);

// Eliminar materia (solo Admin)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  courseController.deleteCourse
);

// Obtener grupos de trabajo de un curso
router.get(
  '/:courseId/groups',
  authenticate,
  authorize('TEACHER', 'ADMIN'),
  courseController.getWorkGroups
);

// Guardar grupos de trabajo
router.post(
  '/:courseId/groups',
  authenticate,
  authorize('TEACHER', 'ADMIN'),
  courseController.saveWorkGroups
);

// Obtener asistencias de un estudiante
router.get(
  '/:courseId/students/:studentId/attendance',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  courseController.getStudentAttendance
);

// Obtener asistencias de una clase
router.get(
  '/:courseId/classrooms/:classroomId/attendance',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.getClassroomAttendance
);

// Registrar asistencias de una clase
router.post(
  '/:courseId/classrooms/:classroomId/attendance',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.markAttendance
);

// Auto-registrar asistencia (Estudiante)
router.post(
  '/:courseId/classrooms/:classroomId/self-attendance',
  authenticate,
  authorize('STUDENT'),
  courseController.selfRegisterAttendance
);

// Justificar inasistencia
router.put(
  '/:courseId/classrooms/:classroomId/attendance/:userId/justify',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.justifyAbsence
);

// Configurar horario del curso
router.post(
  '/:courseId/schedule',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.setCourseSchedule
);

// Obtener horario del curso
router.get(
  '/:courseId/schedule',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  courseController.getCourseSchedule
);

// Generar clases automáticamente según horario
router.post(
  '/:courseId/generate-classes',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  courseController.generateClassesFromSchedule
);

export default router;
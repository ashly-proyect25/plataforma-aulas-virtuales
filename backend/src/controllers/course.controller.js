// backend/src/controllers/course.controller.js
import prisma from '../config/db.js';
import bcrypt from 'bcrypt';


/**
 * 📚 ADMIN - Crear nuevo curso/materia
 * POST /api/courses
 */

export const createCourse = async (req, res) => {
  try {
    console.log('🚫 [CREATE-COURSE] ===== ENTRANDO A CREATE COURSE (NO DEBERÍA SER PARA QUIZ) =====');
    console.log('🚫 [CREATE-COURSE] URL:', req.url);
    console.log('🚫 [CREATE-COURSE] Method:', req.method);
    console.log('🚫 [CREATE-COURSE] Params:', req.params);
    console.log("🧑‍💼 Usuario autenticado en createCourse:", req.user);

    const { code, title, description, teacherId, color, credits } = req.body;
    const adminId = req.user.id || req.user.userId; // ✅ FIX

    if (!code || !title || !teacherId) {
      console.log('⚠️ [CREATE-COURSE] Validación falló - devolviendo error');
      return res.status(400).json({
        success: false,
        message: 'Código, título y docente son requeridos'
      });
    }

    const existingCourse = await prisma.course.findUnique({
      where: { code }
    });

    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'El código de materia ya existe'
      });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId }
    });

    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(400).json({
        success: false,
        message: 'Docente no válido'
      });
    }

    const newCourse = await prisma.course.create({
      data: {
        code,
        title,
        description: description || '',
        color: color || '#6366f1',
        credits: credits || 3,
        teacher: {
          connect: { id: teacherId },
        },
        creator: {
          connect: { id: adminId }, // ✅ FIX
        }
      },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Materia creada exitosamente',
      course: newCourse
    });

  } catch (error) {
    console.error('Error en createCourse:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la materia',
      error: error.message
    });
  }
};


/**
 * 📚 ADMIN - Obtener todas las materias
 * GET /api/courses
 */
export const getAllCourses = async (req, res) => {
  try {
    const { isActive } = req.query;

    const courses = await prisma.course.findMany({
      where: {
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            classrooms: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      total: courses.length,
      courses
    });
  } catch (error) {
    console.error('Error en getAllCourses:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener materias',
      error: error.message
    });
  }
};

/**
 * 📚 ADMIN - Obtener una materia específica
 * GET /api/courses/:id
 */
export const getCourseById = async (req, res) => {
  try {
    console.log('📍 [GET-COURSE-BY-ID] req.params:', req.params);
    console.log('📍 [GET-COURSE-BY-ID] req.url:', req.url);
    const { id } = req.params;
    console.log('📍 [GET-COURSE-BY-ID] id extraído:', id);

    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true
          }
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true
              }
            }
          }
        },
        classrooms: {
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            isLive: true
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Materia no encontrada'
      });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Error en getCourseById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la materia',
      error: error.message
    });
  }
};

/**
 * 📚 ADMIN - Actualizar materia
 * PATCH /api/courses/:id
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, teacherId, color, credits } = req.body;

    const courseId = parseInt(id);

    // Verificar que la materia exista
    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Materia no encontrada'
      });
    }

    // Si cambia docente, validar que exista
    if (teacherId) {
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId }
      });

      if (!teacher || teacher.role !== 'TEACHER') {
        return res.status(400).json({
          success: false,
          message: 'Docente no válido'
        });
      }
    }

    // Actualizar
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(teacherId && { teacherId }),
        ...(color && { color }),
        ...(credits && { credits })
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Materia actualizada exitosamente',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Error en updateCourse:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la materia',
      error: error.message
    });
  }
};

/**
 * 📚 ADMIN - Cambiar estado de materia
 * PATCH /api/courses/:id/toggle-status
 */
export const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const courseId = parseInt(id);

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Materia no encontrada'
      });
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        isActive: !course.isActive
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Materia ${updatedCourse.isActive ? 'activada' : 'desactivada'}`,
      course: updatedCourse
    });
  } catch (error) {
    console.error('Error en toggleCourseStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de materia',
      error: error.message
    });
  }
};

/**
 * 📚 ADMIN - Eliminar materia
 * DELETE /api/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const courseId = parseInt(id);

    // Verificar que no tenga estudiantes inscritos
    const enrollmentCount = await prisma.enrollment.count({
      where: { courseId }
    });

    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una materia con estudiantes inscritos'
      });
    }

    await prisma.course.delete({
      where: { id: courseId }
    });

    res.json({
      success: true,
      message: 'Materia eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error en deleteCourse:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la materia',
      error: error.message
    });
  }
};

/**
 * 👨‍🏫 DOCENTE - Ver sus materias asignadas
 * GET /api/my-courses
 */
export const getMyCoursesAsTeacher = async (req, res) => {
  try {
    const teacherId = req.user.userId;


    const courses = await prisma.course.findMany({
      where: {
        teacherId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                isActive: true
              }
            },
            classrooms: true
          }
        },
        enrollments: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true
              }
            }
          },
          where: {
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      total: courses.length,
      courses
    });
  } catch (error) {
    console.error('Error en getMyCoursesAsTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tus materias',
      error: error.message
    });
  }
};

export const importStudents = async (req, res) => {
  try {
    console.log('📍 [IMPORT-STUDENTS] Solicitud recibida');
    const { courseId, students } = req.body;
    const userId = req.user.userId;

    // Validaciones
    if (!courseId || !students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere courseId y un array de estudiantes'
      });
    }

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El array de estudiantes está vacío'
      });
    }

    console.log(`📍 [IMPORT-STUDENTS] Curso: ${courseId}, Estudiantes: ${students.length}`);

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Si es docente, verificar que sea el profesor del curso
    if (req.user.role === 'TEACHER') {
      if (course.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para agregar estudiantes a este curso'
        });
      }
    }

    console.log('📍 [IMPORT-STUDENTS] Procesando estudiantes...');

    const results = {
      success: [],
      errors: [],
      duplicates: []
    };

    // Procesar cada estudiante
    for (const studentData of students) {
      try {
        // Validar datos requeridos
        if (!studentData.username || !studentData.name || !studentData.email || !studentData.password) {
          results.errors.push({
            student: studentData,
            error: 'Faltan datos requeridos'
          });
          continue;
        }

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
          where: { username: studentData.username }
        });

        if (existingUser) {
          // Si ya existe, solo inscribirlo al curso
          const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
              userId: existingUser.id,
              courseId: courseId
            }
          });

          if (existingEnrollment) {
            results.duplicates.push({
              username: studentData.username,
              message: 'Ya está inscrito en el curso'
            });
            continue;
          }

          // Inscribir al curso existente
          await prisma.enrollment.create({
            data: {
              userId: existingUser.id,
              courseId: courseId
            }
          });

          results.success.push({
            username: studentData.username,
            action: 'enrolled'
          });

          console.log(`✅ [IMPORT-STUDENTS] Usuario existente inscrito: ${studentData.username}`);
          continue;
        }

        // Crear nuevo estudiante
        const hashedPassword = await bcrypt.hash(studentData.password, 10);

        const newStudent = await prisma.user.create({
          data: {
            username: studentData.username.trim(),
            name: studentData.name.trim(),
            email: studentData.email.trim(),
            password: hashedPassword,
            role: 'STUDENT',
            isActive: true
          }
        });

        // Inscribir al curso
        await prisma.enrollment.create({
          data: {
            userId: newStudent.id,
            courseId: courseId
          }
        });

        results.success.push({
          username: studentData.username,
          action: 'created_and_enrolled'
        });

        console.log(`✅ [IMPORT-STUDENTS] Estudiante creado e inscrito: ${studentData.username}`);
      } catch (error) {
        console.error(`❌ [IMPORT-STUDENTS] Error con ${studentData.username}:`, error.message);
        results.errors.push({
          student: studentData,
          error: error.message
        });
      }
    }

    console.log(`✅ [IMPORT-STUDENTS] Completado - Éxito: ${results.success.length}, Errores: ${results.errors.length}, Duplicados: ${results.duplicates.length}`);

    res.json({
      success: true,
      message: `Importación completada`,
      results: {
        total: students.length,
        successful: results.success.length,
        errors: results.errors.length,
        duplicates: results.duplicates.length,
        details: results
      }
    });
  } catch (error) {
    console.error('❌ [IMPORT-STUDENTS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al importar estudiantes',
      error: error.message
    });
  }
};

// backend/src/controllers/course.controller.js
// AGREGAR ESTAS FUNCIONES AL FINAL DE TU ARCHIVO (después de importStudents)

/**
 * 👥 OBTENER ESTUDIANTES DE UN CURSO
 * GET /api/courses/:id/students
 */
export const getCourseStudents = async (req, res) => {
  try {
    console.log('📍 [GET-COURSE-STUDENTS] Solicitud recibida');
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Verificar permisos según el rol
    if (userRole === 'TEACHER') {
      // Si es docente, verificar que sea su curso
      if (course.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver los estudiantes de este curso'
        });
      }
    } else if (userRole === 'STUDENT') {
      // Si es estudiante, verificar que esté inscrito en el curso
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: parseInt(id),
          userId: userId
        }
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'No estás inscrito en este curso'
        });
      }
    }

    // Obtener estudiantes inscritos
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: parseInt(id)
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            isActive: true
          }
        }
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    });

    // Obtener grupos del curso para saber qué estudiante está en qué grupo
    const workGroups = await prisma.workGroup.findMany({
      where: { courseId: parseInt(id) },
      include: {
        students: {
          select: { id: true }
        }
      }
    });

    // Crear mapa de estudiante -> grupo
    const studentGroupMap = {};
    workGroups.forEach((group, index) => {
      group.students.forEach(student => {
        studentGroupMap[student.id] = {
          groupNumber: index + 1,
          groupName: group.name
        };
      });
    });

    // Agregar información de grupo a cada estudiante
    const students = enrollments.map(e => ({
      ...e.user,
      workGroup: studentGroupMap[e.user.id] || null
    }));

    console.log(`✅ [GET-COURSE-STUDENTS] ${students.length} estudiantes encontrados`);

    res.json({
      success: true,
      students
    });
  } catch (error) {
    console.error('❌ [GET-COURSE-STUDENTS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estudiantes',
      error: error.message
    });
  }
};

/**
 * ➕ INSCRIBIR ESTUDIANTE A CURSO
 * POST /api/courses/:id/enroll
 */
export const enrollStudent = async (req, res) => {
  try {
    console.log('📍 [ENROLL-STUDENT] Solicitud recibida');
    const { id } = req.params;
    const { studentId } = req.body;
    const currentUserId = req.user.userId;
    const userRole = req.user.role;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere studentId'
      });
    }

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Si es docente, verificar que sea su curso
    if (userRole === 'TEACHER' && course.teacherId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para inscribir estudiantes en este curso'
      });
    }

    // Verificar que el estudiante existe
    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado'
      });
    }

    // Verificar si ya está inscrito
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        courseId: parseInt(id)
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'El estudiante ya está inscrito en este curso'
      });
    }

    // Crear inscripción
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: studentId,
        courseId: parseInt(id)
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    console.log(`✅ [ENROLL-STUDENT] Estudiante ${student.username} inscrito en curso ${course.code}`);

    res.json({
      success: true,
      message: 'Estudiante inscrito exitosamente',
      enrollment
    });
  } catch (error) {
    console.error('❌ [ENROLL-STUDENT] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al inscribir estudiante',
      error: error.message
    });
  }
};

/**
 * ➖ DESINSCRIBIR ESTUDIANTE DE CURSO
 * DELETE /api/courses/:id/students/:studentId
 */
export const unenrollStudent = async (req, res) => {
  try {
    console.log('📍 [UNENROLL-STUDENT] Solicitud recibida');
    const { id, studentId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Si es docente, verificar que sea su curso
    if (userRole === 'TEACHER' && course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para desinscribir estudiantes de este curso'
      });
    }

    // Verificar que la inscripción existe
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: parseInt(studentId),
        courseId: parseInt(id)
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'El estudiante no está inscrito en este curso'
      });
    }

    // Eliminar inscripción
    await prisma.enrollment.delete({
      where: {
        id: enrollment.id
      }
    });

    console.log(`✅ [UNENROLL-STUDENT] Estudiante ${studentId} desinscrito de curso ${course.code}`);

    res.json({
      success: true,
      message: 'Estudiante desinscrito exitosamente'
    });
  } catch (error) {
    console.error('❌ [UNENROLL-STUDENT] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al desinscribir estudiante',
      error: error.message
    });
  }
};

/**
 * 🎓 ESTUDIANTE - Ver mis materias inscritas
 * GET /api/courses/my-enrollments
 */
export const getMyEnrollments = async (req, res) => {
  try {
    console.log('📍 [GET-MY-ENROLLMENTS] Solicitud recibida');
    const studentId = req.user.userId;

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: studentId,
        isActive: true
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            _count: {
              select: {
                classrooms: true,
                enrollments: true
              }
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    const courses = enrollments.map(enrollment => enrollment.course);

    console.log(`✅ [GET-MY-ENROLLMENTS] ${courses.length} materias encontradas`);

    res.json({
      success: true,
      total: courses.length,
      courses
    });
  } catch (error) {
    console.error('❌ [GET-MY-ENROLLMENTS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tus materias',
      error: error.message
    });
  }
};

/**
 * 📊 ESTADÍSTICAS DEL CURSO (DOCENTE/ADMIN)
 * GET /api/courses/:id/statistics
 */
export const getCourseStatistics = async (req, res) => {
  try {
    console.log('📍 [GET-COURSE-STATS] Solicitud recibida');
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log('📍 [GET-COURSE-STATS] Course ID:', id);
    console.log('📍 [GET-COURSE-STATS] User ID:', userId, 'Role:', userRole);

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) }
    });

    if (!course) {
      console.log('❌ [GET-COURSE-STATS] Curso no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    console.log('✅ [GET-COURSE-STATS] Curso encontrado:', course.code);

    // Si es docente, verificar que sea su curso
    if (userRole === 'TEACHER' && course.teacherId !== userId) {
      console.log('❌ [GET-COURSE-STATS] Permiso denegado');
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver las estadísticas de este curso'
      });
    }

    console.log('🔍 [GET-COURSE-STATS] Obteniendo quizzes del curso...');

    // Obtener quizzes del curso con sus intentos
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: parseInt(id),
        isActive: true
      },
      include: {
        questions: true,
        attempts: true // QuizAttempt NO tiene relación user, solo userId
      }
    });

    console.log(`✅ [GET-COURSE-STATS] ${quizzes.length} quizzes encontrados`);

    // Obtener todos los estudiantes inscritos
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: parseInt(id),
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true
          }
        }
      }
    });

    const students = enrollments.map(e => e.user);

    // Obtener todas las clases del curso
    const classrooms = await prisma.classroom.findMany({
      where: { courseId: parseInt(id) },
      include: {
        attendances: true,
        sessions: true
      }
    });

    // Calcular estadísticas de asistencia
    const totalClasses = classrooms.length;
    const attendanceStats = students.map(student => {
      const studentAttendances = classrooms.reduce((count, classroom) => {
        const attendance = classroom.attendances.find(a => a.userId === student.id);
        if (attendance && (attendance.status === 'PRESENT' || attendance.status === 'LATE')) {
          return count + 1;
        }
        return count;
      }, 0);

      return {
        studentId: student.id,
        classesAttended: studentAttendances,
        attendanceRate: totalClasses > 0 ? Math.round((studentAttendances / totalClasses) * 100) : 0
      };
    });

    // Calcular estadísticas de sesiones en vivo (tiempo total)
    const sessionStats = students.map(student => {
      const studentSessions = classrooms.flatMap(classroom =>
        classroom.sessions.filter(s => s.userId === student.id)
      );

      const totalMinutes = studentSessions.reduce((sum, session) => {
        return sum + (session.duration || 0);
      }, 0);

      return {
        studentId: student.id,
        totalSessions: studentSessions.length,
        totalMinutes: Math.round(totalMinutes / 60), // Convertir segundos a minutos
        totalHours: Math.round((totalMinutes / 3600) * 10) / 10 // Convertir a horas con 1 decimal
      };
    });

    // Calcular estadísticas generales de quizzes
    let totalAttempts = 0;
    let totalScore = 0;
    let passedAttempts = 0;

    // Calcular estadísticas por quiz
    const quizStats = quizzes.map(quiz => {
      const attempts = quiz.attempts;
      const avgScore = attempts.length > 0
        ? attempts.reduce((sum, att) => sum + att.score, 0) / attempts.length
        : 0;

      const uniqueStudents = new Set(attempts.map(att => att.userId)).size;
      const completionRate = students.length > 0
        ? (uniqueStudents / students.length) * 100
        : 0;

      const passed = attempts.filter(att => att.score >= quiz.passingScore).length;

      totalAttempts += attempts.length;
      totalScore += attempts.reduce((sum, att) => sum + att.score, 0);
      passedAttempts += passed;

      return {
        id: quiz.id,
        title: quiz.title,
        totalAttempts: attempts.length,
        uniqueStudents: uniqueStudents,
        averageScore: Math.round(avgScore),
        completionRate: Math.round(completionRate),
        passedAttempts: passed,
        passingScore: quiz.passingScore,
        questionsCount: quiz.questions.length
      };
    });

    // Calcular promedio general del curso
    const averageScore = totalAttempts > 0
      ? Math.round(totalScore / totalAttempts)
      : 0;

    const completionRate = students.length > 0 && quizzes.length > 0
      ? Math.round((quizStats.reduce((sum, q) => sum + q.completionRate, 0) / quizzes.length))
      : 0;

    // Calcular promedio general de asistencia
    const averageAttendanceRate = students.length > 0
      ? Math.round(attendanceStats.reduce((sum, a) => sum + a.attendanceRate, 0) / students.length)
      : 0;

    // Calcular promedio por estudiante con información completa
    const studentScores = students.map(student => {
      const studentAttempts = quizzes.flatMap(quiz =>
        quiz.attempts.filter(att => att.userId === student.id)
      );

      // Obtener el mejor intento de cada quiz
      const quizScores = quizzes.map(quiz => {
        const quizAttempts = quiz.attempts.filter(att => att.userId === student.id);
        if (quizAttempts.length === 0) return null;
        return Math.max(...quizAttempts.map(att => att.score));
      }).filter(score => score !== null);

      const avgScore = quizScores.length > 0
        ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length)
        : 0;

      // Encontrar estadísticas de asistencia y sesiones para este estudiante
      const attendance = attendanceStats.find(a => a.studentId === student.id);
      const sessions = sessionStats.find(s => s.studentId === student.id);

      return {
        id: student.id,
        name: student.name,
        username: student.username,
        email: student.email,
        averageScore: avgScore,
        quizzesCompleted: quizScores.length,
        totalQuizzes: quizzes.length,
        attendanceRate: attendance?.attendanceRate || 0,
        classesAttended: attendance?.classesAttended || 0,
        totalClasses: totalClasses,
        liveSessionHours: sessions?.totalHours || 0,
        liveSessionCount: sessions?.totalSessions || 0
      };
    });

    // Ordenar estudiantes por promedio
    studentScores.sort((a, b) => b.averageScore - a.averageScore);

    // Calcular tendencias de participación (últimas 4 semanas)
    let weeklyActivity = [0, 0, 0, 0];

    try {
      if (quizzes.length > 0) {
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const recentAttempts = await prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizzes.map(q => q.id) },
            completedAt: { gte: fourWeeksAgo }
          },
          orderBy: { completedAt: 'asc' }
        });

        // Agrupar intentos por semana
        recentAttempts.forEach(attempt => {
          const daysDiff = Math.floor((Date.now() - new Date(attempt.completedAt).getTime()) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.floor(daysDiff / 7);
          if (weekIndex >= 0 && weekIndex < 4) {
            weeklyActivity[3 - weekIndex]++;
          }
        });
      }
    } catch (error) {
      console.error('⚠️ [GET-COURSE-STATS] Error al calcular actividad semanal:', error.message);
      // Continuar con valores por defecto
    }

    console.log(`✅ [GET-COURSE-STATS] Estadísticas calculadas para curso ${course.code}`);

    res.json({
      success: true,
      statistics: {
        studentsCount: students.length,
        quizzesCount: quizzes.length,
        totalClasses: totalClasses,
        averageScore: averageScore,
        completionRate: completionRate,
        totalAttempts: totalAttempts,
        passedAttempts: passedAttempts,
        averageAttendanceRate: averageAttendanceRate,
        studentScores: studentScores,
        quizStats: quizStats,
        weeklyActivity: weeklyActivity
      }
    });

  } catch (error) {
    console.error('❌ [GET-COURSE-STATS] ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

/**
 * 📅 Obtener clases programadas próximas (estudiante)
 * GET /api/courses/upcoming-classes
 * Retorna clases programadas de los próximos 5 días para el estudiante
 */
export const getUpcomingClasses = async (req, res) => {
  try {
    console.log('📍 [GET-UPCOMING-CLASSES] Solicitud recibida');
    const userId = req.user.userId;

    // Obtener cursos inscritos del estudiante
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            color: true
          }
        }
      }
    });

    const courseIds = enrollments.map(e => e.course.id);

    if (courseIds.length === 0) {
      return res.json({
        success: true,
        classes: []
      });
    }

    // Calcular fecha límite (ahora + 5 días)
    const now = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(now.getDate() + 5);

    // Obtener clases programadas de los próximos 5 días
    const scheduledClasses = await prisma.classroom.findMany({
      where: {
        courseId: { in: courseIds },
        scheduledAt: {
          gte: now,
          lte: fiveDaysLater
        }
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            color: true
          }
        },
        sessions: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            sessions: true,
            attendances: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    // Formatear respuesta
    const formattedClasses = scheduledClasses.map(classroom => {
      const wasStarted = classroom.sessions.length > 0;

      return {
        id: classroom.id,
        courseId: classroom.course.id,
        courseName: classroom.course.title,
        courseCode: classroom.course.code,
        courseColor: classroom.course.color,
        title: classroom.title,
        description: classroom.description,
        date: classroom.scheduledAt,
        duration: classroom.duration || 60,
        status: classroom.isLive ? 'live' : (wasStarted ? 'completed' : 'scheduled'),
        isLive: classroom.isLive,
        wasStarted: wasStarted,
        roomCode: classroom.roomCode,
        sessionCount: classroom._count.sessions,
        attendanceCount: classroom._count.attendances
      };
    });

    console.log(`✅ [GET-UPCOMING-CLASSES] ${formattedClasses.length} clases encontradas`);

    res.json({
      success: true,
      classes: formattedClasses
    });

  } catch (error) {
    console.error('❌ [GET-UPCOMING-CLASSES] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clases programadas',
      error: error.message
    });
  }
};

/**
 * 📅 Programar una nueva clase (Docente)
 * POST /api/courses/:id/schedule-class
 */
export const scheduleClass = async (req, res) => {
  try {
    console.log('📍 [SCHEDULE-CLASS] Solicitud recibida');
    const { id } = req.params;
    const { title, description, date, time, duration } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Validar campos requeridos
    if (!title || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Título, fecha y hora son requeridos'
      });
    }

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Verificar que sea el docente del curso o admin
    if (userRole === 'TEACHER' && course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para programar clases en este curso'
      });
    }

    // Combinar fecha y hora en un DateTime
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = new Date(year, month - 1, day, hours, minutes);

    // Validar que la fecha/hora no sea en el pasado (zona horaria Ecuador UTC-5)
    const now = new Date();
    // Convertir a hora de Ecuador (UTC-5)
    const ecuadorOffset = -5 * 60; // -5 horas en minutos
    const nowEcuador = new Date(now.getTime() + (ecuadorOffset - now.getTimezoneOffset()) * 60000);

    if (scheduledAt < nowEcuador) {
      return res.status(400).json({
        success: false,
        message: 'No puedes programar clases en el pasado. Por favor selecciona una fecha y hora futura.'
      });
    }

    // Crear la clase programada
    const classroom = await prisma.classroom.create({
      data: {
        courseId: parseInt(id),
        title: title,
        description: description || '',
        scheduledAt: scheduledAt,
        duration: duration || 60,
        isLive: false
      }
    });

    console.log(`✅ [SCHEDULE-CLASS] Clase programada creada: ${classroom.id}`);

    res.status(201).json({
      success: true,
      message: 'Clase programada exitosamente',
      classroom: {
        id: classroom.id,
        title: classroom.title,
        description: classroom.description,
        date: classroom.scheduledAt,
        time: classroom.scheduledAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        duration: classroom.duration,
        status: 'scheduled'
      }
    });

  } catch (error) {
    console.error('❌ [SCHEDULE-CLASS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al programar la clase',
      error: error.message
    });
  }
};

/**
 * 📅 Obtener clases programadas de un curso (Docente)
 * GET /api/courses/:id/scheduled-classes
 */
export const getScheduledClasses = async (req, res) => {
  try {
    console.log('📍 [GET-SCHEDULED-CLASSES] Solicitud recibida');
    const { id } = req.params;
    const courseId = parseInt(id);

    // Obtener TODAS las clases programadas del curso con información de sesiones
    // No filtramos por fecha para que el docente pueda ver clases recién creadas
    const classrooms = await prisma.classroom.findMany({
      where: {
        courseId: courseId
      },
      include: {
        sessions: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            sessions: true,
            attendances: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'desc' // Mostrar las más recientes primero
      }
    });

    // Formatear respuesta
    const formattedClasses = classrooms.map(classroom => {
      // Una clase fue iniciada si tiene sesiones registradas (alguien se conectó)
      const wasStarted = classroom.sessions.length > 0;

      return {
        id: classroom.id,
        title: classroom.title,
        description: classroom.description,
        scheduledAt: classroom.scheduledAt, // ✅ FIX: Agregar scheduledAt completo para AttendanceModal
        date: classroom.scheduledAt ? classroom.scheduledAt.toISOString().split('T')[0] : null,
        time: classroom.scheduledAt ? classroom.scheduledAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
        duration: classroom.duration,
        status: classroom.isLive ? 'live' : (wasStarted ? 'completed' : 'scheduled'),
        isLive: classroom.isLive,
        wasStarted: wasStarted,
        roomCode: classroom.roomCode,
        sessionCount: classroom._count.sessions,
        attendanceCount: classroom._count.attendances
      };
    });

    console.log(`✅ [GET-SCHEDULED-CLASSES] ${formattedClasses.length} clases encontradas`);

    res.json({
      success: true,
      classes: formattedClasses
    });

  } catch (error) {
    console.error('❌ [GET-SCHEDULED-CLASSES] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clases programadas',
      error: error.message
    });
  }
};

/**
 * 📅 Cancelar clase programada (Docente)
 * DELETE /api/courses/:id/scheduled-classes/:classId
 */
export const cancelScheduledClass = async (req, res) => {
  try {
    console.log('📍 [CANCEL-SCHEDULED-CLASS] Solicitud recibida');
    const { id, classId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Verificar que la clase existe
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(classId) },
      include: { course: true }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      });
    }

    // Verificar que pertenece al curso correcto
    if (classroom.courseId !== parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'La clase no pertenece a este curso'
      });
    }

    // Verificar permisos
    if (userRole === 'TEACHER' && classroom.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar esta clase'
      });
    }

    // No permitir cancelar si está en vivo
    if (classroom.isLive) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una clase que está en vivo'
      });
    }

    // Eliminar la clase
    await prisma.classroom.delete({
      where: { id: parseInt(classId) }
    });

    console.log(`✅ [CANCEL-SCHEDULED-CLASS] Clase ${classId} cancelada`);

    res.json({
      success: true,
      message: 'Clase cancelada exitosamente'
    });

  } catch (error) {
    console.error('❌ [CANCEL-SCHEDULED-CLASS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la clase',
      error: error.message
    });
  }
};

/**
 * 📅 Obtener clases programadas de un curso (OLD - DEPRECATED)
 */
export const getScheduledClassesOld = async (req, res) => {
  try {
    const { id } = req.params;
    const courseId = parseInt(id);

    console.log('📅 [GET-SCHEDULED-CLASSES] Course ID:', courseId);

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Obtener clases programadas (futuras y actuales)
    const scheduledClasses = await prisma.classroom.findMany({
      where: {
        courseId,
        scheduledAt: {
          gte: new Date() // Solo clases futuras o en curso
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        duration: true,
        isLive: true,
        roomCode: true,
        createdAt: true
      }
    });

    console.log(`✅ [GET-SCHEDULED-CLASSES] Encontradas ${scheduledClasses.length} clases`);

    res.json({
      success: true,
      data: scheduledClasses
    });

  } catch (error) {
    console.error('❌ [GET-SCHEDULED-CLASSES] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clases programadas',
      error: error.message
    });
  }
};

/**
 * 📊 Obtener calificaciones detalladas de un estudiante en un curso
 */
export const getStudentGrades = async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    const parsedCourseId = parseInt(courseId);
    const parsedStudentId = parseInt(studentId);

    console.log('📊 [GET-STUDENT-GRADES] Course ID:', parsedCourseId, 'Student ID:', parsedStudentId);

    // Verificar que el estudiante está inscrito en el curso
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: parsedStudentId,
          courseId: parsedCourseId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        course: {
          select: {
            id: true,
            code: true,
            title: true
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no inscrito en este curso'
      });
    }

    // Obtener todos los quizzes del curso con los intentos del estudiante
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: parsedCourseId,
        isActive: true
      },
      include: {
        questions: true,
        attempts: {
          where: {
            userId: parsedStudentId
          },
          orderBy: {
            completedAt: 'desc'
          },
          select: {
            id: true,
            score: true,
            answers: true,
            completedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`🔍 [GET-STUDENT-GRADES] Encontrados ${quizzes.length} quizzes`);

    // Procesar las calificaciones
    const grades = quizzes.map(quiz => {
      const attempts = quiz.attempts;
      const totalQuestions = quiz.questions.length;

      if (attempts.length === 0) {
        return {
          activityId: quiz.id,
          activityName: quiz.title,
          activityType: 'Quiz',
          grade: null,
          status: 'pending',
          attempts: 0,
          maxAttempts: quiz.maxAttempts || 3,
          totalQuestions,
          date: null
        };
      }

      // Obtener el mejor intento
      const bestAttempt = attempts.reduce((best, current) => {
        return current.score > best.score ? current : best;
      }, attempts[0]);

      // El score ya es un porcentaje (0-100)
      const grade = Math.round(bestAttempt.score);
      const passingScore = quiz.passingScore || 70;
      const status = grade >= passingScore ? 'approved' : 'failed';

      return {
        activityId: quiz.id,
        activityName: quiz.title,
        activityType: 'Quiz',
        grade,
        status,
        attempts: attempts.length,
        maxAttempts: quiz.maxAttempts || 3,
        totalQuestions,
        passingScore,
        date: bestAttempt.completedAt
      };
    });

    // Calcular promedio general
    const completedGrades = grades.filter(g => g.grade !== null);
    const averageGrade = completedGrades.length > 0
      ? Math.round(completedGrades.reduce((sum, g) => sum + g.grade, 0) / completedGrades.length)
      : 0;

    // Calcular progreso (actividades completadas / total)
    const totalActivities = grades.length;
    const completedActivities = completedGrades.length;
    const progress = totalActivities > 0
      ? Math.round((completedActivities / totalActivities) * 100)
      : 0;

    console.log(`✅ [GET-STUDENT-GRADES] Procesadas ${grades.length} actividades`);

    res.json({
      success: true,
      data: {
        student: enrollment.user,
        course: enrollment.course,
        summary: {
          averageGrade,
          totalActivities,
          completedActivities,
          progress,
          approvedActivities: completedGrades.filter(g => g.status === 'approved').length
        },
        grades
      }
    });

  } catch (error) {
    console.error('❌ [GET-STUDENT-GRADES] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener calificaciones del estudiante',
      error: error.message
    });
  }
};

/**
 * 👥 Obtener grupos de trabajo de un curso
 * GET /api/courses/:courseId/groups
 */
export const getWorkGroups = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);

    const groups = await prisma.workGroup.findMany({
      where: { courseId: courseIdInt },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener grupos de trabajo',
      error: error.message
    });
  }
};

/**
 * 👥 Crear/Actualizar grupos de trabajo
 * POST /api/courses/:courseId/groups
 */
export const saveWorkGroups = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const { groups } = req.body;

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: courseIdInt }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Eliminar grupos existentes y crear nuevos
    await prisma.workGroup.deleteMany({
      where: { courseId: courseIdInt }
    });

    // Crear nuevos grupos
    const createdGroups = await Promise.all(
      groups.map(async (group) => {
        return await prisma.workGroup.create({
          data: {
            name: group.name,
            courseId: courseIdInt,
            students: {
              connect: group.students.map(s => ({ id: s.id }))
            }
          },
          include: {
            students: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true
              }
            }
          }
        });
      })
    );

    res.json({
      success: true,
      message: 'Grupos guardados exitosamente',
      groups: createdGroups
    });
  } catch (error) {
    console.error('Error al guardar grupos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar grupos de trabajo',
      error: error.message
    });
  }
};

/**
 * 📋 Registrar/Actualizar asistencias de una clase
 * POST /api/courses/:courseId/classrooms/:classroomId/attendance
 */
export const markAttendance = async (req, res) => {
  try {
    const { courseId, classroomId } = req.params;
    const { attendances } = req.body; // Array de { userId, status }
    const teacherId = req.user.userId;

    console.log('📍 [MARK-ATTENDANCE] Registrando asistencias para classroom:', classroomId);

    // Verificar que la clase existe y pertenece al curso
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: parseInt(classroomId),
        courseId: parseInt(courseId)
      },
      include: {
        course: true
      }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      });
    }

    // Verificar que el profesor sea el del curso
    if (req.user.role === 'TEACHER' && classroom.course.teacherId !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para registrar asistencias en esta clase'
      });
    }

    // Registrar o actualizar asistencias
    const results = await Promise.all(
      attendances.map(async ({ userId, status }) => {
        return await prisma.attendance.upsert({
          where: {
            classroomId_userId: {
              classroomId: parseInt(classroomId),
              userId: parseInt(userId)
            }
          },
          update: {
            status,
            markedBy: teacherId,
            markedAt: new Date()
          },
          create: {
            classroomId: parseInt(classroomId),
            userId: parseInt(userId),
            status,
            markedBy: teacherId
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        });
      })
    );

    console.log(`✅ [MARK-ATTENDANCE] ${results.length} asistencias registradas`);

    res.json({
      success: true,
      message: 'Asistencias registradas exitosamente',
      attendances: results
    });

  } catch (error) {
    console.error('❌ [MARK-ATTENDANCE] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar asistencias',
      error: error.message
    });
  }
};

/**
 * 📊 Obtener asistencias de un estudiante en un curso
 * GET /api/courses/:courseId/students/:studentId/attendance
 */
export const getStudentAttendance = async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    const parsedCourseId = parseInt(courseId);
    const parsedStudentId = parseInt(studentId);

    console.log('📍 [GET-STUDENT-ATTENDANCE] Obteniendo asistencias del estudiante:', studentId);

    // Si es estudiante, solo puede ver sus propias asistencias
    if (req.user.role === 'STUDENT' && req.user.userId !== parsedStudentId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver asistencias de otros estudiantes'
      });
    }

    // Verificar que el estudiante está inscrito en el curso
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: parsedStudentId,
          courseId: parsedCourseId
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no inscrito en este curso'
      });
    }

    // Obtener todas las clases del curso
    const classrooms = await prisma.classroom.findMany({
      where: {
        courseId: parsedCourseId
      },
      include: {
        attendances: {
          where: {
            userId: parsedStudentId
          }
        }
      },
      orderBy: {
        scheduledAt: 'desc'
      }
    });

    // Procesar asistencias
    const attendanceRecords = classrooms.map(classroom => {
      const attendance = classroom.attendances[0]; // Solo debería haber uno por estudiante

      return {
        classroomId: classroom.id,
        classroomTitle: classroom.title,
        scheduledAt: classroom.scheduledAt,
        status: attendance ? attendance.status : 'ABSENT',
        justification: attendance ? attendance.justification : null,
        markedAt: attendance ? attendance.markedAt : null,
        hasAttendance: !!attendance
      };
    });

    // Calcular estadísticas
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const absent = attendanceRecords.filter(a => a.status === 'ABSENT').length;
    const late = attendanceRecords.filter(a => a.status === 'LATE').length;
    const excused = attendanceRecords.filter(a => a.status === 'EXCUSED').length;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    console.log(`✅ [GET-STUDENT-ATTENDANCE] ${total} registros de asistencia encontrados`);

    res.json({
      success: true,
      data: {
        summary: {
          total,
          present,
          absent,
          late,
          excused,
          attendanceRate
        },
        records: attendanceRecords
      }
    });

  } catch (error) {
    console.error('❌ [GET-STUDENT-ATTENDANCE] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asistencias del estudiante',
      error: error.message
    });
  }
};

/**
 * ✏️ Justificar inasistencia
 * PUT /api/courses/:courseId/classrooms/:classroomId/attendance/:userId/justify
 */
export const justifyAbsence = async (req, res) => {
  try {
    const { courseId, classroomId, userId } = req.params;
    const { justification } = req.body;
    const teacherId = req.user.userId;

    console.log('📍 [JUSTIFY-ABSENCE] Justificando inasistencia para usuario:', userId);

    // Verificar que la clase existe
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: parseInt(classroomId),
        courseId: parseInt(courseId)
      },
      include: {
        course: true
      }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      });
    }

    // Verificar permisos
    if (req.user.role === 'TEACHER' && classroom.course.teacherId !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para justificar asistencias en esta clase'
      });
    }

    // Actualizar o crear asistencia justificada
    const attendance = await prisma.attendance.upsert({
      where: {
        classroomId_userId: {
          classroomId: parseInt(classroomId),
          userId: parseInt(userId)
        }
      },
      update: {
        status: 'EXCUSED',
        justification,
        markedBy: teacherId,
        markedAt: new Date()
      },
      create: {
        classroomId: parseInt(classroomId),
        userId: parseInt(userId),
        status: 'EXCUSED',
        justification,
        markedBy: teacherId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    console.log('✅ [JUSTIFY-ABSENCE] Inasistencia justificada');

    res.json({
      success: true,
      message: 'Inasistencia justificada exitosamente',
      attendance
    });

  } catch (error) {
    console.error('❌ [JUSTIFY-ABSENCE] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al justificar inasistencia',
      error: error.message
    });
  }
};

/**
 * 📊 Obtener asistencias de una clase específica
 * GET /api/courses/:courseId/classrooms/:classroomId/attendance
 */
export const getClassroomAttendance = async (req, res) => {
  try {
    const { courseId, classroomId } = req.params;

    console.log('📍 [GET-CLASSROOM-ATTENDANCE] Obteniendo asistencias de la clase:', classroomId);

    // Verificar que la clase existe
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: parseInt(classroomId),
        courseId: parseInt(courseId)
      }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      });
    }

    // Obtener estudiantes del curso
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: parseInt(courseId),
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Obtener asistencias existentes
    const attendances = await prisma.attendance.findMany({
      where: {
        classroomId: parseInt(classroomId)
      }
    });

    // Crear mapa de asistencias
    const attendanceMap = {};
    attendances.forEach(att => {
      attendanceMap[att.userId] = att;
    });

    // Combinar información
    const students = enrollments.map(e => ({
      ...e.user,
      attendance: attendanceMap[e.user.id] || null,
      status: attendanceMap[e.user.id]?.status || 'ABSENT'
    }));

    console.log(`✅ [GET-CLASSROOM-ATTENDANCE] ${students.length} estudiantes procesados`);

    res.json({
      success: true,
      classroom: {
        id: classroom.id,
        title: classroom.title,
        scheduledAt: classroom.scheduledAt
      },
      students
    });

  } catch (error) {
    console.error('❌ [GET-CLASSROOM-ATTENDANCE] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asistencias de la clase',
      error: error.message
    });
  }
};

/**
 * 📅 Configurar horario de un curso
 * POST /api/courses/:courseId/schedule
 */
export const setCourseSchedule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { schedules, startDate, endDate, durationWeeks } = req.body;
    const teacherId = req.user.userId;

    console.log('📍 [SET-COURSE-SCHEDULE] Configurando horario para curso:', courseId);

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Verificar permisos
    if (req.user.role === 'TEACHER' && course.teacherId !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para configurar el horario de este curso'
      });
    }

    // Actualizar fechas y duración del curso
    await prisma.course.update({
      where: { id: parseInt(courseId) },
      data: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        durationWeeks: durationWeeks ? parseInt(durationWeeks) : null
      }
    });

    // Eliminar horarios existentes
    await prisma.courseSchedule.deleteMany({
      where: { courseId: parseInt(courseId) }
    });

    // Crear nuevos horarios
    const createdSchedules = await Promise.all(
      schedules.map(schedule =>
        prisma.courseSchedule.create({
          data: {
            courseId: parseInt(courseId),
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime
          }
        })
      )
    );

    console.log(`✅ [SET-COURSE-SCHEDULE] ${createdSchedules.length} horarios configurados`);

    res.json({
      success: true,
      message: 'Horario configurado exitosamente',
      schedules: createdSchedules
    });

  } catch (error) {
    console.error('❌ [SET-COURSE-SCHEDULE] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al configurar horario',
      error: error.message
    });
  }
};

/**
 * 📅 Obtener horario de un curso
 * GET /api/courses/:courseId/schedule
 */
export const getCourseSchedule = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log('📍 [GET-COURSE-SCHEDULE] Obteniendo horario del curso:', courseId);

    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
      include: {
        schedules: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        startDate: course.startDate,
        endDate: course.endDate,
        durationWeeks: course.durationWeeks,
        schedules: course.schedules
      }
    });

  } catch (error) {
    console.error('❌ [GET-COURSE-SCHEDULE] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horario',
      error: error.message
    });
  }
};

/**
 * 🎯 Generar clases automáticamente según horario
 * POST /api/courses/:courseId/generate-classes
 */
export const generateClassesFromSchedule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.userId;

    console.log('📍 [GENERATE-CLASSES] Generando clases para curso:', courseId);

    // Obtener curso con horarios
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
      include: {
        schedules: true
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Verificar permisos
    if (req.user.role === 'TEACHER' && course.teacherId !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para generar clases en este curso'
      });
    }

    if (!course.startDate || !course.schedules.length) {
      return res.status(400).json({
        success: false,
        message: 'El curso debe tener fecha de inicio y horarios configurados'
      });
    }

    // Calcular fecha de fin si no existe
    let endDate = course.endDate;
    if (!endDate && course.durationWeeks) {
      endDate = new Date(course.startDate);
      endDate.setDate(endDate.getDate() + (course.durationWeeks * 7));
    }

    if (!endDate) {
      return res.status(400).json({
        success: false,
        message: 'El curso debe tener fecha de fin o duración en semanas'
      });
    }

    // Mapeo de días
    const dayMap = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 0
    };

    const generatedClasses = [];
    const currentDate = new Date(course.startDate);

    // Generar clases para cada horario configurado
    while (currentDate <= endDate) {
      for (const schedule of course.schedules) {
        const scheduleDayNum = dayMap[schedule.dayOfWeek];
        const currentDayNum = currentDate.getDay();

        if (currentDayNum === scheduleDayNum) {
          // Crear fecha y hora de la clase
          const [startHour, startMinute] = schedule.startTime.split(':');
          const [endHour, endMinute] = schedule.endTime.split(':');

          const classDate = new Date(currentDate);
          classDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

          const classEndDate = new Date(currentDate);
          classEndDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

          const durationMinutes = (classEndDate - classDate) / (1000 * 60);

          // Crear la clase
          const classroom = await prisma.classroom.create({
            data: {
              courseId: parseInt(courseId),
              title: `Clase ${course.code} - ${schedule.dayOfWeek}`,
              description: `Clase programada automáticamente`,
              scheduledAt: classDate,
              duration: durationMinutes
            }
          });

          generatedClasses.push(classroom);
        }
      }

      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`✅ [GENERATE-CLASSES] ${generatedClasses.length} clases generadas`);

    res.json({
      success: true,
      message: `${generatedClasses.length} clases generadas exitosamente`,
      classes: generatedClasses
    });

  } catch (error) {
    console.error('❌ [GENERATE-CLASSES] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar clases',
      error: error.message
    });
  }
};

/**
 * ✅ ESTUDIANTE - Auto-registrar asistencia
 * POST /api/courses/:courseId/classrooms/:classroomId/self-attendance
 */
export const selfRegisterAttendance = async (req, res) => {
  try {
    const { courseId, classroomId } = req.params;
    const studentId = req.user.userId;

    console.log('📍 [SELF-ATTENDANCE] Estudiante', studentId, 'registrando asistencia en clase', classroomId);

    // Verificar que el estudiante está inscrito en el curso
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        courseId: parseInt(courseId),
        isActive: true
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'No estás inscrito en este curso'
      });
    }

    // Verificar que la clase existe y obtener sus detalles
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: parseInt(classroomId),
        courseId: parseInt(courseId)
      },
      include: {
        course: {
          include: {
            schedules: true
          }
        }
      }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      });
    }

    // Obtener fecha y hora actual
    const now = new Date();

    // Si no hay scheduledAt, no se puede validar el horario
    if (!classroom.scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Esta clase no tiene horario programado'
      });
    }

    const scheduledTime = new Date(classroom.scheduledAt);
    const duration = classroom.duration || 60; // Duración en minutos por defecto 60
    const endTime = new Date(scheduledTime.getTime() + duration * 60000);

    // Configuración de tolerancias
    const EARLY_MINUTES = 15; // Puede registrar hasta 15 minutos antes
    const LATE_MINUTES = 15; // Hasta 15 minutos tarde = LATE
    const MAX_LATE_MINUTES = 30; // Después de 30 minutos ya no puede registrar

    const earlyTime = new Date(scheduledTime.getTime() - EARLY_MINUTES * 60000);
    const lateTime = new Date(scheduledTime.getTime() + LATE_MINUTES * 60000);
    const maxLateTime = new Date(scheduledTime.getTime() + MAX_LATE_MINUTES * 60000);

    // Validar que esté dentro del rango permitido
    if (now < earlyTime) {
      const minutesEarly = Math.ceil((earlyTime - now) / 60000);
      return res.status(400).json({
        success: false,
        message: `La clase aún no está disponible para registro. Puedes registrar asistencia ${minutesEarly} minutos antes de la hora programada.`,
        scheduledTime: scheduledTime
      });
    }

    if (now > maxLateTime) {
      return res.status(400).json({
        success: false,
        message: 'El tiempo para registrar asistencia ha expirado. Has llegado demasiado tarde.',
        scheduledTime: scheduledTime
      });
    }

    // Verificar si ya existe un registro de asistencia
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        classroomId_userId: {
          classroomId: parseInt(classroomId),
          userId: studentId
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Ya has registrado tu asistencia para esta clase',
        attendance: existingAttendance
      });
    }

    // Determinar el estado según la hora de llegada
    let status;
    if (now <= scheduledTime.getTime()) {
      status = 'PRESENT'; // A tiempo o temprano
    } else if (now <= lateTime) {
      status = 'LATE'; // Tarde pero dentro de tolerancia
    } else {
      status = 'LATE'; // Muy tarde (entre 15-30 min)
    }

    // Crear registro de asistencia
    const attendance = await prisma.attendance.create({
      data: {
        classroomId: parseInt(classroomId),
        userId: studentId,
        status: status,
        markedBy: studentId, // Auto-registro
        markedAt: now
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        classroom: {
          select: {
            id: true,
            title: true,
            scheduledAt: true
          }
        }
      }
    });

    const statusMessage = {
      'PRESENT': 'Asistencia registrada exitosamente. ¡Llegaste a tiempo!',
      'LATE': 'Asistencia registrada como TARDE. Has llegado después de la hora programada.'
    };

    console.log(`✅ [SELF-ATTENDANCE] Asistencia registrada: ${status}`);

    res.json({
      success: true,
      message: statusMessage[status],
      attendance: attendance,
      status: status
    });

  } catch (error) {
    console.error('❌ [SELF-ATTENDANCE] ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar asistencia',
      error: error.message
    });
  }
};

/**
 * 🔴 ESTUDIANTE - Obtener clases en vivo activas
 * GET /api/courses/active-live-classes
 */
export const getActiveLiveClasses = async (req, res) => {
  try {
    console.log('📍 [GET-ACTIVE-LIVE] Solicitud recibida');
    const studentId = req.user.userId;

    // Obtener cursos en los que está inscrito el estudiante
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: studentId,
        isActive: true
      },
      select: {
        courseId: true
      }
    });

    const courseIds = enrollments.map(e => e.courseId);

    if (courseIds.length === 0) {
      return res.json({
        success: true,
        liveClasses: []
      });
    }

    // Buscar clases en vivo activas en esos cursos
    const liveClassrooms = await prisma.classroom.findMany({
      where: {
        courseId: { in: courseIds },
        isLive: true
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            color: true,
            teacher: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ [GET-ACTIVE-LIVE] ${liveClassrooms.length} clases en vivo encontradas`);

    // Formatear respuesta
    const formattedClasses = liveClassrooms.map(classroom => ({
      classroomId: classroom.id,
      courseId: classroom.course.id,
      courseCode: classroom.course.code,
      courseTitle: classroom.course.title,
      courseColor: classroom.course.color,
      classTitle: classroom.title,
      teacherName: classroom.course.teacher.name,
      roomCode: classroom.roomCode
    }));

    res.json({
      success: true,
      liveClasses: formattedClasses
    });

  } catch (error) {
    console.error('❌ [GET-ACTIVE-LIVE] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clases en vivo',
      error: error.message
    });
  }
};
// backend/src/controllers/auth.controller.js

import prisma from '../config/db.js';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import redis from '../config/redis.js';
import { validateFullName, validateUsername, validateEmail, validatePassword } from '../utils/validation.js';


/**
 * 🔐 LOGIN UNIVERSAL
 * POST /api/auth/login
 */
/**
 * 🔐 LOGIN UNIVERSAL
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    console.log('📍 [LOGIN] Solicitud recibida');
    console.log('📍 [LOGIN] Body:', req.body);

    const { username, password } = req.body;

    // Validaciones básicas
    if (!username || !password) {
      console.log('❌ [LOGIN] Falta username o password');
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    console.log(`📍 [LOGIN] Buscando usuario: ${username}`);

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      console.log(`❌ [LOGIN] Usuario no encontrado: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    console.log(`✅ [LOGIN] Usuario encontrado: ${username}`);
    console.log(`📍 [LOGIN] Verificando contraseña...`);

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(`❌ [LOGIN] Contraseña incorrecta para: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    console.log(`✅ [LOGIN] Contraseña correcta`);

    // Verificar si está activo
    if (!user.isActive) {
      console.log(`❌ [LOGIN] Usuario desactivado: ${username}`);
      return res.status(403).json({
        success: false,
        message: 'Usuario desactivado. Contacta al administrador'
      });
    }

    console.log(`✅ [LOGIN] Usuario activo`);
    console.log(`📍 [LOGIN] Generando JWT...`);

    // Generar JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'tu_super_secreto_jwt_cambiar_en_produccion',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log(`✅ [LOGIN] JWT generado`);

    // Guardar en Redis
    console.log('💾 [LOGIN] Intentando guardar sesión en Redis...');
    console.log('💾 [LOGIN] userId:', user.id);
    console.log('💾 [LOGIN] Key de Redis:', `session:${user.id}`);
    
    try {
      const sessionData = JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
        loginTime: new Date().toISOString()
      });
      
      console.log('💾 [LOGIN] Datos a guardar:', sessionData);
      console.log('💾 [LOGIN] Cliente Redis disponible:', !!redis);
      console.log('💾 [LOGIN] Método setEx disponible:', typeof redis.setEx);
      
      await redis.setEx(
        `session:${user.id}`,
        7 * 24 * 60 * 60,
        sessionData
      );
      
      console.log('✅ [LOGIN] Sesión guardada en Redis');
      
      // Verificar que se guardó
      const verification = await redis.get(`session:${user.id}`);
      console.log('🔍 [LOGIN] Verificación - Sesión guardada:', verification ? 'SÍ' : 'NO');
      if (verification) {
        console.log('🔍 [LOGIN] Contenido:', verification);
      }
      
    } catch (redisError) {
      console.error('❌ [LOGIN] Error guardando en Redis:', redisError.message);
      console.error('❌ [LOGIN] Stack:', redisError.stack);
      // No fallar el login si Redis falla
    }

    // Respuesta exitosa
    console.log(`✅ [LOGIN] LOGIN EXITOSO para: ${username}`);
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ [LOGIN] ERROR:', error.message);
    console.error('❌ [LOGIN] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};



/**
 * 🚪 LOGOUT
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    console.log('📍 [LOGOUT] Solicitud recibida');
    const userId = req.user.id;
    
    // Eliminar sesión de Redis
    await redis.del(`session:${userId}`);

    console.log(`✅ [LOGOUT] LOGOUT EXITOSO para usuario ID: ${userId}`);
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('❌ [LOGOUT] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
};

/**
 * 👤 GET USUARIO ACTUAL
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    console.log('📍 [GET-ME] Solicitud recibida');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log(`❌ [GET-ME] Usuario no encontrado ID: ${req.user.userId}`);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ [GET-ME] Usuario obtenido: ${user.username}`);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ [GET-ME] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
};

/**
 * 👨‍🏫 ADMIN - CREAR DOCENTE
 * POST /api/auth/users/teacher
 */
export const createTeacher = async (req, res) => {
  try {
    console.log('📍 [CREATE-TEACHER] Solicitud recibida');
    const { username, email, password, name } = req.body;
    const adminId = req.user.id;

    // Validaciones
    if (!username || !email || !password || !name) {
      console.log('❌ [CREATE-TEACHER] Faltan campos requeridos');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Validar nombre completo
    const nameValidation = validateFullName(name);
    if (!nameValidation.valid) {
      console.log('❌ [CREATE-TEACHER]', nameValidation.message);
      return res.status(400).json({
        success: false,
        message: nameValidation.message
      });
    }

    // Validar username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.log('❌ [CREATE-TEACHER]', usernameValidation.message);
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      });
    }

    // Validar email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      console.log('❌ [CREATE-TEACHER]', emailValidation.message);
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    // Validar password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.log('❌ [CREATE-TEACHER]', passwordValidation.message);
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Verificar que no exista
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      console.log('❌ [CREATE-TEACHER] Usuario/email ya existe');
      return res.status(400).json({
        success: false,
        message: 'El usuario o email ya existe'
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear docente
    const teacher = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        role: 'TEACHER',
        createdBy: adminId
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log(`✅ [CREATE-TEACHER] Docente creado: ${username}`);
    res.status(201).json({
      success: true,
      message: 'Docente creado exitosamente',
      teacher
    });
  } catch (error) {
    console.error('❌ [CREATE-TEACHER] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear docente',
      error: error.message
    });
  }
};

/**
 * 👨‍🏫 ADMIN - LISTAR DOCENTES
 * GET /api/auth/users/teachers
 */
export const getTeachers = async (req, res) => {
  try {
    console.log('📍 [GET-TEACHERS] Solicitud recibida');
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            teachingCourses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ [GET-TEACHERS] ${teachers.length} docentes obtenidos`);
    res.json({
      success: true,
      total: teachers.length,
      teachers
    });
  } catch (error) {
    console.error('❌ [GET-TEACHERS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener docentes'
    });
  }
};

/**
 * 👨‍🏫 ADMIN - CAMBIAR ESTADO DOCENTE
 * PATCH /api/auth/users/:id/toggle-status
 */
export const toggleUserStatus = async (req, res) => {
  try {
    console.log('📍 [TOGGLE-STATUS] Solicitud recibida');
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`❌ [TOGGLE-STATUS] Usuario no encontrado ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    console.log(`✅ [TOGGLE-STATUS] Estado actualizado para: ${updated.username}`);
    res.json({
      success: true,
      message: `Usuario ${updated.isActive ? 'activado' : 'desactivado'}`,
      user: updated
    });
  } catch (error) {
    console.error('❌ [TOGGLE-STATUS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado'
    });
  }
};

/**
 * 👨‍🎓 DOCENTE - CREAR ESTUDIANTE
 * POST /api/auth/users/student
 */
export const createStudent = async (req, res) => {
  try {
    console.log('📍 [CREATE-STUDENT] Solicitud recibida');
    const { username, email, password, name, courseId } = req.body;
    const teacherId = req.user.id;

    if (!username || !email || !password || !name) {
      console.log('❌ [CREATE-STUDENT] Faltan campos requeridos');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Validar nombre completo
    const nameValidation = validateFullName(name);
    if (!nameValidation.valid) {
      console.log('❌ [CREATE-STUDENT]', nameValidation.message);
      return res.status(400).json({
        success: false,
        message: nameValidation.message
      });
    }

    // Validar username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.log('❌ [CREATE-STUDENT]', usernameValidation.message);
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      });
    }

    // Validar email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      console.log('❌ [CREATE-STUDENT]', emailValidation.message);
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    // Validar password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.log('❌ [CREATE-STUDENT]', passwordValidation.message);
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      console.log('❌ [CREATE-STUDENT] Usuario/email ya existe');
      return res.status(400).json({
        success: false,
        message: 'El usuario o email ya existe'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        role: 'STUDENT',
        createdBy: teacherId
      }
    });

    if (courseId) {
      await prisma.enrollment.create({
        data: {
          userId: student.id,
          courseId: parseInt(courseId),
          enrolledBy: teacherId
        }
      });
    }

    console.log(`✅ [CREATE-STUDENT] Estudiante creado: ${username}`);
    res.status(201).json({
      success: true,
      message: 'Estudiante creado exitosamente',
      student: {
        id: student.id,
        username: student.username,
        email: student.email,
        name: student.name,
        role: student.role
      }
    });
  } catch (error) {
    console.error('❌ [CREATE-STUDENT] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear estudiante',
      error: error.message
    });
  }
};

/**
 * 👨‍🎓 DOCENTE - LISTAR ESTUDIANTES
 * GET /api/auth/users/students
 */
export const getStudents = async (req, res) => {
  try {
    console.log('📍 [GET-STUDENTS] Solicitud recibida');
    const teacherId = req.user.id;
    const { courseId } = req.query;

    if (courseId) {
      const students = await prisma.enrollment.findMany({
        where: {
          courseId: parseInt(courseId),
          course: {
            teacherId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              name: true,
              isActive: true
            }
          }
        }
      });

      console.log(`✅ [GET-STUDENTS] ${students.length} estudiantes obtenidos por materia`);
      return res.json({
        success: true,
        total: students.length,
        students: students.map(e => ({
          ...e.user,
          enrollmentId: e.id,
          enrolledAt: e.enrolledAt
        }))
      });
    }

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        createdBy: teacherId
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ [GET-STUDENTS] ${students.length} estudiantes obtenidos`);
    res.json({
      success: true,
      total: students.length,
      students
    });
  } catch (error) {
    console.error('❌ [GET-STUDENTS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estudiantes'
    });
  }
};

/**
 * 👨‍🎓 DOCENTE - CAMBIAR ESTADO ESTUDIANTE
 * PATCH /api/auth/users/students/:id/toggle-status
 */
export const toggleStudentStatus = async (req, res) => {
  try {
    console.log('📍 [TOGGLE-STUDENT] Solicitud recibida');
    const { id } = req.params;
    const studentId = parseInt(id);

    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      console.log(`❌ [TOGGLE-STUDENT] Estudiante no encontrado ID: ${studentId}`);
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado'
      });
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: {
        isActive: !student.isActive
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        isActive: true
      }
    });

    console.log(`✅ [TOGGLE-STUDENT] Estado actualizado para: ${updated.username}`);
    res.json({
      success: true,
      message: `Estudiante ${updated.isActive ? 'activado' : 'desactivado'}`,
      student: updated
    });
  } catch (error) {
    console.error('❌ [TOGGLE-STUDENT] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado'
    });
  }
};

// backend/src/controllers/auth.controller.js
// AGREGAR ESTA FUNCIÓN AL ARCHIVO EXISTENTE

/**
 * 🔐 CAMBIAR CONTRASEÑA
 * POST /api/auth/change-password
 */
export const changePassword = async (req, res) => {
  try {
    console.log('📍 [CHANGE-PASSWORD] Solicitud recibida');
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId; // Del JWT

    // Validaciones
    if (!currentPassword || !newPassword) {
      console.log('❌ [CHANGE-PASSWORD] Faltan campos');
      return res.status(400).json({
        success: false,
        message: 'Se requiere contraseña actual y nueva contraseña'
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ [CHANGE-PASSWORD] Contraseña muy corta');
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    if (currentPassword === newPassword) {
      console.log('❌ [CHANGE-PASSWORD] Contraseñas iguales');
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    console.log(`📍 [CHANGE-PASSWORD] Buscando usuario: ${userId}`);

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        password: true
      }
    });

    if (!user) {
      console.log('❌ [CHANGE-PASSWORD] Usuario no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log('📍 [CHANGE-PASSWORD] Verificando contraseña actual...');

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      console.log('❌ [CHANGE-PASSWORD] Contraseña actual incorrecta');
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    console.log('✅ [CHANGE-PASSWORD] Contraseña actual correcta');
    console.log('📍 [CHANGE-PASSWORD] Hasheando nueva contraseña...');

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('📍 [CHANGE-PASSWORD] Actualizando contraseña en BD...');

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    });

    console.log(`✅ [CHANGE-PASSWORD] Contraseña cambiada para: ${user.username}`);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error) {
    console.error('❌ [CHANGE-PASSWORD] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
};

// backend/src/controllers/auth.controller.js
// AGREGAR ESTA FUNCIÓN AL ARCHIVO EXISTENTE

/**
 * 👤 ACTUALIZAR PERFIL
 * PATCH /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    console.log('📍 [UPDATE-PROFILE] Solicitud recibida');
    const { name, email } = req.body;
    const userId = req.user.userId;

    // Validaciones
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: 'Proporciona al menos un campo para actualizar'
      });
    }

    console.log(`📍 [UPDATE-PROFILE] Actualizando usuario: ${userId}`);

    // Si se quiere cambiar el email, verificar que no exista
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        console.log('❌ [UPDATE-PROFILE] Email ya existe');
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso por otro usuario'
        });
      }
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email })
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true
      }
    });

    console.log(`✅ [UPDATE-PROFILE] Perfil actualizado: ${updatedUser.username}`);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ [UPDATE-PROFILE] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
};

// backend/src/controllers/course.controller.js
// AGREGAR ESTAS FUNCIONES AL ARCHIVO EXISTENTE

/**
 * 👥 OBTENER ESTUDIANTES DE UN CURSO
 * GET /api/courses/:id/students
 */
export const getCourseStudents = async (req, res) => {
  try {
    console.log('📍 [GET-COURSE-STUDENTS] Solicitud recibida');
    const { id } = req.params;
    const userId = req.user.userId;

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
    if (req.user.role === 'TEACHER') {
      if (course.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver los estudiantes de este curso'
        });
      }
    }

    // Obtener estudiantes inscritos
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: parseInt(id)
      },
      include: {
        student: {
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

    const students = enrollments.map(e => e.student);

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
    const userId = req.user.userId;

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
    if (req.user.role === 'TEACHER') {
      if (course.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para inscribir estudiantes en este curso'
        });
      }
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
        studentId,
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
        studentId,
        courseId: parseInt(id)
      },
      include: {
        student: {
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
    if (req.user.role === 'TEACHER') {
      if (course.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para desinscribir estudiantes de este curso'
        });
      }
    }

    // Verificar que la inscripción existe
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: parseInt(studentId),
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
 * 📋 OBTENER TODOS LOS ESTUDIANTES (PARA AGREGAR)
 * GET /api/auth/users/students
 */
// Esta función ya puede estar en auth.controller.js, si no existe, agregarla:
export const getAllStudents = async (req, res) => {
  try {
    console.log('📍 [GET-ALL-STUDENTS] Solicitud recibida');

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT'
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ [GET-ALL-STUDENTS] ${students.length} estudiantes encontrados`);

    res.json({
      success: true,
      students
    });
  } catch (error) {
    console.error('❌ [GET-ALL-STUDENTS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estudiantes',
      error: error.message
    });
  }
};

/**
 * 📋 OBTENER ESTUDIANTES DISPONIBLES PARA ASIGNAR A UN CURSO
 * GET /api/auth/users/students/available
 * Query params: courseId (requerido), search (opcional)
 */
export const getAvailableStudents = async (req, res) => {
  try {
    console.log('📍 [GET-AVAILABLE-STUDENTS] Solicitud recibida');
    const { courseId, search } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del curso'
      });
    }

    // Obtener IDs de estudiantes ya inscritos en el curso
    const enrolledStudents = await prisma.enrollment.findMany({
      where: {
        courseId: parseInt(courseId),
        isActive: true
      },
      select: {
        userId: true
      }
    });

    const enrolledIds = enrolledStudents.map(e => e.userId);
    console.log(`📋 [GET-AVAILABLE-STUDENTS] ${enrolledIds.length} estudiantes ya inscritos en curso ${courseId}`);

    // Construir filtro de búsqueda
    const whereClause = {
      role: 'STUDENT',
      isActive: true,
      id: {
        notIn: enrolledIds
      }
    };

    // Agregar búsqueda por nombre o email si se proporciona
    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ [GET-AVAILABLE-STUDENTS] ${students.length} estudiantes disponibles`);

    res.json({
      success: true,
      total: students.length,
      students
    });
  } catch (error) {
    console.error('❌ [GET-AVAILABLE-STUDENTS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estudiantes disponibles',
      error: error.message
    });
  }
};

/**
 * 📥 IMPORTAR ESTUDIANTES MASIVAMENTE
 * POST /api/auth/users/students/import
 * Body: { students: [{ username, name, email, password }] }
 */
export const importStudents = async (req, res) => {
  try {
    console.log('📍 [IMPORT-STUDENTS] Solicitud recibida');
    const { students } = req.body;
    const createdBy = req.user.id;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de estudiantes'
      });
    }

    console.log(`📋 [IMPORT-STUDENTS] Procesando ${students.length} estudiantes`);

    const results = {
      success: [],
      errors: [],
      duplicates: []
    };

    for (const student of students) {
      try {
        const { username, name, email, password } = student;

        // Validar campos requeridos
        if (!username || !name || !email || !password) {
          results.errors.push({
            student,
            error: 'Faltan campos requeridos (username, name, email, password)'
          });
          continue;
        }

        // Verificar si ya existe por username o email
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { username: username.toLowerCase() },
              { email: email.toLowerCase() }
            ]
          }
        });

        if (existing) {
          results.duplicates.push({
            student,
            existingId: existing.id,
            existingUsername: existing.username
          });
          continue;
        }

        // Validaciones
        const nameValidation = validateFullName(name);
        if (!nameValidation.valid) {
          results.errors.push({ student, error: nameValidation.message });
          continue;
        }

        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
          results.errors.push({ student, error: usernameValidation.message });
          continue;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          results.errors.push({ student, error: emailValidation.message });
          continue;
        }

        // Crear el estudiante
        const hashedPassword = await bcrypt.hash(password, 10);
        const newStudent = await prisma.user.create({
          data: {
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            name: name.trim(),
            role: 'STUDENT',
            createdBy
          },
          select: {
            id: true,
            username: true,
            name: true,
            email: true
          }
        });

        results.success.push(newStudent);
      } catch (err) {
        results.errors.push({
          student,
          error: err.message
        });
      }
    }

    console.log(`✅ [IMPORT-STUDENTS] Completado: ${results.success.length} creados, ${results.duplicates.length} duplicados, ${results.errors.length} errores`);

    res.json({
      success: true,
      message: `Importación completada: ${results.success.length} creados, ${results.duplicates.length} duplicados, ${results.errors.length} errores`,
      results
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

/**
 * ✏️ ADMIN - EDITAR USUARIO
 * PATCH /api/auth/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    console.log('📍 [UPDATE-USER] Solicitud recibida');
    const { id } = req.params;
    const { name, email, username, role, isActive } = req.body;
    const userId = parseInt(id);

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`❌ [UPDATE-USER] Usuario no encontrado ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Validar nombre completo si se está actualizando
    if (name) {
      const nameValidation = validateFullName(name);
      if (!nameValidation.valid) {
        console.log('❌ [UPDATE-USER]', nameValidation.message);
        return res.status(400).json({
          success: false,
          message: nameValidation.message
        });
      }
    }

    // Validar username si se está actualizando
    if (username && username !== user.username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        console.log('❌ [UPDATE-USER]', usernameValidation.message);
        return res.status(400).json({
          success: false,
          message: usernameValidation.message
        });
      }
    }

    // Validar email si se está actualizando
    if (email && email !== user.email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        console.log('❌ [UPDATE-USER]', emailValidation.message);
        return res.status(400).json({
          success: false,
          message: emailValidation.message
        });
      }
    }

    // Verificar si el email o username ya existen (si se están cambiando)
    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso'
        });
      }
    }

    if (username && username !== user.username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya está en uso'
        });
      }
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(username && { username }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log(`✅ [UPDATE-USER] Usuario actualizado: ${updatedUser.username}`);
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ [UPDATE-USER] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

/**
 * 🔐 ADMIN - RESETEAR CONTRASEÑA DE USUARIO
 * POST /api/auth/users/:id/reset-password
 */
export const resetUserPassword = async (req, res) => {
  try {
    console.log('📍 [RESET-PASSWORD] Solicitud recibida');
    const { id } = req.params;
    const { newPassword } = req.body;
    const userId = parseInt(id);

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Nueva contraseña es requerida'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    });

    console.log(`✅ [RESET-PASSWORD] Contraseña reseteada para: ${user.username}`);
    res.json({
      success: true,
      message: 'Contraseña reseteada exitosamente'
    });
  } catch (error) {
    console.error('❌ [RESET-PASSWORD] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al resetear contraseña',
      error: error.message
    });
  }
};

/**
 * 🗑️ ADMIN - ELIMINAR USUARIO
 * DELETE /api/auth/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    console.log('📍 [DELETE-USER] Solicitud recibida');
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir eliminar admins
    if (user.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No se puede eliminar un administrador'
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`✅ [DELETE-USER] Usuario eliminado: ${user.username}`);
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ [DELETE-USER] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};
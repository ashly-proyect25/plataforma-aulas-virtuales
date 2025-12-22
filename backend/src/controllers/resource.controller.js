// backend/src/controllers/resource.controller.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



// ==================== COURSE RESOURCES ====================

/**
 * 📚 Crear recurso de materia
 * POST /api/courses/:courseId/resources
 */
export const createResource = async (req, res) => {
  try {
    console.log('📍 [CREATE-RESOURCE] Solicitud recibida');
    const { courseId } = req.params;
    const { title, description, type, content, fileUrl, order } = req.body;
    const userId = req.user.userId;

    // Validaciones
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Título y tipo son requeridos'
      });
    }

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
    if (req.user.role === 'TEACHER' && course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para agregar recursos a este curso'
      });
    }

    // Crear recurso
    const resource = await prisma.courseResource.create({
      data: {
        courseId: parseInt(courseId),
        title,
        description,
        type,
        content,
        fileUrl,
        order: order || 0
      }
    });

    console.log(`✅ [CREATE-RESOURCE] Recurso creado: ${resource.title}`);
    res.status(201).json({
      success: true,
      message: 'Recurso creado exitosamente',
      resource
    });
  } catch (error) {
    console.error('❌ [CREATE-RESOURCE] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear recurso',
      error: error.message
    });
  }
};

/**
 * 📚 Obtener recursos de un curso
 * GET /api/courses/:courseId/resources
 */
export const getCourseResources = async (req, res) => {
  try {
    console.log('📍 [GET-RESOURCES] Solicitud recibida');
    const { courseId } = req.params;
    const { type } = req.query;

    const resources = await prisma.courseResource.findMany({
      where: {
        courseId: parseInt(courseId),
        isActive: true,
        ...(type && { type })
      },
      orderBy: {
        order: 'asc'
      }
    });

    console.log(`✅ [GET-RESOURCES] ${resources.length} recursos encontrados`);
    res.json({
      success: true,
      resources
    });
  } catch (error) {
    console.error('❌ [GET-RESOURCES] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recursos',
      error: error.message
    });
  }
};

/**
 * 📚 Actualizar recurso
 * PATCH /api/resources/:id
 */
export const updateResource = async (req, res) => {
  try {
    console.log('📍 [UPDATE-RESOURCE] Solicitud recibida');
    const { id } = req.params;
    const { title, description, content, fileUrl, order } = req.body;
    const userId = req.user.userId;

    const resource = await prisma.courseResource.findUnique({
      where: { id: parseInt(id) },
      include: { course: true }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Recurso no encontrado'
      });
    }

    // Verificar permisos
    if (req.user.role === 'TEACHER' && resource.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar este recurso'
      });
    }

    const updated = await prisma.courseResource.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(order !== undefined && { order })
      }
    });

    console.log(`✅ [UPDATE-RESOURCE] Recurso actualizado: ${updated.title}`);
    res.json({
      success: true,
      message: 'Recurso actualizado exitosamente',
      resource: updated
    });
  } catch (error) {
    console.error('❌ [UPDATE-RESOURCE] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar recurso',
      error: error.message
    });
  }
};

/**
 * 📚 Eliminar recurso
 * DELETE /api/resources/:id
 */
export const deleteResource = async (req, res) => {
  try {
    console.log('📍 [DELETE-RESOURCE] Solicitud recibida');
    const { id } = req.params;
    const userId = req.user.userId;

    const resource = await prisma.courseResource.findUnique({
      where: { id: parseInt(id) },
      include: { course: true }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Recurso no encontrado'
      });
    }

    // Verificar permisos
    if (req.user.role === 'TEACHER' && resource.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este recurso'
      });
    }

    await prisma.courseResource.delete({
      where: { id: parseInt(id) }
    });

    console.log(`✅ [DELETE-RESOURCE] Recurso eliminado`);
    res.json({
      success: true,
      message: 'Recurso eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ [DELETE-RESOURCE] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar recurso',
      error: error.message
    });
  }
};

// ==================== QUIZZES ====================

/**
 * 📝 Crear quiz
 * POST /api/courses/:courseId/quizzes
 */
export const createQuiz = async (req, res) => {
  try {
    console.log('📍 [CREATE-QUIZ] Solicitud recibida');
    const { courseId } = req.params;
    const { title, description, duration, questions } = req.body;
    const userId = req.user.userId;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Título y preguntas son requeridos'
      });
    }

    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    if (req.user.role === 'TEACHER' && course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para crear quizzes en este curso'
      });
    }

    const quiz = await prisma.quiz.create({
      data: {
        courseId: parseInt(courseId),
        title,
        description,
        duration,
        questions: {
          create: questions.map((q, index) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            order: index
          }))
        }
      },
      include: {
        questions: true
      }
    });

    console.log(`✅ [CREATE-QUIZ] Quiz creado: ${quiz.title}`);
    res.status(201).json({
      success: true,
      message: 'Quiz creado exitosamente',
      quiz
    });
  } catch (error) {
    console.error('❌ [CREATE-QUIZ] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear quiz',
      error: error.message
    });
  }
};

/**
 * 📝 Obtener quizzes de un curso
 * GET /api/courses/:courseId/quizzes
 */
export const getCourseQuizzes = async (req, res) => {
  try {
    console.log('📍 [GET-QUIZZES] Solicitud recibida');
    const { courseId } = req.params;

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: parseInt(courseId),
        isActive: true
      },
      include: {
        _count: {
          select: {
            questions: true,
            attempts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ [GET-QUIZZES] ${quizzes.length} quizzes encontrados`);
    res.json({
      success: true,
      quizzes
    });
  } catch (error) {
    console.error('❌ [GET-QUIZZES] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener quizzes',
      error: error.message
    });
  }
};

/**
 * 📝 Obtener quiz con preguntas
 * GET /api/quizzes/:id
 */
export const getQuizById = async (req, res) => {
  try {
    console.log('📍 [GET-QUIZ] Solicitud recibida');
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(id) },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            options: true,
            points: true,
            order: true,
            // No incluir correctAnswer para estudiantes
            ...(req.user.role !== 'STUDENT' && { correctAnswer: true })
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    console.log(`✅ [GET-QUIZ] Quiz obtenido: ${quiz.title}`);
    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('❌ [GET-QUIZ] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener quiz',
      error: error.message
    });
  }
};

/**
 * 📝 Enviar intento de quiz
 * POST /api/quizzes/:id/submit
 */
export const submitQuizAttempt = async (req, res) => {
  try {
    console.log('📍 [SUBMIT-QUIZ] Solicitud recibida');
    const { id } = req.params;
    const { answers } = req.body;
    const userId = req.user.userId;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Respuestas requeridas'
      });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(id) },
      include: {
        questions: true
      }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    // Calcular puntaje
    let totalPoints = 0;
    let earnedPoints = 0;

    quiz.questions.forEach(question => {
      totalPoints += question.points;
      if (answers[question.id] === question.correctAnswer) {
        earnedPoints += question.points;
      }
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Guardar intento
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: parseInt(id),
        userId,
        answers: JSON.stringify(answers),
        score
      }
    });

    console.log(`✅ [SUBMIT-QUIZ] Intento guardado - Puntaje: ${score}%`);
    res.json({
      success: true,
      message: 'Quiz enviado exitosamente',
      attempt: {
        id: attempt.id,
        score: attempt.score,
        completedAt: attempt.completedAt
      }
    });
  } catch (error) {
    console.error('❌ [SUBMIT-QUIZ] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al enviar quiz',
      error: error.message
    });
  }
};

/**
 * 📝 Eliminar quiz
 * DELETE /api/quizzes/:id
 */
export const deleteQuiz = async (req, res) => {
  try {
    console.log('📍 [DELETE-QUIZ] Solicitud recibida');
    const { id } = req.params;
    const userId = req.user.userId;

    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(id) },
      include: { course: true }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    if (req.user.role === 'TEACHER' && quiz.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este quiz'
      });
    }

    await prisma.quiz.delete({
      where: { id: parseInt(id) }
    });

    console.log(`✅ [DELETE-QUIZ] Quiz eliminado`);
    res.json({
      success: true,
      message: 'Quiz eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ [DELETE-QUIZ] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar quiz',
      error: error.message
    });
  }
};

// ==================== FORUMS ====================

/**
 * 💬 Crear foro
 * POST /api/courses/:courseId/forums
 */
export const createForum = async (req, res) => {
  try {
    console.log('📍 [CREATE-FORUM] Solicitud recibida');
    const { courseId } = req.params;
    const { title, description } = req.body;
    const userId = req.user.userId;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Título es requerido'
      });
    }

    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    if (req.user.role === 'TEACHER' && course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para crear foros en este curso'
      });
    }

    const forum = await prisma.forum.create({
      data: {
        courseId: parseInt(courseId),
        title,
        description
      }
    });

    console.log(`✅ [CREATE-FORUM] Foro creado: ${forum.title}`);
    res.status(201).json({
      success: true,
      message: 'Foro creado exitosamente',
      forum
    });
  } catch (error) {
    console.error('❌ [CREATE-FORUM] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear foro',
      error: error.message
    });
  }
};

/**
 * 💬 Obtener foros de un curso
 * GET /api/courses/:courseId/forums
 */
export const getCourseForums = async (req, res) => {
  try {
    console.log('📍 [GET-FORUMS] Solicitud recibida');
    const { courseId } = req.params;

    const forums = await prisma.forum.findMany({
      where: {
        courseId: parseInt(courseId),
        isActive: true
      },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ [GET-FORUMS] ${forums.length} foros encontrados`);
    res.json({
      success: true,
      forums
    });
  } catch (error) {
    console.error('❌ [GET-FORUMS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener foros',
      error: error.message
    });
  }
};

/**
 * 💬 Obtener posts de un foro
 * GET /api/forums/:id/posts
 */
export const getForumPosts = async (req, res) => {
  try {
    console.log('📍 [GET-FORUM-POSTS] Solicitud recibida');
    const { id } = req.params;

    const posts = await prisma.forumPost.findMany({
      where: {
        forumId: parseInt(id)
      },
      include: {
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ [GET-FORUM-POSTS] ${posts.length} posts encontrados`);
    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('❌ [GET-FORUM-POSTS] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener posts',
      error: error.message
    });
  }
};

/**
 * 💬 Crear post en foro
 * POST /api/forums/:id/posts
 */
export const createForumPost = async (req, res) => {
  try {
    console.log('📍 [CREATE-POST] Solicitud recibida');
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.userId;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Título y contenido son requeridos'
      });
    }

    const forum = await prisma.forum.findUnique({
      where: { id: parseInt(id) }
    });

    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'Foro no encontrado'
      });
    }

    const post = await prisma.forumPost.create({
      data: {
        forumId: parseInt(id),
        userId,
        title,
        content
      }
    });

    console.log(`✅ [CREATE-POST] Post creado: ${post.title}`);
    res.status(201).json({
      success: true,
      message: 'Post creado exitosamente',
      post
    });
  } catch (error) {
    console.error('❌ [CREATE-POST] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear post',
      error: error.message
    });
  }
};

/**
 * 💬 Crear respuesta a post
 * POST /api/posts/:id/replies
 */
export const createForumReply = async (req, res) => {
  try {
    console.log('📍 [CREATE-REPLY] Solicitud recibida');
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Contenido es requerido'
      });
    }

    const post = await prisma.forumPost.findUnique({
      where: { id: parseInt(id) }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    const reply = await prisma.forumReply.create({
      data: {
        postId: parseInt(id),
        userId,
        content
      }
    });

    console.log(`✅ [CREATE-REPLY] Respuesta creada`);
    res.status(201).json({
      success: true,
      message: 'Respuesta creada exitosamente',
      reply
    });
  } catch (error) {
    console.error('❌ [CREATE-REPLY] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear respuesta',
      error: error.message
    });
  }
};

/**
 * 💬 Eliminar foro
 * DELETE /api/forums/:id
 */
export const deleteForum = async (req, res) => {
  try {
    console.log('📍 [DELETE-FORUM] Solicitud recibida');
    const { id } = req.params;
    const userId = req.user.userId;

    const forum = await prisma.forum.findUnique({
      where: { id: parseInt(id) },
      include: { course: true }
    });

    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'Foro no encontrado'
      });
    }

    if (req.user.role === 'TEACHER' && forum.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este foro'
      });
    }

    await prisma.forum.delete({
      where: { id: parseInt(id) }
    });

    console.log(`✅ [DELETE-FORUM] Foro eliminado`);
    res.json({
      success: true,
      message: 'Foro eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ [DELETE-FORUM] ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar foro',
      error: error.message
    });
  }
};

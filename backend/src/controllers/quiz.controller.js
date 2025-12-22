// backend/src/controllers/quiz.controller.js

import prisma from '../config/db.js';

/**
 * Crear un nuevo quiz
 */
export const createQuiz = async (req, res) => {
  try {
    console.log('🎯 [CREATE-QUIZ] ===== ENTRANDO A CREATE QUIZ =====');
    console.log('🎯 [CREATE-QUIZ] URL:', req.url);
    console.log('🎯 [CREATE-QUIZ] Method:', req.method);
    console.log('🎯 [CREATE-QUIZ] Params:', req.params);

    const { courseId } = req.params;
    const { title, description, duration, passingScore, maxAttempts } = req.body;

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

    // Verificar que el usuario sea el docente del curso o admin
    // (Ya verificado por middleware de autorización)
    console.log('📍 [CREATE-QUIZ] Usuario:', req.user);
    console.log('📍 [CREATE-QUIZ] Body recibido:', req.body);

    // Crear el quiz
    const quiz = await prisma.quiz.create({
      data: {
        courseId: parseInt(courseId),
        title,
        description,
        duration: duration || 30,
        passingScore: passingScore || 70,
        maxAttempts: maxAttempts || 3
      },
      include: {
        questions: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Quiz creado exitosamente',
      quiz
    });

  } catch (error) {
    console.error('Error al crear quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el quiz',
      error: error.message
    });
  }
};

/**
 * Obtener todos los quizzes de un curso
 */
export const getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: parseInt(courseId),
        isActive: true
      },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            options: true,
            points: true,
            order: true
          }
        },
        _count: {
          select: {
            attempts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular estadísticas para cada quiz
    const quizzesWithStats = await Promise.all(
      quizzes.map(async (quiz) => {
        const attempts = await prisma.quizAttempt.findMany({
          where: { quizId: quiz.id }
        });

        const averageScore = attempts.length > 0
          ? attempts.reduce((sum, att) => sum + att.score, 0) / attempts.length
          : 0;

        return {
          ...quiz,
          attempts: attempts.length,
          averageScore: Math.round(averageScore)
        };
      })
    );

    res.json({
      success: true,
      quizzes: quizzesWithStats
    });

  } catch (error) {
    console.error('Error al obtener quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los quizzes',
      error: error.message
    });
  }
};

/**
 * Obtener un quiz específico
 */
export const getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: {
        questions: true,
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            teacherId: true
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

    res.json({
      success: true,
      quiz
    });

  } catch (error) {
    console.error('Error al obtener quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el quiz',
      error: error.message
    });
  }
};

/**
 * Actualizar un quiz
 */
export const updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, description, duration, passingScore, maxAttempts } = req.body;

    // Verificar que el quiz existe
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: { course: true }
    });

    if (!existingQuiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    // Verificar permisos
    const userId = req.user.userId || req.user.id; // ✅ FIX
    if (req.user.role !== 'ADMIN' && existingQuiz.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este quiz'
      });
    }

    const quiz = await prisma.quiz.update({
      where: { id: parseInt(quizId) },
      data: {
        title,
        description,
        duration,
        passingScore,
        maxAttempts
      },
      include: {
        questions: true
      }
    });

    res.json({
      success: true,
      message: 'Quiz actualizado exitosamente',
      quiz
    });

  } catch (error) {
    console.error('Error al actualizar quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el quiz',
      error: error.message
    });
  }
};

/**
 * Eliminar un quiz
 */
export const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Verificar que el quiz existe
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: { course: true }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    // Verificar permisos
    const userId = req.user.userId || req.user.id; // ✅ FIX
    if (req.user.role !== 'ADMIN' && quiz.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este quiz'
      });
    }

    await prisma.quiz.delete({
      where: { id: parseInt(quizId) }
    });

    res.json({
      success: true,
      message: 'Quiz eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el quiz',
      error: error.message
    });
  }
};

/**
 * Agregar preguntas a un quiz
 */
export const addQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questions } = req.body;

    // Verificar que el quiz existe
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: { course: true }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    // Verificar permisos
    const userId = req.user.userId || req.user.id; // ✅ FIX: Soportar ambos formatos
    console.log('🔍 [ADD-QUESTIONS] Verificando permisos...');
    console.log('   User ID:', userId, 'Role:', req.user.role);
    console.log('   Course Teacher ID:', quiz.course.teacherId);
    console.log('   Comparación:', quiz.course.teacherId, '===', userId, '?', quiz.course.teacherId === userId);

    if (req.user.role !== 'ADMIN' && quiz.course.teacherId !== userId) {
      console.log('❌ [ADD-QUESTIONS] Permiso denegado');
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para agregar preguntas a este quiz'
      });
    }

    console.log('✅ [ADD-QUESTIONS] Permiso concedido');

    // Calcular el puntaje total de las preguntas existentes
    const existingQuestions = await prisma.quizQuestion.findMany({
      where: { quizId: parseInt(quizId) }
    });

    const currentTotal = existingQuestions.reduce((sum, q) => sum + q.points, 0);
    const newTotal = questions.reduce((sum, q) => sum + (q.points || 10), 0);
    const totalPoints = currentTotal + newTotal;

    // Validar que el total no exceda 100 puntos
    if (totalPoints > 100) {
      return res.status(400).json({
        success: false,
        message: `El puntaje total sería ${totalPoints} puntos. No puede exceder 100 puntos.`
      });
    }

    // Crear las preguntas
    const createdQuestions = await Promise.all(
      questions.map((q, index) =>
        prisma.quizQuestion.create({
          data: {
            quizId: parseInt(quizId),
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 10,
            order: existingQuestions.length + index
          }
        })
      )
    );

    res.status(201).json({
      success: true,
      message: 'Preguntas agregadas exitosamente',
      questions: createdQuestions,
      totalPoints
    });

  } catch (error) {
    console.error('Error al agregar preguntas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar preguntas',
      error: error.message
    });
  }
};

/**
 * Actualizar preguntas de un quiz (reemplazar todas)
 */
export const updateQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questions } = req.body;

    // Verificar que el quiz existe
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: { course: true }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    // Verificar permisos
    const userId = req.user.userId || req.user.id; // ✅ FIX: Soportar ambos formatos
    console.log('🔍 [UPDATE-QUESTIONS] Verificando permisos...');
    console.log('   User ID:', userId, 'Role:', req.user.role);
    console.log('   Course Teacher ID:', quiz.course.teacherId);
    console.log('   Comparación:', quiz.course.teacherId, '===', userId, '?', quiz.course.teacherId === userId);

    if (req.user.role !== 'ADMIN' && quiz.course.teacherId !== userId) {
      console.log('❌ [UPDATE-QUESTIONS] Permiso denegado');
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar preguntas de este quiz'
      });
    }

    console.log('✅ [UPDATE-QUESTIONS] Permiso concedido');

    // Calcular el puntaje total
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);

    // Validar que el total no exceda 100 puntos
    if (totalPoints > 100) {
      return res.status(400).json({
        success: false,
        message: `El puntaje total es ${totalPoints} puntos. No puede exceder 100 puntos.`
      });
    }

    // Eliminar preguntas existentes
    await prisma.quizQuestion.deleteMany({
      where: { quizId: parseInt(quizId) }
    });

    // Crear nuevas preguntas
    const createdQuestions = await Promise.all(
      questions.map((q, index) =>
        prisma.quizQuestion.create({
          data: {
            quizId: parseInt(quizId),
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 10,
            order: index
          }
        })
      )
    );

    res.json({
      success: true,
      message: 'Preguntas actualizadas exitosamente',
      questions: createdQuestions,
      totalPoints
    });

  } catch (error) {
    console.error('Error al actualizar preguntas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar preguntas',
      error: error.message
    });
  }
};

/**
 * Eliminar una pregunta
 */
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    // Verificar que la pregunta existe
    const question = await prisma.quizQuestion.findUnique({
      where: { id: parseInt(questionId) },
      include: {
        quiz: {
          include: { course: true }
        }
      }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Pregunta no encontrada'
      });
    }

    // Verificar permisos
    const userId = req.user.userId || req.user.id; // ✅ FIX
    if (req.user.role !== 'ADMIN' && question.quiz.course.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta pregunta'
      });
    }

    await prisma.quizQuestion.delete({
      where: { id: parseInt(questionId) }
    });

    res.json({
      success: true,
      message: 'Pregunta eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar pregunta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la pregunta',
      error: error.message
    });
  }
};

/**
 * Iniciar un intento de quiz (estudiante)
 */
export const startQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log('📝 [START-QUIZ] Iniciando quiz...');
    console.log('   Quiz ID:', quizId);
    console.log('   User ID:', userId);

    // Verificar que el quiz existe y está activo
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            options: true,
            points: true,
            order: true
            // NO incluir correctAnswer
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            code: true
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

    if (!quiz.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Este quiz no está disponible'
      });
    }

    // Verificar que el estudiante está inscrito en el curso
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: quiz.course.id
        }
      }
    });

    if (!enrollment || !enrollment.isActive) {
      return res.status(403).json({
        success: false,
        message: 'No estás inscrito en este curso'
      });
    }

    // Verificar intentos previos
    const previousAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: parseInt(quizId),
        userId: userId
      }
    });

    if (previousAttempts.length >= quiz.maxAttempts) {
      return res.status(403).json({
        success: false,
        message: `Ya has alcanzado el número máximo de intentos (${quiz.maxAttempts})`,
        attempts: previousAttempts.length,
        maxAttempts: quiz.maxAttempts
      });
    }

    console.log('✅ [START-QUIZ] Quiz iniciado exitosamente');

    // Retornar quiz con preguntas (sin respuestas correctas)
    res.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
        questions: quiz.questions,
        course: quiz.course,
        attemptsUsed: previousAttempts.length
      }
    });

  } catch (error) {
    console.error('Error al iniciar quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar el quiz',
      error: error.message
    });
  }
};

/**
 * Enviar respuestas del quiz (estudiante)
 */
export const submitQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // { questionId: answerIndex }
    const userId = req.user.userId || req.user.id;

    console.log('✅ [SUBMIT-QUIZ] Enviando respuestas...');
    console.log('   Quiz ID:', quizId);
    console.log('   User ID:', userId);
    console.log('   Answers:', answers);

    // Verificar que el quiz existe
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: {
        questions: true,
        course: true
      }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    // Verificar que está inscrito
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: quiz.course.id
        }
      }
    });

    if (!enrollment || !enrollment.isActive) {
      return res.status(403).json({
        success: false,
        message: 'No estás inscrito en este curso'
      });
    }

    // Verificar intentos
    const previousAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: parseInt(quizId),
        userId: userId
      }
    });

    if (previousAttempts.length >= quiz.maxAttempts) {
      return res.status(403).json({
        success: false,
        message: 'Ya has alcanzado el número máximo de intentos'
      });
    }

    // Calcular puntaje
    let totalPoints = 0;
    let earnedPoints = 0;
    const results = [];

    quiz.questions.forEach(question => {
      totalPoints += question.points;

      const userAnswer = answers[question.id.toString()];
      const isCorrect = userAnswer !== undefined && userAnswer === question.correctAnswer;

      if (isCorrect) {
        earnedPoints += question.points;
      }

      results.push({
        questionId: question.id,
        question: question.question,
        options: question.options,
        userAnswer: userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect,
        points: question.points,
        earnedPoints: isCorrect ? question.points : 0
      });
    });

    // Calcular porcentaje
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quiz.passingScore;

    console.log('📊 [SUBMIT-QUIZ] Resultados:');
    console.log('   Total Points:', totalPoints);
    console.log('   Earned Points:', earnedPoints);
    console.log('   Score:', score);
    console.log('   Passed:', passed);

    // Guardar intento en base de datos
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: parseInt(quizId),
        userId: userId,
        answers: JSON.stringify(answers),
        score: score
      }
    });

    console.log('💾 [SUBMIT-QUIZ] Intento guardado:', attempt.id);

    res.json({
      success: true,
      message: passed ? '¡Felicitaciones! Has aprobado el quiz' : 'No has alcanzado la nota mínima',
      attempt: {
        id: attempt.id,
        score: score,
        passed: passed,
        passingScore: quiz.passingScore,
        totalPoints: totalPoints,
        earnedPoints: earnedPoints,
        completedAt: attempt.completedAt,
        attemptsUsed: previousAttempts.length + 1,
        maxAttempts: quiz.maxAttempts,
        results: results
      }
    });

  } catch (error) {
    console.error('Error al enviar quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el quiz',
      error: error.message
    });
  }
};

/**
 * Obtener los intentos del estudiante para un quiz específico
 */
export const getMyAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log('📊 [GET-MY-ATTEMPTS] Obteniendo intentos...');
    console.log('   Quiz ID:', quizId);
    console.log('   User ID:', userId);

    // Verificar que el quiz existe
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz no encontrado'
      });
    }

    // Obtener todos los intentos del estudiante
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: parseInt(quizId),
        userId: userId
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    console.log(`✅ [GET-MY-ATTEMPTS] ${attempts.length} intentos encontrados`);

    res.json({
      success: true,
      attempts: attempts.map(attempt => ({
        id: attempt.id,
        score: attempt.score,
        completedAt: attempt.completedAt,
        answers: attempt.answers
      }))
    });

  } catch (error) {
    console.error('Error al obtener intentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener intentos',
      error: error.message
    });
  }
};

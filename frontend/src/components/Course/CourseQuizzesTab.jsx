// frontend/src/components/Course/CourseQuizzesTab.jsx

import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  Users,
  Award,
  Loader,
  X,
  Check
} from 'lucide-react';
import api from '../../services/api';
import ConfirmDialog from '../ConfirmDialog';
import Toast from '../Toast';

const CourseQuizzesTab = ({ course }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Estado del formulario de quiz
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    duration: 30,
    passingScore: 70,
    maxAttempts: 3
  });

  // Estado de preguntas
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 10
  });

  // Cargar quizzes al montar el componente
  useEffect(() => {
    if (course?.id) {
      fetchQuizzes();
    }
  }, [course?.id]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/quizzes`);
      setQuizzes(response.data.quizzes || []);
    } catch (error) {
      console.error('Error al cargar quizzes:', error);
      showToastMessage('Error al cargar los quizzes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const resetForms = () => {
    setQuizForm({
      title: '',
      description: '',
      duration: 30,
      passingScore: 70,
      maxAttempts: 3
    });
    setQuestions([]);
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 10
    });
    setShowCreateModal(false);
    setShowQuestionsModal(false);
    setSelectedQuiz(null);
  };

  // Validar pregunta actual
  const validateCurrentQuestion = () => {
    if (!currentQuestion.question.trim()) {
      showToastMessage('Debes escribir la pregunta', 'warning');
      return false;
    }

    const emptyOptions = currentQuestion.options.filter(opt => !opt.trim());
    if (emptyOptions.length > 0) {
      showToastMessage('Todas las opciones deben tener texto', 'warning');
      return false;
    }

    if (currentQuestion.points < 1) {
      showToastMessage('Los puntos deben ser al menos 1', 'warning');
      return false;
    }

    return true;
  };

  // Agregar pregunta a la lista
  const addQuestion = () => {
    if (!validateCurrentQuestion()) return;

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0) + currentQuestion.points;

    if (totalPoints > 100) {
      showToastMessage(`El total de puntos sería ${totalPoints}. No puede exceder 100 puntos`, 'warning');
      return;
    }

    const newQuestion = {
      ...currentQuestion,
      id: Date.now(),
      options: [...currentQuestion.options]
    };

    setQuestions([...questions, newQuestion]);

    // Resetear formulario de pregunta
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 10
    });

    showToastMessage('Pregunta agregada correctamente', 'success');
  };

  // Eliminar pregunta de la lista
  const removeQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    showToastMessage('Pregunta eliminada', 'info');
  };

  // Crear quiz completo
  const handleCreateQuiz = async () => {
    // Validar formulario de quiz
    if (!quizForm.title.trim()) {
      showToastMessage('El título del quiz es obligatorio', 'warning');
      return;
    }

    if (questions.length === 0) {
      showToastMessage('Debes agregar al menos una pregunta', 'warning');
      return;
    }

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints > 100) {
      showToastMessage(`El total de puntos es ${totalPoints}. No puede exceder 100`, 'warning');
      return;
    }

    try {
      setLoading(true);

      // 1. Crear el quiz
      const quizResponse = await api.post(`/courses/${course.id}/quizzes`, quizForm);

      if (!quizResponse.data.success) {
        throw new Error('Error al crear el quiz');
      }

      const createdQuiz = quizResponse.data.quiz;

      // 2. Guardar las preguntas
      const questionsPayload = questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points
      }));

      await api.put(`/quizzes/${createdQuiz.id}/questions`, {
        questions: questionsPayload
      });

      // 3. Recargar lista y resetear
      await fetchQuizzes();
      resetForms();
      showToastMessage(`Quiz "${quizForm.title}" creado exitosamente con ${questions.length} pregunta(s)`, 'success');

    } catch (error) {
      console.error('Error al crear quiz:', error);
      showToastMessage(error.response?.data?.message || 'Error al crear el quiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Gestionar preguntas de un quiz existente
  const handleManageQuestions = (quiz) => {
    setSelectedQuiz(quiz);
    setQuestions(quiz.questions || []);
    setShowQuestionsModal(true);
  };

  // Actualizar preguntas de un quiz existente
  const handleUpdateQuestions = async () => {
    if (!selectedQuiz) return;

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints > 100) {
      showToastMessage(`El total de puntos es ${totalPoints}. No puede exceder 100`, 'warning');
      return;
    }

    try {
      setLoading(true);

      const questionsPayload = questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points
      }));

      await api.put(`/quizzes/${selectedQuiz.id}/questions`, {
        questions: questionsPayload
      });

      await fetchQuizzes();
      resetForms();
      showToastMessage('Preguntas actualizadas correctamente', 'success');

    } catch (error) {
      console.error('Error al actualizar preguntas:', error);
      showToastMessage(error.response?.data?.message || 'Error al actualizar las preguntas', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar quiz
  const handleDeleteQuiz = (quizId) => {
    setQuizToDelete(quizId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return;

    try {
      await api.delete(`/quizzes/${quizToDelete}`);
      await fetchQuizzes();
      showToastMessage('Quiz eliminado correctamente', 'success');
    } catch (error) {
      console.error('Error al eliminar quiz:', error);
      showToastMessage('Error al eliminar el quiz', 'error');
    } finally {
      setQuizToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Calcular puntos totales
  const getTotalPoints = () => {
    return questions.reduce((sum, q) => sum + q.points, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100/30 rounded-lg">
              <HelpCircle size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Quizzes y Evaluaciones</h2>
              <p className="text-sm text-gray-500">
                {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} creado{quizzes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
          >
            <Plus size={20} />
            Crear Quiz
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !showCreateModal && !showQuestionsModal && (
        <div className="flex justify-center py-12">
          <Loader className="animate-spin text-purple-600" size={40} />
        </div>
      )}

      {/* Quizzes Grid */}
      {!loading && quizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border-l-4 border-purple-600">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg mb-1">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-sm text-gray-600 mb-3">{quiz.description}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleManageQuestions(quiz)}
                    className="p-2 bg-purple-100/30 text-purple-600 hover:bg-purple-200:bg-purple-900/50 rounded-lg transition"
                    title="Gestionar preguntas"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="p-2 bg-red-100/30 text-red-600 hover:bg-red-200:bg-red-900/50 rounded-lg transition"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  <span>{quiz.duration} min</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Award size={16} />
                  <span>{quiz.passingScore}% mínimo</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <HelpCircle size={16} />
                  <span>{quiz.questions?.length || 0} preguntas</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={16} />
                  <span>{quiz.maxAttempts} intentos</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(quiz.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && quizzes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <HelpCircle className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Sin quizzes creados
          </h3>
          <p className="text-gray-600 mb-6">
            Crea evaluaciones para medir el aprendizaje de tus estudiantes
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            Crear Primer Quiz
          </button>
        </div>
      )}

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <HelpCircle size={24} />
                <div>
                  <h3 className="text-xl font-bold">Crear Nuevo Quiz</h3>
                  <p className="text-sm text-purple-100">Completa la información y agrega preguntas</p>
                </div>
              </div>
              <button
                onClick={resetForms}
                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Información del Quiz */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="font-bold text-gray-800 mb-3">Información del Quiz</h4>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título del Quiz *
                  </label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Evaluación Unidad 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows="2"
                    placeholder="Descripción opcional..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duración (min)
                    </label>
                    <input
                      type="number"
                      value={quizForm.duration}
                      onChange={(e) => setQuizForm({ ...quizForm, duration: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nota mínima (%)
                    </label>
                    <input
                      type="number"
                      value={quizForm.passingScore}
                      onChange={(e) => setQuizForm({ ...quizForm, passingScore: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Intentos máx.
                    </label>
                    <input
                      type="number"
                      value={quizForm.maxAttempts}
                      onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Agregar Pregunta */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800">Agregar Pregunta</h4>
                  <div className="text-sm">
                    <span className="font-semibold text-gray-700">Puntos acumulados: </span>
                    <span className={`font-bold ${
                      getTotalPoints() > 100 ? 'text-red-600' :
                      getTotalPoints() === 100 ? 'text-green-600' :
                      'text-gray-800'
                    }`}>
                      {getTotalPoints()} / 100
                    </span>
                  </div>
                </div>

                <input
                  type="text"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Escribe la pregunta..."
                />

                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctAnswer === index}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                        className="mt-3 accent-purple-600"
                      />
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">
                          Opción {index + 1} {currentQuestion.correctAnswer === index && '(Correcta)'}
                        </label>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, options: newOptions });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder={`Opción ${index + 1}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <div className="w-32">
                    <label className="block text-xs text-gray-600 mb-1">Puntos</label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="1"
                    />
                  </div>
                  <div className="flex-1 flex items-end">
                    <button
                      onClick={addQuestion}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                    >
                      <Plus size={20} className="inline mr-2" />
                      Agregar Pregunta
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Preguntas */}
              {questions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800">
                    Preguntas del Quiz ({questions.length})
                  </h4>
                  {questions.map((q, index) => (
                    <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <span className="inline-block px-2 py-0.5 bg-purple-100/30 text-purple-700 text-xs font-semibold rounded mb-2">
                            Pregunta {index + 1} - {q.points} puntos
                          </span>
                          <p className="font-semibold text-gray-800">{q.question}</p>
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1.5 bg-red-100/30 text-red-600 hover:bg-red-200:bg-red-900/50 rounded transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {q.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`text-sm px-3 py-2 rounded ${
                              optIndex === q.correctAnswer
                                ? 'bg-green-100/30 text-green-700 font-semibold'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {optIndex === q.correctAnswer && <Check size={14} className="inline mr-1" />}
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={resetForms}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100:bg-gray-700 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateQuiz}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Crear Quiz ({questions.length} pregunta{questions.length !== 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Questions Modal */}
      {showQuestionsModal && selectedQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold">{selectedQuiz.title}</h3>
                <p className="text-sm text-purple-100">Gestionar preguntas del quiz</p>
              </div>
              <button
                onClick={resetForms}
                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Agregar Pregunta */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800">Agregar Nueva Pregunta</h4>
                  <div className="text-sm">
                    <span className="font-semibold text-gray-700">Puntos acumulados: </span>
                    <span className={`font-bold ${
                      getTotalPoints() > 100 ? 'text-red-600' :
                      getTotalPoints() === 100 ? 'text-green-600' :
                      'text-gray-800'
                    }`}>
                      {getTotalPoints()} / 100
                    </span>
                  </div>
                </div>

                <input
                  type="text"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Escribe la pregunta..."
                />

                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="radio"
                        name="correctAnswerEdit"
                        checked={currentQuestion.correctAnswer === index}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                        className="mt-3 accent-purple-600"
                      />
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">
                          Opción {index + 1} {currentQuestion.correctAnswer === index && '(Correcta)'}
                        </label>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, options: newOptions });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder={`Opción ${index + 1}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <div className="w-32">
                    <label className="block text-xs text-gray-600 mb-1">Puntos</label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="1"
                    />
                  </div>
                  <div className="flex-1 flex items-end">
                    <button
                      onClick={addQuestion}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                    >
                      <Plus size={20} className="inline mr-2" />
                      Agregar Pregunta
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Preguntas */}
              {questions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800">
                    Preguntas Actuales ({questions.length})
                  </h4>
                  {questions.map((q, index) => (
                    <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <span className="inline-block px-2 py-0.5 bg-purple-100/30 text-purple-700 text-xs font-semibold rounded mb-2">
                            Pregunta {index + 1} - {q.points} puntos
                          </span>
                          <p className="font-semibold text-gray-800">{q.question}</p>
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1.5 bg-red-100/30 text-red-600 hover:bg-red-200:bg-red-900/50 rounded transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {q.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`text-sm px-3 py-2 rounded ${
                              optIndex === q.correctAnswer
                                ? 'bg-green-100/30 text-green-700 font-semibold'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {optIndex === q.correctAnswer && <Check size={14} className="inline mr-1" />}
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={resetForms}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100:bg-gray-700 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateQuestions}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setQuizToDelete(null);
        }}
        onConfirm={confirmDeleteQuiz}
        title="Eliminar Quiz"
        message="¿Estás seguro de que deseas eliminar este quiz? Esta acción no se puede deshacer y se eliminarán todas las preguntas asociadas."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Toast Notifications */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default CourseQuizzesTab;

// frontend/src/components/Student/StudentQuizzesTab.jsx

import { useState, useEffect } from 'react';
import { HelpCircle, FileText, CheckCircle, XCircle, Clock, Award, Users, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';

const StudentQuizzesTab = ({ course }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [slideDirection, setSlideDirection] = useState('none');

  useEffect(() => {
    if (course?.id) {
      fetchQuizzes();
    }
  }, [course?.id]);

  // Timer countdown
  useEffect(() => {
    if (activeQuiz && timeRemaining > 0 && !results) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activeQuiz, timeRemaining, results]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/quizzes`);
      setQuizzes(response.data.quizzes || []);
    } catch (error) {
      console.error('Error al cargar quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      setLoading(true);
      const response = await api.post(`/quizzes/${quizId}/attempt`);

      if (response.data.success) {
        const quiz = response.data.quiz;
        setActiveQuiz(quiz);
        setAnswers({});
        setResults(null);
        setCurrentQuestion(0);
        setSlideDirection('none');
        setTimeRemaining(quiz.duration * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Error al iniciar quiz:', error);
      alert(error.response?.data?.message || 'Error al iniciar el quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;

    // Check if all questions are answered
    const unansweredCount = activeQuiz.questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      if (!window.confirm(`Tienes ${unansweredCount} pregunta(s) sin responder. ¿Deseas enviar de todas formas?`)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const response = await api.post(`/quizzes/${activeQuiz.id}/submit`, { answers });

      if (response.data.success) {
        setResults(response.data.attempt);
      }
    } catch (error) {
      console.error('Error al enviar quiz:', error);
      alert(error.response?.data?.message || 'Error al enviar el quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseQuiz = () => {
    if (results || window.confirm('¿Estás seguro de que quieres salir? Perderás todo el progreso.')) {
      setActiveQuiz(null);
      setAnswers({});
      setResults(null);
      setTimeRemaining(0);
      setCurrentQuestion(0);
      setSlideDirection('none');
      fetchQuizzes(); // Refresh quizzes to update attempt counts
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < activeQuiz.questions.length - 1) {
      setSlideDirection('left');
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setSlideDirection('none');
      }, 50);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setSlideDirection('right');
      setTimeout(() => {
        setCurrentQuestion(prev => prev - 1);
        setSlideDirection('none');
      }, 50);
    }
  };

  const handleQuestionDotClick = (index) => {
    if (index !== currentQuestion) {
      setSlideDirection(index > currentQuestion ? 'left' : 'right');
      setTimeout(() => {
        setCurrentQuestion(index);
        setSlideDirection('none');
      }, 50);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  // Quiz Taking Modal
  if (activeQuiz) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{activeQuiz.title}</h2>
              {activeQuiz.description && (
                <p className="text-sm opacity-90 mt-1">{activeQuiz.description}</p>
              )}
            </div>
            <button
              onClick={handleCloseQuiz}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          {/* Timer and Progress */}
          {!results && (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={20} className={timeRemaining < 60 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'} />
                <span className={`font-bold ${timeRemaining < 60 ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                  Tiempo restante: {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Respondidas: {Object.keys(answers).length} / {activeQuiz.questions.length}
              </div>
            </div>
          )}

          {/* Results View */}
          {results ? (
            <div className="p-6 space-y-6">
              {/* Score Card */}
              <div className={`p-6 rounded-lg ${results.passed ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
                <div className="flex items-center gap-4">
                  {results.passed ? (
                    <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle size={48} className="text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <h3 className={`text-2xl font-bold ${results.passed ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {results.passed ? '¡Aprobado!' : 'No Aprobado'}
                    </h3>
                    <p className={`text-lg ${results.passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      Calificación: {results.score}% (mínimo {results.passingScore}%)
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Puntos obtenidos: {results.earnedPoints} / {results.totalPoints}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Intento {results.attemptsUsed} de {results.maxAttempts}
                    </p>
                  </div>
                </div>
              </div>

              {/* Question Results */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">Resultados por pregunta:</h4>
                {results.results.map((result, index) => (
                  <div
                    key={result.questionId}
                    className={`p-4 rounded-lg border-2 ${
                      result.isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-900 dark:bg-opacity-20'
                        : 'border-red-500 bg-red-50 dark:bg-red-900 dark:bg-opacity-20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.isCorrect ? (
                        <CheckCircle size={20} className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                      ) : (
                        <XCircle size={20} className="text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
                          {index + 1}. {result.question}
                        </p>
                        <div className="space-y-2">
                          {result.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-2 rounded ${
                                optionIndex === result.correctAnswer
                                  ? 'bg-green-200 dark:bg-green-700 font-semibold'
                                  : optionIndex === result.userAnswer && !result.isCorrect
                                  ? 'bg-red-200 dark:bg-red-700'
                                  : 'bg-gray-100 dark:bg-gray-700'
                              }`}
                            >
                              <span className="text-gray-800 dark:text-gray-100">{option}</span>
                              {optionIndex === result.correctAnswer && (
                                <span className="ml-2 text-green-700 dark:text-green-300 text-sm">✓ Correcta</span>
                              )}
                              {optionIndex === result.userAnswer && !result.isCorrect && (
                                <span className="ml-2 text-red-700 dark:text-red-300 text-sm">✗ Tu respuesta</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Puntos: {result.earnedPoints} / {result.points}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCloseQuiz}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
              >
                Cerrar
              </button>
            </div>
          ) : (
            /* Questions View - ONE AT A TIME */
            <div className="p-6">
              {/* Question Indicator */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                  Pregunta {currentQuestion + 1} de {activeQuiz.questions.length}
                </h3>
              </div>

              {/* Current Question with Slide Animation */}
              <div className="mb-8 overflow-hidden">
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    slideDirection === 'left' ? 'opacity-0 translate-x-full' :
                    slideDirection === 'right' ? 'opacity-0 -translate-x-full' :
                    'opacity-100 translate-x-0'
                  }`}
                >
                  {activeQuiz.questions[currentQuestion] && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2 text-lg">
                        {activeQuiz.questions[currentQuestion].question}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {activeQuiz.questions[currentQuestion].points} puntos
                      </p>
                      <div className="space-y-3">
                        {activeQuiz.questions[currentQuestion].options.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            onClick={() => handleAnswerChange(activeQuiz.questions[currentQuestion].id, optionIndex)}
                            className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                              answers[activeQuiz.questions[currentQuestion].id] === optionIndex
                                ? 'bg-purple-100 dark:bg-purple-900 border-2 border-purple-500 shadow-md'
                                : 'bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-500 hover:border-purple-300 hover:shadow-sm'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${activeQuiz.questions[currentQuestion].id}`}
                              value={optionIndex}
                              checked={answers[activeQuiz.questions[currentQuestion].id] === optionIndex}
                              onChange={() => handleAnswerChange(activeQuiz.questions[currentQuestion].id, optionIndex)}
                              className="mt-1 w-5 h-5 text-purple-600 cursor-pointer pointer-events-auto"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="flex-1 text-gray-800 dark:text-gray-100 select-none">{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                  Anterior
                </button>

                {currentQuestion === activeQuiz.questions.length - 1 ? (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Quiz'}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    Siguiente
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>

              {/* Progress Dots */}
              <div className="flex justify-center items-center gap-2 flex-wrap pb-2">
                {activeQuiz.questions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => handleQuestionDotClick(index)}
                    className={`transition-all ${
                      index === currentQuestion
                        ? 'w-10 h-10 rounded-lg bg-purple-600 text-white font-bold shadow-md'
                        : answers[question.id] !== undefined
                        ? 'w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-sm'
                        : 'w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                    title={`Pregunta ${index + 1}${answers[question.id] !== undefined ? ' (respondida)' : ' (sin responder)'}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500"></div>
                  <span>Respondida</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                  <span>Sin responder</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600"></div>
                  <span>Actual</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <HelpCircle size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Evaluaciones</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} disponible{quizzes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Quizzes Grid */}
      {quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-6 border-l-4 border-purple-600">
              <div className="mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">{quiz.title}</h3>
                {quiz.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{quiz.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Clock size={16} />
                  <span>{quiz.duration} min</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Award size={16} />
                  <span>{quiz.passingScore}% mínimo</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <HelpCircle size={16} />
                  <span>{quiz.questions?.length || 0} preguntas</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Users size={16} />
                  <span>{quiz.maxAttempts} intentos</span>
                </div>
              </div>

              <button
                onClick={() => handleStartQuiz(quiz.id)}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
              >
                Comenzar Quiz
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <HelpCircle className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Sin evaluaciones disponibles
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            El docente aún no ha creado evaluaciones para este curso
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentQuizzesTab;

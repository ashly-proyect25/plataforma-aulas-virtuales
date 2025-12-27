// frontend/src/components/Course/CourseStatsTab.jsx

import { useState, useEffect } from 'react';
import { BarChart3, Users, Video, HelpCircle, TrendingUp, Award, Clock, Calendar } from 'lucide-react';
import api from '../../services/api';

const CourseStatsTab = ({ course }) => {
  const [stats, setStats] = useState({
    studentsCount: 0,
    quizzesCount: 0,
    totalClasses: 0,
    averageScore: 0,
    completionRate: 0,
    totalAttempts: 0,
    passedAttempts: 0,
    averageAttendanceRate: 0,
    studentScores: [],
    quizStats: [],
    weeklyActivity: [0, 0, 0, 0]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, [course.id]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/courses/${course.id}/statistics`);

      if (response.data.success) {
        setStats(response.data.statistics);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
      setError('Error al cargar las estadísticas del curso');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar los top 3 estudiantes
  const topStudents = stats.studentScores.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/20 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Estadísticas del Curso</h2>
            <p className="text-sm text-gray-500">Métricas y rendimiento general</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-indigo-600" size={24} />
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
              Activos
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.studentsCount}</p>
          <p className="text-sm text-gray-600">Total Estudiantes</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <div className="flex items-center justify-between mb-2">
            <Video className="text-purple-600" size={24} />
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.totalClasses}</p>
          <p className="text-sm text-gray-600">Clases Totales</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-600">
          <div className="flex items-center justify-between mb-2">
            <HelpCircle className="text-pink-600" size={24} />
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.quizzesCount}</p>
          <p className="text-sm text-gray-600">Quizzes Activos</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between mb-2">
            <Award className="text-green-600" size={24} />
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.averageScore}%</p>
          <p className="text-sm text-gray-600">Promedio General</p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100/30 rounded-lg">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <h3 className="font-bold text-gray-800">Tasa de Finalización</h3>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
            <p className="text-right mt-2 text-2xl font-bold text-blue-600">
              {stats.completionRate}%
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Promedio de quizzes completados
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100/30 rounded-lg">
              <Award className="text-green-600" size={20} />
            </div>
            <h3 className="font-bold text-gray-800">Tasa de Aprobación</h3>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                style={{ width: `${stats.totalAttempts > 0 ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100) : 0}%` }}
              />
            </div>
            <p className="text-right mt-2 text-2xl font-bold text-green-600">
              {stats.totalAttempts > 0 ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100) : 0}%
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.passedAttempts} de {stats.totalAttempts} intentos aprobados
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100/30 rounded-lg">
              <Calendar className="text-orange-600" size={20} />
            </div>
            <h3 className="font-bold text-gray-800">Asistencia Promedio</h3>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full transition-all"
                style={{ width: `${stats.averageAttendanceRate}%` }}
              />
            </div>
            <p className="text-right mt-2 text-2xl font-bold text-orange-600">
              {stats.averageAttendanceRate}%
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Asistencia a clases en vivo
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100/30 rounded-lg">
              <BarChart3 className="text-purple-600" size={20} />
            </div>
            <h3 className="font-bold text-gray-800">Promedio por Quiz</h3>
          </div>
          <p className="text-4xl font-bold text-purple-600">
            {stats.quizzesCount > 0 ? Math.round(stats.totalAttempts / stats.quizzesCount) : 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Intentos promedio por quiz
          </p>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      {stats.weeklyActivity && stats.weeklyActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-100/30 rounded-lg">
              <TrendingUp className="text-cyan-600" size={20} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">Actividad Semanal (Últimas 4 semanas)</h3>
          </div>
          <div className="flex items-end justify-around gap-4 h-48">
            {stats.weeklyActivity.map((count, index) => {
              const maxCount = Math.max(...stats.weeklyActivity, 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '160px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-lg transition-all duration-500 flex items-end justify-center pb-2"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '20px' : '0px' }}
                    >
                      {count > 0 && (
                        <span className="text-white font-bold text-sm">{count}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    Sem {index + 1}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Número de intentos de quiz por semana
          </p>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Students */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="text-yellow-500" size={24} />
            <h3 className="font-bold text-gray-800 text-lg">Mejores Estudiantes</h3>
          </div>
          <div className="space-y-3">
            {topStudents.length > 0 ? (
              topStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{student.name}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      <span>{student.quizzesCompleted} de {student.totalQuizzes} quizzes</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">{student.averageScore}%</p>
                    <p className="text-xs text-gray-500">Promedio</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Award className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">No hay estudiantes con calificaciones aún</p>
              </div>
            )}
          </div>
        </div>

        {/* Quiz Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="text-purple-500" size={24} />
            <h3 className="font-bold text-gray-800 text-lg">Estadísticas por Quiz</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.quizStats.length > 0 ? (
              stats.quizStats.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-800 flex-1">{quiz.title}</p>
                    <span className="text-lg font-bold text-blue-600">{quiz.averageScore}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-500">Intentos:</span> {quiz.totalAttempts}
                    </div>
                    <div>
                      <span className="text-gray-500">Estudiantes:</span> {quiz.uniqueStudents}
                    </div>
                    <div>
                      <span className="text-gray-500">Completado:</span> {quiz.completionRate}%
                    </div>
                    <div>
                      <span className="text-gray-500">Aprobados:</span> {quiz.passedAttempts}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <HelpCircle className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">No hay quizzes creados aún</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Scores Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="text-indigo-600" size={24} />
          <h3 className="font-bold text-gray-800 text-lg">Rendimiento de Estudiantes</h3>
        </div>
        {stats.studentScores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Estudiante</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Quizzes</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Promedio</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Asistencia</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Horas en Vivo</th>
                </tr>
              </thead>
              <tbody>
                {stats.studentScores.map((student, index) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          index < 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{student.name}</p>
                          <p className="text-xs text-gray-500">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-gray-700">
                        {student.quizzesCompleted} / {student.totalQuizzes}
                      </span>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all"
                          style={{ width: `${student.totalQuizzes > 0 ? (student.quizzesCompleted / student.totalQuizzes) * 100 : 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full font-semibold ${
                        student.averageScore >= 70
                          ? 'bg-green-100/30 text-green-700'
                          : student.averageScore >= 50
                          ? 'bg-yellow-100/30 text-yellow-700'
                          : 'bg-red-100/30 text-red-700'
                      }`}>
                        {student.averageScore}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-medium text-gray-700">
                          {student.attendanceRate}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {student.classesAttended || 0} / {student.totalClasses || 0}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-full rounded-full transition-all"
                            style={{ width: `${student.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-bold text-cyan-600">
                          {student.liveSessionHours || 0}h
                        </span>
                        <span className="text-xs text-gray-500">
                          {student.liveSessionCount || 0} sesiones
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-semibold">No hay estudiantes inscritos</p>
            <p className="text-xs text-gray-400 mt-1">
              Inscribe estudiantes al curso para ver sus estadísticas
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseStatsTab;
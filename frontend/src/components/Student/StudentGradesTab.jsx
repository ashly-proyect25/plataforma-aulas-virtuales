// frontend/src/components/Student/StudentGradesTab.jsx

import { useState, useEffect } from 'react';
import { Award, TrendingUp, BarChart, FileText, Loader, CheckCircle, Calendar, ClipboardCheck } from 'lucide-react';
import api from '../../services/api';
import StudentAttendanceModal from './StudentAttendanceModal';

const StudentGradesTab = ({ course }) => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState(0);
  const [attendances, setAttendances] = useState([]);
  const [loadingAttendances, setLoadingAttendances] = useState(true);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  useEffect(() => {
    if (course?.id) {
      fetchGrades();
      fetchAttendances();
    }
  }, [course?.id]);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      // Obtener los quizzes del curso
      const quizzesResponse = await api.get(`/courses/${course.id}/quizzes`);
      const quizzes = quizzesResponse.data.quizzes || [];

      // Obtener los intentos del estudiante para cada quiz
      const allGrades = [];
      for (const quiz of quizzes) {
        try {
          const attemptsResponse = await api.get(`/quizzes/${quiz.id}/my-attempts`);
          const attempts = attemptsResponse.data.attempts || [];

          // Tomar el mejor intento de cada quiz
          if (attempts.length > 0) {
            const bestAttempt = attempts.reduce((best, current) =>
              current.score > best.score ? current : best
            );

            allGrades.push({
              title: quiz.title,
              type: 'Quiz',
              date: new Date(bestAttempt.completedAt).toLocaleDateString('es-ES'),
              score: bestAttempt.score,
              attempt: bestAttempt
            });
          }
        } catch (err) {
          console.error(`Error loading attempts for quiz ${quiz.id}:`, err);
        }
      }

      setGrades(allGrades);

      // Calcular promedio
      if (allGrades.length > 0) {
        const avg = allGrades.reduce((sum, g) => sum + g.score, 0) / allGrades.length;
        setAverage(avg);
      }
    } catch (error) {
      console.error('Error al cargar calificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoadingAttendances(true);
      // Obtener el ID del usuario actual del store o de la sesión
      const userResponse = await api.get('/auth/me');
      const userId = userResponse.data.user.id;

      // Obtener asistencias del estudiante
      const response = await api.get(`/courses/${course.id}/students/${userId}/attendance`);

      if (response.data.success) {
        const records = response.data.data.records || [];
        const summary = response.data.data.summary || {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0
        };

        setAttendances(records);
        setAttendanceSummary(summary);
      }
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
      setAttendances([]);
      setAttendanceSummary(null);
    } finally {
      setLoadingAttendances(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Mis Calificaciones</h3>
          <p className="text-sm text-gray-500 mt-1">
            Historial de notas y progreso académico
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-cyan-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                Promedio General
              </p>
              <p className="text-3xl font-bold text-cyan-600">
                {loading ? <Loader className="animate-spin" size={32} /> : (average > 0 ? `${average.toFixed(1)}%` : '--')}
              </p>
            </div>
            <TrendingUp className="text-cyan-600 opacity-20" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                Evaluaciones
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {loading ? <Loader className="animate-spin" size={32} /> : grades.length}
              </p>
            </div>
            <FileText className="text-purple-600 opacity-20" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                Aprobadas
              </p>
              <p className="text-3xl font-bold text-green-600">
                {loading ? <Loader className="animate-spin" size={32} /> : grades.filter(g => g.score >= 60).length}
              </p>
            </div>
            <Award className="text-green-600 opacity-20" size={40} />
          </div>
        </div>

        {/* Nueva tarjeta de Asistencia */}
        <div
          onClick={() => setShowAttendanceModal(true)}
          className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                % Asistencia
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {loadingAttendances ? <Loader className="animate-spin" size={32} /> : (attendanceSummary ? `${attendanceSummary.attendanceRate}%` : '--')}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAttendanceModal(true);
                }}
                className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <ClipboardCheck size={12} />
                Ver detalle
              </button>
            </div>
            <Calendar className="text-blue-600 opacity-20" size={40} />
          </div>
        </div>
      </div>

      {/* Grades Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="animate-spin text-cyan-600" size={40} />
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BarChart size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-semibold">No hay calificaciones registradas</p>
          <p className="text-sm text-gray-500 mt-2">
            Tus calificaciones aparecerán aquí una vez que completes las evaluaciones
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Evaluación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Calificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grades.map((grade, index) => (
                  <tr key={index} className="hover:bg-gray-50:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">
                        {grade.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {grade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {grade.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-gray-800">
                        {grade.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        grade.score >= 60
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {grade.score >= 60 ? 'Aprobado' : 'Reprobado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      <StudentAttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        attendances={attendances}
        attendanceSummary={attendanceSummary}
        loading={loadingAttendances}
        courseName={course?.title || 'Materia'}
      />
    </div>
  );
};

export default StudentGradesTab;

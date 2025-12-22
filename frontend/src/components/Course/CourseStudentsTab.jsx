// frontend/src/components/Course/CourseStudentsTab.jsx

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Mail, Loader, UserPlus, Upload, X, Award, TrendingUp, Calendar, CheckCircle, XCircle, ClipboardCheck } from 'lucide-react';
import api from '../../services/api';
import Toast from '../Toast';
import WorkGroupsModal from './WorkGroupsModal';
import AttendanceModal from './AttendanceModal';

const CourseStudentsTab = ({ course, onManageStudents }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showWorkGroupsModal, setShowWorkGroupsModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [studentAttendance, setStudentAttendance] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState('grades'); // 'grades' or 'attendance'

  useEffect(() => {
    fetchStudents();
  }, [course.id]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/students`);
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
      showToastMessage('Error al cargar estudiantes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/courses/${course.id}/students/${studentId}/grades`);
      setStudentDetails(response.data);
    } catch (err) {
      console.error('Error al cargar detalles del estudiante:', err);
      showToastMessage('Error al cargar las calificaciones del estudiante', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchStudentAttendance = async (studentId) => {
    try {
      setLoadingAttendance(true);
      const response = await api.get(`/courses/${course.id}/students/${studentId}/attendance`);
      setStudentAttendance(response.data);
    } catch (err) {
      console.error('Error al cargar asistencias del estudiante:', err);
      showToastMessage('Error al cargar asistencias del estudiante', 'error');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setActiveTab('grades');
    fetchStudentDetails(student.id);
    fetchStudentAttendance(student.id);
  };

  const closeStudentModal = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
    setStudentAttendance(null);
    setActiveTab('grades');
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Users size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Estudiantes</h2>
              <p className="text-sm text-gray-500">
                {students.length} estudiante{students.length !== 1 ? 's' : ''} inscrito{students.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
            >
              <ClipboardCheck size={20} />
              Asistencias
            </button>
            <button
              onClick={() => setShowWorkGroupsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
            >
              <Users size={20} />
              Distribuir Grupos
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar estudiante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-indigo-500" size={32} />
        </div>
      )}

      {/* Students Grid */}
      {!loading && filteredStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student, index) => {
            // Calcular promedio simulado (en producción vendrá del backend)
            const averageGrade = student.averageGrade || Math.floor(Math.random() * 30 + 70);

            return (
              <div
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-xl transition-all border-l-4 border-indigo-600 cursor-pointer transform hover:scale-105"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{student.name}</h3>
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">@{student.username}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">
                      <Mail size={12} />
                      {student.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {student.isActive ? (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-semibold rounded">
                          Inactivo
                        </span>
                      )}
                      {student.workGroup && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded flex items-center gap-1">
                          <Users size={12} />
                          Grupo {student.workGroup.groupNumber}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded flex items-center gap-1 ${
                        averageGrade >= 70
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : averageGrade >= 50
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}>
                        <Award size={12} />
                        {averageGrade}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStudents.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          {searchQuery ? (
            <>
              <Search className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No se encontraron estudiantes
              </h3>
              <p className="text-gray-600 mb-6">
                Intenta con otro término de búsqueda
              </p>
            </>
          ) : (
            <>
              <UserPlus className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Sin estudiantes inscritos
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza agregando estudiantes a esta materia
              </p>
              <button
                onClick={onManageStudents}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
              >
                Agregar Estudiantes
              </button>
            </>
          )}
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                  <p className="text-indigo-100">@{selectedStudent.username}</p>
                  {selectedStudent.workGroup && (
                    <p className="text-indigo-200 text-sm mt-1 flex items-center gap-1">
                      <Users size={14} />
                      {selectedStudent.workGroup.groupName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeStudentModal}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-gray-100 dark:bg-gray-700 flex border-b border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setActiveTab('grades')}
                className={`flex-1 py-3 px-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'grades'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Award size={20} />
                Calificaciones
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 py-3 px-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'attendance'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <ClipboardCheck size={20} />
                Asistencias
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'grades' && (
                loadingDetails ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader className="animate-spin text-indigo-600" size={48} />
                  </div>
                ) : studentDetails ? (
                  <div className="space-y-6">
                  {/* Student Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="text-green-600 dark:text-green-400" size={20} />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Promedio General</p>
                      </div>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {studentDetails?.data?.summary?.averageGrade || 0}%
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="text-blue-600 dark:text-blue-400" size={20} />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actividades Completadas</p>
                      </div>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {studentDetails?.data?.summary?.completedActivities || 0}/{studentDetails?.data?.summary?.totalActivities || 0}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-purple-600 dark:text-purple-400" size={20} />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Progreso</p>
                      </div>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {studentDetails?.data?.summary?.progress || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Grades Table */}
                  <div className="bg-white dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Award size={20} className="text-indigo-600 dark:text-indigo-400" />
                        Calificaciones por Actividad
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      {studentDetails?.data?.grades && studentDetails.data.grades.length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Quiz</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Calificación</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Intentos</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentDetails.data.grades.map((grade, index) => {
                              const passingScore = grade.passingScore || 70;
                              return (
                                <tr key={index} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="py-3 px-4">
                                    <div className="text-gray-800 dark:text-gray-200 font-medium">{grade.activityName}</div>
                                    {grade.totalQuestions && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {grade.totalQuestions} pregunta{grade.totalQuestions !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {grade.grade !== null ? (
                                      <span className={`inline-block px-3 py-1 rounded-full font-bold ${
                                        grade.grade >= passingScore
                                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                      }`}>
                                        {grade.grade}%
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500 text-sm">Sin intentos</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {grade.status === 'approved' ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Aprobado</span>
                                      </div>
                                    ) : grade.status === 'failed' ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <XCircle className="text-red-600 dark:text-red-400" size={20} />
                                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold">Reprobado</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 dark:text-gray-500">Pendiente</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      grade.attempts >= grade.maxAttempts
                                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                        : grade.attempts > 0
                                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {grade.attempts || 0}/{grade.maxAttempts || 3}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                    {grade.date ? new Date(grade.date).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-12">
                          <Award className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                          <p className="text-gray-500 dark:text-gray-400">No hay calificaciones registradas</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar los detalles del estudiante</p>
                  </div>
                )
              )}

              {/* Attendance Tab */}
              {activeTab === 'attendance' && (
                loadingAttendance ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader className="animate-spin text-indigo-600" size={48} />
                  </div>
                ) : studentAttendance ? (
                  <div className="space-y-6">
                    {/* Attendance Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Clases</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                          {studentAttendance?.data?.summary?.total || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">Presentes</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {studentAttendance?.data?.summary?.present || 0}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Ausentes</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {studentAttendance?.data?.summary?.absent || 0}
                        </p>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Tarde</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {studentAttendance?.data?.summary?.late || 0}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">% Asistencia</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {studentAttendance?.data?.summary?.attendanceRate || 0}%
                        </p>
                      </div>
                    </div>

                    {/* Attendance Records */}
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <ClipboardCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
                          Registro Detallado de Asistencias
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        {studentAttendance?.data?.records && studentAttendance.data.records.length > 0 ? (
                          <table className="w-full">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                              <tr>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Clase</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Justificación</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentAttendance.data.records.map((record, index) => (
                                <tr key={index} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">
                                    {record.classroomTitle}
                                  </td>
                                  <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                    {record.scheduledAt ? new Date(record.scheduledAt).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    }) : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                      record.status === 'PRESENT'
                                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                        : record.status === 'LATE'
                                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                        : record.status === 'EXCUSED'
                                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                    }`}>
                                      {record.status === 'PRESENT' ? 'Presente' :
                                       record.status === 'LATE' ? 'Tarde' :
                                       record.status === 'EXCUSED' ? 'Justificado' : 'Ausente'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                    {record.justification || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-center py-12">
                            <ClipboardCheck className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                            <p className="text-gray-500 dark:text-gray-400">No hay registros de asistencia</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar las asistencias</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Work Groups Modal */}
      <WorkGroupsModal
        isOpen={showWorkGroupsModal}
        onClose={() => setShowWorkGroupsModal(false)}
        course={course}
        students={students}
      />

      {/* Attendance Modal */}
      <AttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        course={course}
        onSuccess={() => {
          fetchStudents();
          if (selectedStudent) {
            fetchStudentAttendance(selectedStudent.id);
          }
        }}
      />

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default CourseStudentsTab;
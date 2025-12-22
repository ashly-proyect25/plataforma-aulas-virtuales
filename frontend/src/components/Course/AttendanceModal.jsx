// frontend/src/components/Course/AttendanceModal.jsx

import { useState, useEffect } from 'react';
import { X, Users, CheckCircle, XCircle, Clock, FileText, Save, Loader, Calendar, UserCheck, UserX } from 'lucide-react';
import api from '../../services/api';
import Toast from '../Toast';

const AttendanceModal = ({ isOpen, onClose, course, onSuccess }) => {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    if (isOpen && course) {
      fetchClassrooms();
    }
  }, [isOpen, course]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/scheduled-classes`);
      // ✅ FIX: El backend devuelve 'classes' no 'classrooms'
      setClassrooms(response.data.classes || []);
      console.log('📋 Clases cargadas:', response.data.classes?.length || 0);
    } catch (err) {
      console.error('Error al cargar clases:', err);
      showToastMessage('Error al cargar clases programadas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassroomAttendance = async (classroomId) => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/classrooms/${classroomId}/attendance`);
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Error al cargar asistencias:', err);
      showToastMessage('Error al cargar asistencias', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomSelect = (classroom) => {
    setSelectedClassroom(classroom);
    fetchClassroomAttendance(classroom.id);
  };

  const handleStatusChange = (studentId, status) => {
    setStudents(students.map(student =>
      student.id === studentId ? { ...student, status } : student
    ));
  };

  // Marcar todos los estudiantes con un estado específico
  const markAllAs = (status) => {
    setStudents(students.map(student => ({
      ...student,
      status: status
    })));
    showToastMessage(`Todos marcados como ${getStatusLabel(status)}`, 'info');
  };

  // Calcular si estamos en el período de clase
  const getClassPeriodInfo = (classroom) => {
    if (!classroom?.scheduledAt) return null;

    const now = new Date();
    const scheduledTime = new Date(classroom.scheduledAt);
    const duration = classroom.duration || 60; // Duración por defecto 60 min
    const endTime = new Date(scheduledTime.getTime() + duration * 60000);

    const EARLY_MINUTES = 15;
    const LATE_GRACE_MINUTES = 30;

    const earlyTime = new Date(scheduledTime.getTime() - EARLY_MINUTES * 60000);
    const lateGraceTime = new Date(scheduledTime.getTime() + LATE_GRACE_MINUTES * 60000);

    const isBeforeClass = now < earlyTime;
    const isInRegistrationWindow = now >= earlyTime && now <= lateGraceTime;
    const isDuringClass = now >= scheduledTime && now <= endTime;
    const isAfterClass = now > endTime;

    return {
      scheduledTime,
      endTime,
      duration,
      isBeforeClass,
      isInRegistrationWindow,
      isDuringClass,
      isAfterClass,
      earlyTime,
      lateGraceTime
    };
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassroom) return;

    try {
      setSaving(true);
      const attendances = students.map(student => ({
        userId: student.id,
        status: student.status
      }));

      await api.post(`/courses/${course.id}/classrooms/${selectedClassroom.id}/attendance`, {
        attendances
      });

      showToastMessage('Asistencias guardadas exitosamente', 'success');
      if (onSuccess) onSuccess();

      // Recargar datos
      fetchClassroomAttendance(selectedClassroom.id);
    } catch (err) {
      console.error('Error al guardar asistencias:', err);
      showToastMessage('Error al guardar asistencias', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'ABSENT':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'LATE':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'EXCUSED':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle size={18} />;
      case 'ABSENT':
        return <XCircle size={18} />;
      case 'LATE':
        return <Clock size={18} />;
      case 'EXCUSED':
        return <FileText size={18} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'Presente';
      case 'ABSENT':
        return 'Ausente';
      case 'LATE':
        return 'Tarde';
      case 'EXCUSED':
        return 'Justificado';
      default:
        return 'Ausente';
    }
  };

  const calculateSummary = () => {
    const summary = {
      present: students.filter(s => s.status === 'PRESENT').length,
      absent: students.filter(s => s.status === 'ABSENT').length,
      late: students.filter(s => s.status === 'LATE').length,
      excused: students.filter(s => s.status === 'EXCUSED').length,
      autoRegistered: students.filter(s => s.markedBy === s.id).length, // Auto-registrados
      total: students.length
    };
    return summary;
  };

  if (!isOpen) return null;

  const summary = students.length > 0 ? calculateSummary() : null;
  const classPeriod = selectedClassroom ? getClassPeriodInfo(selectedClassroom) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={28} />
              <div>
                <h2 className="text-2xl font-bold">Registro de Asistencias</h2>
                <p className="text-indigo-100">{course?.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {!selectedClassroom ? (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Selecciona una clase
                </h3>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-indigo-600" size={32} />
                  </div>
                ) : classrooms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classrooms.map(classroom => (
                      <button
                        key={classroom.id}
                        onClick={() => handleClassroomSelect(classroom)}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition text-left border-2 border-transparent hover:border-indigo-500"
                      >
                        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-1">
                          {classroom.title}
                        </h4>
                        {classroom.scheduledAt && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(classroom.scheduledAt).toLocaleString('es-ES', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                    <p className="text-gray-500 dark:text-gray-400">No hay clases programadas</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Back button and class info */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedClassroom(null)}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    ← Volver a clases
                  </button>
                  <div className="text-right">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">
                      {selectedClassroom.title}
                    </h3>
                    {selectedClassroom.scheduledAt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(selectedClassroom.scheduledAt).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Información de horario y período */}
                {classPeriod && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Calendar className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-800 dark:text-gray-100">Información de Horario</h4>
                          {classPeriod.isInRegistrationWindow && (
                            <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full animate-pulse">
                              Ventana de registro activa
                            </span>
                          )}
                          {classPeriod.isDuringClass && !classPeriod.isInRegistrationWindow && (
                            <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                              Clase en curso
                            </span>
                          )}
                          {classPeriod.isAfterClass && (
                            <span className="px-3 py-1 bg-gray-500 text-white text-xs font-semibold rounded-full">
                              Clase finalizada
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Inicio:</span>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                              {classPeriod.scheduledTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Fin:</span>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                              {classPeriod.endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Duración:</span>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                              {classPeriod.duration} min
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <p>• Ventana de registro: {classPeriod.earlyTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {classPeriod.lateGraceTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones de acción rápida */}
                {students.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Acción rápida:</span>
                    <button
                      onClick={() => markAllAs('PRESENT')}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                    >
                      <UserCheck size={16} />
                      Todos Presentes
                    </button>
                  </div>
                )}

                {/* Summary */}
                {summary && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Presentes</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.present}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle size={20} className="text-red-600 dark:text-red-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ausentes</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.absent}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tarde</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.late}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Justificados</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.excused}</p>
                    </div>
                  </div>
                )}

                {/* Students list */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-indigo-600" size={32} />
                  </div>
                ) : students.length > 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Estudiante</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map(student => {
                            const isAutoRegistered = student.markedBy === student.id;
                            return (
                            <tr key={student.id} className="border-b border-gray-200 dark:border-gray-600">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="font-medium text-gray-800 dark:text-gray-200">{student.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">@{student.username}</div>
                                  </div>
                                  {isAutoRegistered && (
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                                      Auto-registro
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map(status => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusChange(student.id, status)}
                                      className={`px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-1 transition border-2 ${
                                        student.status === status
                                          ? getStatusColor(status)
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                      }`}
                                      title={getStatusLabel(status)}
                                    >
                                      {getStatusIcon(status)}
                                      <span className="hidden sm:inline">{getStatusLabel(status)}</span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No hay estudiantes inscritos</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedClassroom && students.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Asistencias
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};

export default AttendanceModal;

// frontend/src/components/Student/StudentAttendanceModal.jsx

import { X, Calendar, CheckCircle, XCircle, Clock, FileText, Loader } from 'lucide-react';

const StudentAttendanceModal = ({ isOpen, onClose, attendances, attendanceSummary, loading, courseName }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar size={28} />
              <div>
                <h2 className="text-2xl font-bold">Mis Asistencias</h2>
                <p className="text-blue-100">{courseName}</p>
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
            {/* Summary Cards */}
            {attendanceSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">
                        Total Clases
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {attendanceSummary.total}
                      </p>
                    </div>
                    <Calendar className="text-gray-600 opacity-20" size={32} />
                  </div>
                </div>

                <div className="bg-green-50/20 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-700 mb-1">
                        Presentes
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {attendanceSummary.present}
                      </p>
                    </div>
                    <CheckCircle className="text-green-600 opacity-20" size={32} />
                  </div>
                </div>

                <div className="bg-red-50/20 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-1">
                        Ausentes
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {attendanceSummary.absent}
                      </p>
                    </div>
                    <XCircle className="text-red-600 opacity-20" size={32} />
                  </div>
                </div>

                <div className="bg-yellow-50/20 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-yellow-700 mb-1">
                        Tarde
                      </p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {attendanceSummary.late}
                      </p>
                    </div>
                    <Clock className="text-yellow-600 opacity-20" size={32} />
                  </div>
                </div>

                <div className="bg-blue-50/20 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-700 mb-1">
                        % Asistencia
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {attendanceSummary.attendanceRate}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Records Table */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="animate-spin text-cyan-600" size={40} />
              </div>
            ) : attendances.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 font-semibold">No hay registros de asistencia</p>
                <p className="text-sm text-gray-500 mt-2">
                  Los registros de asistencia aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="bg-gray-50/50 rounded-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Clase
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Hora de Registro
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {attendances.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50:bg-gray-700">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-800">
                              {record.classroomTitle}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {record.scheduledAt ? new Date(record.scheduledAt).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {record.status === 'PRESENT' && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                <CheckCircle size={14} />
                                Presente
                              </span>
                            )}
                            {record.status === 'ABSENT' && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                <XCircle size={14} />
                                Ausente
                              </span>
                            )}
                            {record.status === 'LATE' && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                <Clock size={14} />
                                Tarde
                              </span>
                            )}
                            {record.status === 'EXCUSED' && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                <FileText size={14} />
                                Justificado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {record.markedAt ? new Date(record.markedAt).toLocaleString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 flex items-center justify-end border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300:bg-gray-500 transition font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentAttendanceModal;

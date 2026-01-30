// frontend/src/components/Admin/AssignStudentsModal.jsx
import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader, CheckCircle, AlertCircle, Users } from 'lucide-react';
import api, { authAPI } from '../../services/api';

function AssignStudentsModal({ isOpen, onClose, course, onStudentsAssigned }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && course) {
      fetchAvailableStudents();
    }
  }, [isOpen, course]);

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setSelectedStudents([]);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const fetchAvailableStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await authAPI.getAvailableStudents(course.id, searchTerm);
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Error al cargar estudiantes disponibles:', err);
      setError('Error al cargar estudiantes disponibles');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!isOpen || !course) return;

    const timeoutId = setTimeout(() => {
      fetchAvailableStudents();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen, course]);

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      }
      return [...prev, studentId];
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleAssign = async () => {
    if (selectedStudents.length === 0) {
      setError('Selecciona al menos un estudiante');
      return;
    }

    setIsAssigning(true);
    setError('');

    try {
      // Crear inscripciones para cada estudiante seleccionado
      const enrollmentPromises = selectedStudents.map(studentId =>
        api.post(`/courses/${course.id}/enroll`, { studentId })
      );

      await Promise.all(enrollmentPromises);

      setSuccess(`${selectedStudents.length} estudiante(s) asignado(s) exitosamente`);

      // Notificar al padre
      if (onStudentsAssigned) {
        onStudentsAssigned(selectedStudents.length);
      }

      // Cerrar modal después de un momento
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error al asignar estudiantes:', err);
      setError(err.response?.data?.message || 'Error al asignar estudiantes');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Asignar Estudiantes</h2>
              <p className="text-sm text-gray-500">{course.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-green-500" />
              <span className="ml-2 text-gray-600">Cargando estudiantes...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium text-gray-600">No hay estudiantes disponibles</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm
                  ? 'No se encontraron estudiantes con ese criterio'
                  : 'Todos los estudiantes ya están asignados o no hay estudiantes registrados'}
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === students.length && students.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-green-500 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Seleccionar todos ({students.length})
                  </span>
                </label>
                {selectedStudents.length > 0 && (
                  <span className="text-sm text-green-600 font-medium">
                    {selectedStudents.length} seleccionado(s)
                  </span>
                )}
              </div>

              {/* Students List */}
              <div className="space-y-2">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selectedStudents.includes(student.id)
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleSelectStudent(student.id)}
                      className="w-4 h-4 text-green-500 border-gray-300 rounded focus:ring-green-500"
                    />
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {student.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{student.name}</p>
                      <p className="text-sm text-gray-500 truncate">{student.email}</p>
                    </div>
                    <span className="text-xs text-gray-400">@{student.username}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={selectedStudents.length === 0 || isAssigning}
            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAssigning ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Asignando...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Asignar ({selectedStudents.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignStudentsModal;

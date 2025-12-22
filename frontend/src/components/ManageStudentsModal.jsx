// frontend/src/components/ManageStudentsModal.jsx

import { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Search,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Loader,
  Eye,
  EyeOff,
  Mail
} from 'lucide-react';
import api from '../services/api';

const ManageStudentsModal = ({ isOpen, onClose, course, onSuccess }) => {
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      fetchEnrolledStudents();
      fetchAllStudents();
    }
  }, [isOpen, course]);

  const fetchEnrolledStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/students`);
      setEnrolledStudents(response.data.students || []);
      setError('');
    } catch (err) {
      setError('Error al cargar estudiantes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const response = await api.get('/auth/users/students');
      setAllStudents(response.data.students || []);
    } catch (err) {
      console.error('Error al cargar todos los estudiantes:', err);
    }
  };

  const handleEnrollStudent = async (studentId) => {
    try {
      setLoading(true);
      const response = await api.post(`/courses/${course.id}/enroll`, {
        studentId
      });

      if (response.data.success) {
        await fetchEnrolledStudents();
        setSuccess('Estudiante inscrito exitosamente');
        setTimeout(() => setSuccess(''), 3000);
        onSuccess && onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al inscribir estudiante');
    } finally {
      setLoading(false);
    }
  };

  const handleUnenrollStudent = async (studentId) => {
    if (!window.confirm('¿Estás seguro de que deseas desinscribir a este estudiante?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/courses/${course.id}/students/${studentId}`);

      if (response.data.success) {
        await fetchEnrolledStudents();
        setSuccess('Estudiante desinscrito exitosamente');
        setTimeout(() => setSuccess(''), 3000);
        onSuccess && onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al desinscribir estudiante');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar estudiantes no inscritos
  const availableStudents = allStudents.filter(
    student => !enrolledStudents.some(enrolled => enrolled.id === student.id)
  );

  // Filtrar por búsqueda
  const filteredEnrolled = enrolledStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailable = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div 
          className="text-white p-6 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${course.color}, ${course.color}dd)` }}
        >
          <div className="flex items-center gap-3">
            <Users size={28} />
            <div>
              <h2 className="text-2xl font-bold">Gestionar Alumnos</h2>
              <p className="text-white text-opacity-90 text-sm">
                {course.code} - {course.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setShowAddStudent(false)}
              className={`flex-1 px-6 py-3 font-semibold text-sm transition border-b-2 ${
                !showAddStudent
                  ? 'border-b-indigo-600 text-indigo-600 bg-white'
                  : 'border-b-transparent text-gray-600'
              }`}
            >
              Inscritos ({enrolledStudents.length})
            </button>
            <button
              onClick={() => setShowAddStudent(true)}
              className={`flex-1 px-6 py-3 font-semibold text-sm transition border-b-2 ${
                showAddStudent
                  ? 'border-b-indigo-600 text-indigo-600 bg-white'
                  : 'border-b-transparent text-gray-600'
              }`}
            >
              Agregar Alumno ({availableStudents.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-start mb-4">
              <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start mb-4">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-indigo-500" size={32} />
            </div>
          )}

          {/* Enrolled Students List */}
          {!loading && !showAddStudent && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredEnrolled.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">
                    {searchQuery ? 'No se encontraron estudiantes' : 'Sin estudiantes inscritos'}
                  </p>
                </div>
              ) : (
                filteredEnrolled.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">@{student.username}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail size={12} />
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnenrollStudent(student.id)}
                      className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition"
                      title="Desinscribir"
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Available Students List */}
          {!loading && showAddStudent && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAvailable.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">
                    {searchQuery 
                      ? 'No se encontraron estudiantes disponibles' 
                      : 'Todos los estudiantes ya están inscritos'}
                  </p>
                </div>
              ) : (
                filteredAvailable.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">@{student.username}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail size={12} />
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnrollStudent(student.id)}
                      className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition"
                      title="Inscribir"
                      disabled={loading}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageStudentsModal;
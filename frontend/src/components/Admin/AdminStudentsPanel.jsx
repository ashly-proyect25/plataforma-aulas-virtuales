// frontend/src/components/Admin/AdminStudentsPanel.jsx

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Users,
  Plus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader,
  Edit,
  Upload,
  Search,
  Trash2
} from 'lucide-react';
import { authAPI } from '../../services/api';
import CreateStudentModal from './CreateStudentModal';
import EditStudentModal from './EditStudentModal';
import ImportStudentsModal from './ImportStudentsModal';
import ConfirmModal from '../ConfirmModal';

const AdminStudentsPanel = forwardRef((props, ref) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterActive, setFilterActive] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Exponer métodos al padre mediante ref
  useImperativeHandle(ref, () => ({
    openCreateModal: () => {
      setShowCreateModal(true);
    },
    openImportModal: () => {
      setShowImportModal(true);
    }
  }));

  useEffect(() => {
    fetchStudents();
  }, [filterActive]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getAllStudents();
      let studentsList = response.data.students || [];

      // Filtrar por estado
      if (filterActive) {
        studentsList = studentsList.filter(s => s.isActive);
      } else {
        studentsList = studentsList.filter(s => !s.isActive);
      }

      setStudents(studentsList);
      setError('');
    } catch (err) {
      setError('Error al cargar estudiantes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar estudiantes por búsqueda
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      student.name?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.username?.toLowerCase().includes(term)
    );
  });

  const handleStudentCreated = (newStudent) => {
    setStudents(prev => [newStudent, ...prev]);
    setSuccessMessage('Estudiante creado exitosamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleStudentUpdated = (updatedStudent) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === updatedStudent.id ? { ...student, ...updatedStudent } : student
      )
    );
    setSuccessMessage('Estudiante actualizado exitosamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleStudentsImported = (importedStudents) => {
    setStudents(prev => [...importedStudents, ...prev]);
    setSuccessMessage(`${importedStudents.length} estudiantes importados exitosamente`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEditClick = (student) => {
    setSelectedStudent(student);
    setShowEditModal(true);
  };

  const handleToggleStatus = async (studentId, currentStatus) => {
    try {
      const response = await authAPI.toggleStudentStatus(studentId);
      if (response.data.success) {
        setStudents(prev =>
          prev.map(student =>
            student.id === studentId
              ? { ...student, isActive: !currentStatus }
              : student
          )
        );
        setSuccessMessage(response.data.message || 'Estado actualizado');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Error al cambiar estado del estudiante');
      console.error(err);
    }
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setShowConfirmDelete(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      const response = await authAPI.deleteUser(studentToDelete.id);
      if (response.data.success) {
        setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
        setSuccessMessage('Estudiante eliminado exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar estudiante');
      setTimeout(() => setError(''), 5000);
    } finally {
      setStudentToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-orange-500" />
        <span className="ml-2 text-gray-600">Cargando estudiantes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-orange-500" />
            Gestión de Estudiantes
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''} {filterActive ? 'activos' : 'inactivos'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Upload className="w-5 h-5" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            <Plus className="w-5 h-5" />
            Nuevo Estudiante
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Filtro de estado */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilterActive(true)}
            className={`px-4 py-2 rounded-md transition ${
              filterActive
                ? 'bg-white text-orange-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-4 py-2 rounded-md transition ${
              !filterActive
                ? 'bg-white text-orange-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Inactivos
          </button>
        </div>

        {/* Botón Actualizar */}
        <button
          onClick={fetchStudents}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
        >
          Actualizar
        </button>
      </div>

      {/* Tabla de estudiantes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Estudiante
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Email
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                  Estado
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium">No hay estudiantes</p>
                    <p className="text-sm mt-1">
                      {searchTerm
                        ? 'No se encontraron estudiantes con ese criterio de búsqueda'
                        : filterActive
                          ? 'Crea o importa estudiantes para comenzar'
                          : 'No hay estudiantes inactivos'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {student.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{student.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {student.username}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        student.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {student.isActive ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Activo
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            Inactivo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(student)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(student.id, student.isActive)}
                          className={`p-2 rounded-lg transition ${
                            student.isActive
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={student.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {student.isActive ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(student)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateStudentModal
          onClose={() => setShowCreateModal(false)}
          onStudentCreated={handleStudentCreated}
        />
      )}

      {showEditModal && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStudent(null);
          }}
          onStudentUpdated={handleStudentUpdated}
        />
      )}

      <ImportStudentsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onStudentsImported={handleStudentsImported}
      />

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setStudentToDelete(null);
        }}
        onConfirm={confirmDeleteStudent}
        title="Eliminar Estudiante"
        message={`¿Estás seguro de que deseas eliminar al estudiante "${studentToDelete?.name}"? Esta acción no se puede deshacer y el estudiante será removido de todas las materias.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
});

AdminStudentsPanel.displayName = 'AdminStudentsPanel';

export default AdminStudentsPanel;

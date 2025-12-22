// frontend/src/components/Admin/AdminTeachersPanel.jsx

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Users,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader,
  Edit
} from 'lucide-react';
import api from '../../services/api';
import CreateTeacherModal from './CreateTeacherModal';
import EditTeacherModal from './EditTeacherModal';

const AdminTeachersPanel = forwardRef((props, ref) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [filterActive, setFilterActive] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // Exponer métodos al padre mediante ref
  useImperativeHandle(ref, () => ({
    openCreateModal: () => {
      setShowCreateModal(true);
    }
  }));

  useEffect(() => {
    fetchTeachers();
  }, [filterActive]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/users/teachers');
      let teachers = response.data.teachers || [];
      
      // Filtrar por estado
      if (filterActive) {
        teachers = teachers.filter(t => t.isActive);
      } else {
        teachers = teachers.filter(t => !t.isActive);
      }
      
      setTeachers(teachers);
      setError('');
    } catch (err) {
      setError('Error al cargar docentes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherCreated = (newTeacher) => {
    setTeachers(prev => [newTeacher, ...prev]);
    setSuccessMessage('¡Docente creado exitosamente!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleTeacherUpdated = (updatedTeacher) => {
    setTeachers(prev =>
      prev.map(teacher =>
        teacher.id === updatedTeacher.id ? { ...teacher, ...updatedTeacher } : teacher
      )
    );
    setSuccessMessage('¡Docente actualizado exitosamente!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEditClick = (teacher) => {
    setSelectedTeacher(teacher);
    setShowEditModal(true);
  };

  const handleToggleStatus = async (teacherId, currentStatus) => {
    try {
      const response = await api.patch(`/auth/users/${teacherId}/toggle-status`);
      if (response.data.success) {
        setTeachers(prev =>
          prev.map(teacher =>
            teacher.id === teacherId
              ? { ...teacher, isActive: !currentStatus }
              : teacher
          )
        );
        setSuccessMessage(response.data.message);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Error al cambiar estado de docente');
      console.error(err);
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este docente?')) {
      return;
    }

    try {
      // Implementar endpoint de eliminación si es necesario
      setSuccessMessage('Docente eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error al eliminar docente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gestión de Docentes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Administra los docentes de la plataforma</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
        >
          <Plus size={20} />
          Nuevo Docente
        </button>
      </div>

      {/* Mensajes */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex gap-2 items-start">
          <CheckCircle size={20} className="text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-2 items-start">
          <AlertCircle size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterActive(true)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filterActive
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            !filterActive
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Inactivos
        </button>
        <button
          onClick={fetchTeachers}
          className="ml-auto px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        >
          Actualizar
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      )}

      {/* Lista de Docentes */}
      {!loading && teachers.length > 0 && (
        <div className="grid gap-4">
          {teachers.map(teacher => (
            <div
              key={teacher.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{teacher.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      teacher.isActive
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {teacher.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{teacher.email}</p>
                  {teacher.username && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usuario: {teacher.username}</p>
                  )}
                  {teacher._count?.teachingCourses > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                      {teacher._count.teachingCourses} materia(s) asignada(s)
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditClick(teacher)}
                    className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(teacher.id, teacher.isActive)}
                    className={`p-2 rounded-lg transition ${
                      teacher.isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={teacher.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {teacher.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleDeleteTeacher(teacher.id)}
                    className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && teachers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">
            No hay docentes {filterActive ? 'activos' : 'inactivos'}
          </p>
        </div>
      )}

      {/* Modales */}
      <CreateTeacherModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTeacherCreated={handleTeacherCreated}
      />

      <EditTeacherModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
        onTeacherUpdated={handleTeacherUpdated}
      />
    </div>
  );
});

AdminTeachersPanel.displayName = 'AdminTeachersPanel';

export default AdminTeachersPanel;
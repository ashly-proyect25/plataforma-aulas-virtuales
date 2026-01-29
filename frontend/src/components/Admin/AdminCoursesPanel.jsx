// frontend/src/components/Admin/AdminCoursesPanel.jsx

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader,
  Upload,
  Calendar
} from 'lucide-react';
import api from '../../services/api';
import CreateCourseModal from './CreateCourseModal';
import ImportStudentsModal from './ImportStudentsModal';
import CourseStudentsModal from './CourseStudentsModal';
import CourseScheduleModal from '../Course/CourseScheduleModal';

const AdminCoursesPanel = forwardRef((props, ref) => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterActive, setFilterActive] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCourseForImport, setSelectedCourseForImport] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCourseForSchedule, setSelectedCourseForSchedule] = useState(null);

  // Exponer métodos al padre mediante ref
  useImperativeHandle(ref, () => ({
    openCreateModal: () => {
      setShowCreateModal(true);
    }
  }));

  // Cargar datos iniciales
  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  // Recargar cuando cambie el filtro
  useEffect(() => {
    fetchCourses();
  }, [filterActive]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses', {
        params: { isActive: filterActive }
      });
      setCourses(response.data.courses || []);
      setError('');
    } catch (err) {
      setError('Error al cargar materias');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImportStudents = (course) => {
    setSelectedCourseForImport(course);
    setShowImportModal(true);
  };

  const handleOpenStudentsModal = (course) => {
    setSelectedCourseForStudents(course);
    setShowStudentsModal(true);
  };

  const handleOpenScheduleModal = (course) => {
    setSelectedCourseForSchedule(course);
    setShowScheduleModal(true);
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/auth/users/teachers');
      setTeachers(response.data.teachers || []);
    } catch (err) {
      console.error('Error al cargar docentes:', err);
    }
  };

  const handleCourseCreated = (newCourse) => {
    setCourses(prev => [newCourse, ...prev]);
    setSuccessMessage('¡Materia creada exitosamente!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleToggleStatus = async (courseId, currentStatus) => {
    try {
      const response = await api.patch(`/courses/${courseId}/toggle-status`);
      if (response.data.message) {
        setCourses(prev =>
          prev.map(course =>
            course.id === courseId
              ? { ...course, isActive: !currentStatus }
              : course
          )
        );
        setSuccessMessage(response.data.message);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Error al cambiar estado de materia');
      console.error(err);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta materia?')) {
      return;
    }

    try {
      const response = await api.delete(`/courses/${courseId}`);
      if (response.data.success) {
        setCourses(prev => prev.filter(course => course.id !== courseId));
        setSuccessMessage('Materia eliminada exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar materia');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourseId(course.id);
    setEditData({
      title: course.title,
      description: course.description,
      teacherId: course.teacherId,
      credits: course.credits
    });
  };

  const handleSaveEdit = async (courseId) => {
    try {
      setEditLoading(true);
      const response = await api.patch(`/courses/${courseId}`, editData);
      if (response.data.course) {
        setCourses(prev =>
          prev.map(course =>
            course.id === courseId
              ? { ...course, ...response.data.course }
              : course
          )
        );
        setEditingCourseId(null);
        setEditData(null);
        setSuccessMessage('Materia actualizada exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Error al actualizar materia');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCourseId(null);
    setEditData(null);
  };

  const handleEditKeyDown = (e, courseId) => {
    if (e.key === 'Enter') {
      handleSaveEdit(courseId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Sin asignar';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <BookOpen className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gestión de Materias</h2>
            <p className="text-sm text-gray-500">Administra todas las materias y asignaciones</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
        >
          <Plus size={20} />
          Nueva Materia
        </button>
      </div>

      {/* Mensajes */}
      {successMessage && (
        <div className="bg-green-50/20 border border-green-200 rounded-lg p-4 flex gap-2 items-start">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50/20 border border-red-200 rounded-lg p-4 flex gap-2 items-start">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterActive(true)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filterActive
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200:bg-gray-600'
          }`}
        >
          Activas
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            !filterActive
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200:bg-gray-600'
          }`}
        >
          Inactivas
        </button>
        <button
          onClick={fetchCourses}
          className="ml-auto px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200:bg-gray-600 transition"
        >
          Actualizar
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-indigo-500" size={32} />
        </div>
      )}

      {/* Lista de Materias */}
      {!loading && courses.length > 0 && (
        <div className="grid gap-4">
          {courses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-xl transition-shadow duration-200 overflow-hidden"
              style={{ borderLeft: `4px solid ${course.color}` }}
            >
              {editingCourseId === course.id ? (
                // Modo Edición
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      onKeyDown={(e) => handleEditKeyDown(e, course.id)}
                      className="px-3 py-2 border border-gray-300 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Título"
                    />
                    <select
                      value={editData.teacherId}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          teacherId: parseInt(e.target.value)
                        })
                      }
                      className="px-3 py-2 border border-gray-300 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    onKeyDown={(e) => handleEditKeyDown(e, course.id)}
                    className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows="2"
                    placeholder="Descripción"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(course.id)}
                      disabled={editLoading}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                    >
                      {editLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={editLoading}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400:bg-gray-500 transition disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo Vista
                <>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-800">
                            {course.code}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            course.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {course.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{course.title}</p>
                        {course.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {course.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleToggleStatus(course.id, course.isActive)}
                          className={`p-2 rounded-lg transition ${
                            course.isActive
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200:bg-blue-800'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200:bg-gray-600'
                          }`}
                          title={course.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {course.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200:bg-yellow-800 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-2 bg-red-100 text-red-600 hover:bg-red-200:bg-red-800 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Información */}
                    <div className="grid grid-cols-3 gap-3 text-xs text-gray-600 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{course._count?.enrollments || 0} estudiantes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{course._count?.classrooms || 0} clases</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen size={14} />
                        <span>{getTeacherName(course.teacherId)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="bg-gray-50/50 px-4 py-3 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={() => handleOpenScheduleModal(course)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50/20 text-purple-600 hover:bg-purple-100:bg-purple-900/30 rounded-lg transition font-semibold text-sm"
                    >
                      <Calendar size={16} />
                      Horario
                    </button>
                    <button
                      onClick={() => handleOpenImportStudents(course)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50/20 text-green-600 hover:bg-green-100:bg-green-900/30 rounded-lg transition font-semibold text-sm"
                    >
                      <Upload size={16} />
                      Importar
                    </button>
                    <button
                      onClick={() => handleOpenStudentsModal(course)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50/20 text-blue-600 hover:bg-blue-100:bg-blue-900/30 rounded-lg transition font-semibold text-sm"
                    >
                      <Users size={16} />
                      Alumnos
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-semibold">
            No hay materias {filterActive ? 'activas' : 'inactivas'}
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCourseCreated={handleCourseCreated}
        teachers={teachers}
      />

      <ImportStudentsModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedCourseForImport(null);
        }}
        courseId={selectedCourseForImport?.id}
        onSuccess={() => {
          fetchCourses();
        }}
      />

      <CourseStudentsModal
        isOpen={showStudentsModal}
        onClose={() => {
          setShowStudentsModal(false);
          setSelectedCourseForStudents(null);
          fetchCourses(); // Refrescar lista para actualizar contadores
        }}
        course={selectedCourseForStudents}
      />

      <CourseScheduleModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedCourseForSchedule(null);
        }}
        course={selectedCourseForSchedule}
        onSuccess={() => {
          fetchCourses();
        }}
      />
    </div>
  );
});

AdminCoursesPanel.displayName = 'AdminCoursesPanel';

export default AdminCoursesPanel;
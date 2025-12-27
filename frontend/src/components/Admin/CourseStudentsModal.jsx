// frontend/src/components/Admin/CourseStudentsModal.jsx
import { useState, useEffect } from 'react';
import { X, Users, Plus, Edit, Trash2, Loader, AlertCircle, CheckCircle, Mail, User as UserIcon } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../common/ToastContainer';
import { validateUserForm } from '../../utils/validation';

const CourseStudentsModal = ({ isOpen, onClose, course }) => {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      fetchStudents();
    }
  }, [isOpen, course]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/students`);
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
      toast.error('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpiar error del campo específico
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: ''
    });
    setErrors({});
    setShowAddForm(false);
    setEditingStudent(null);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validar formulario
    const validation = validateUserForm(formData, true);
    if (!validation.valid) {
      setErrors(validation.errors);
      toast.error(Object.values(validation.errors)[0]);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/users/student', {
        ...formData,
        courseId: course.id
      });

      if (response.data.success) {
        toast.success('Alumno creado e inscrito exitosamente');
        await fetchStudents();
        resetForm();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al crear alumno';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      username: student.username,
      email: student.email,
      password: '' // No mostrar la contraseña actual
    });
    setShowAddForm(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validar formulario sin password (es opcional en edición)
    const dataToValidate = {
      name: formData.name,
      username: formData.username,
      email: formData.email
    };

    const validation = validateUserForm(dataToValidate, false);
    if (!validation.valid) {
      setErrors(validation.errors);
      toast.error(Object.values(validation.errors)[0]);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.patch(`/auth/users/${editingStudent.id}`, dataToValidate);

      if (response.data.success) {
        toast.success('Alumno actualizado exitosamente');
        await fetchStudents();
        resetForm();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al actualizar alumno';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este alumno de la materia?')) {
      return;
    }

    try {
      await api.delete(`/courses/${course.id}/students/${studentId}`);
      toast.success('Alumno eliminado de la materia');
      await fetchStudents();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al eliminar alumno';
      toast.error(errorMsg);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Alumnos de {course.code}</h2>
              <p className="text-sm text-gray-400">{course.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Botón Agregar Alumno */}
          {!showAddForm && (
            <div className="mb-4 flex justify-start">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Agregar Alumno
              </button>
            </div>
          )}

          {/* Formulario Agregar/Editar */}
          {showAddForm && (
            <div className="bg-gray-50/50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full pl-9 pr-3 py-2 bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 text-sm ${
                          errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                        }`}
                        placeholder="Juan Pérez García"
                      />
                    </div>
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>

                  {/* Usuario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuario
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className={`w-full pl-9 pr-3 py-2 bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 text-sm ${
                          errors.username ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                        }`}
                        placeholder="juan.perez"
                      />
                    </div>
                    {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full pl-9 pr-3 py-2 bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 text-sm ${
                          errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                        }`}
                        placeholder="juan@email.com"
                      />
                    </div>
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                  </div>

                  {/* Contraseña (solo para crear) */}
                  {!editingStudent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 text-sm ${
                          errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                        }`}
                        placeholder="Mínimo 8 caracteres"
                      />
                      {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300:bg-slate-600 text-gray-800 rounded-lg font-medium transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                  >
                    {isSubmitting ? 'Guardando...' : editingStudent ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-blue-400" size={32} />
            </div>
          )}

          {/* Lista de Alumnos */}
          {!loading && students.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 mb-3">
                Total: {students.length} alumno{students.length !== 1 ? 's' : ''}
              </p>
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-gray-50/50 rounded-lg p-4 border border-gray-200 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-gray-800 font-semibold">{student.name}</h4>
                      <p className="text-sm text-gray-400">{student.email}</p>
                      <p className="text-xs text-gray-500 mt-1">Usuario: {student.username}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                        title="Eliminar de la materia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && students.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-600 mb-3" size={48} />
              <p className="text-gray-400 font-semibold">No hay alumnos inscritos en esta materia</p>
              <p className="text-gray-500 text-sm mt-1">Agrega alumnos para comenzar</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300:bg-slate-600 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseStudentsModal;

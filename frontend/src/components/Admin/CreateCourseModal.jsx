// frontend/src/components/Admin/CreateCourseModal.jsx

import { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const CreateCourseModal = ({ isOpen, onClose, onCourseCreated, teachers }) => {
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    teacherId: '',
    color: '#6366f1',
    credits: 3
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Colores predefinidos
  const colorOptions = [
    { name: 'Índigo', value: '#6366f1' },
    { name: 'Púrpura', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Rojo', value: '#ef4444' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Convertir automáticamente a mayúsculas para code y title
    if (name === 'code' || name === 'title') {
      finalValue = value.toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'credits' || name === 'teacherId' ? parseInt(value) : finalValue
    }));
    setError('');
  };

  const handleColorSelect = (color) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones
      if (!formData.code.trim()) {
        throw new Error('El código de materia es requerido');
      }

      if (!formData.title.trim()) {
        throw new Error('El título de la materia es requerido');
      }

      if (!formData.teacherId) {
        throw new Error('Debes seleccionar un docente');
      }

      // Código debe ser único y sin espacios
      if (!/^[A-Z0-9]+$/.test(formData.code)) {
        throw new Error('El código debe contener solo letras mayúsculas y números');
      }

      const response = await api.post('/courses', {
        code: formData.code.toUpperCase(),
        title: formData.title,
        description: formData.description,
        teacherId: formData.teacherId,
        color: formData.color,
        credits: formData.credits
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setFormData({
            code: '',
            title: '',
            description: '',
            teacherId: '',
            color: '#6366f1',
            credits: 3
          });
          setSuccess(false);
          onCourseCreated(response.data.course);
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen size={24} />
            <h2 className="text-xl font-bold">Nueva Materia</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Código */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código de Materia *
              <span className="text-xs text-gray-500 ml-1">(ej: MAT101, ENG201)</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="MAT101"
              maxLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ej: Cálculo Diferencial"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descripción de la materia..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Docente */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Asignar a Docente *
            </label>
            <select
              name="teacherId"
              value={formData.teacherId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            >
              <option value="">Seleccionar docente...</option>
              {teachers && teachers.length > 0 ? (
                teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))
              ) : (
                <option disabled>No hay docentes disponibles</option>
              )}
            </select>
          </div>

          {/* Créditos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Créditos
            </label>
            <input
              type="number"
              name="credits"
              value={formData.credits}
              onChange={handleChange}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Color de la Materia
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColorSelect(color.value)}
                  className={`h-10 rounded-lg border-2 transition ${
                    formData.color === color.value
                      ? 'border-gray-800'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-start">
              <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">¡Materia creada exitosamente!</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Materia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourseModal;
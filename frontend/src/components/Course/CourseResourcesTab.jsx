// frontend/src/components/Course/CourseResourcesTab.jsx

import { useState, useEffect } from 'react';
import { Plus, Video, FileText, Link as LinkIcon, Info, Trash2, Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import ConfirmDialog from '../ConfirmDialog';
import Toast from '../Toast';

const CourseResourcesTab = ({ courseId }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'VIDEO',
    content: '',
    order: 0
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    loadResources();
  }, [courseId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${courseId}/resources`);
      setResources(response.data.resources || []);
    } catch (err) {
      console.error('Error loading resources:', err);
      setError('Error al cargar recursos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        console.log('✏️ [RESOURCE-UPDATE] Actualizando recurso:', formData);
        await api.patch(`/resources/${editingId}`, formData);
        console.log('✅ [RESOURCE-UPDATE] Recurso actualizado exitosamente');
        setSuccess('Recurso actualizado exitosamente');
      } else {
        console.log('📦 [RESOURCE-CREATE] Creando recurso:', formData);
        const response = await api.post(`/courses/${courseId}/resources`, formData);
        console.log('✅ [RESOURCE-CREATE] Recurso creado exitosamente:', response.data.resource);
        console.log('👀 [RESOURCE-CREATE] El recurso ya está visible para los estudiantes');
        setSuccess('Recurso creado exitosamente');
      }

      await loadResources();
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ [RESOURCE] Error al guardar recurso:', err);
      console.error('❌ [RESOURCE] Detalles del error:', err.response?.data);
      setError(err.response?.data?.message || 'Error al guardar recurso');
    }
  };

  const handleEdit = (resource) => {
    setFormData({
      title: resource.title,
      description: resource.description || '',
      type: resource.type,
      content: resource.content || '',
      order: resource.order
    });
    setEditingId(resource.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    setResourceToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteResource = async () => {
    if (!resourceToDelete) return;

    try {
      await api.delete(`/resources/${resourceToDelete}`);
      setToastMessage('Recurso eliminado exitosamente');
      setToastType('success');
      setShowToast(true);
      await loadResources();
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Error al eliminar recurso');
      setToastType('error');
      setShowToast(true);
    } finally {
      setResourceToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'VIDEO',
      content: '',
      order: 0
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getIcon = (type) => {
    const icons = {
      VIDEO: <Video size={20} className="text-red-500" />,
      DOCUMENT: <FileText size={20} className="text-blue-500" />,
      LINK: <LinkIcon size={20} className="text-green-500" />,
      INFORMATION: <Info size={20} className="text-yellow-500" />
    };
    return icons[type] || <FileText size={20} />;
  };

  const getTypeLabel = (type) => {
    const labels = {
      VIDEO: 'Video',
      DOCUMENT: 'Documento',
      LINK: 'Enlace',
      INFORMATION: 'Información'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">Recursos del Curso</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition flex items-center gap-2"
        >
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Nuevo Recurso'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-start">
          <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Documento</option>
                <option value="LINK">Enlace</option>
                <option value="INFORMATION">Información</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {formData.type === 'INFORMATION' ? 'Contenido' : 'URL'} *
            </label>
            {formData.type === 'INFORMATION' ? (
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="5"
                required
              />
            ) : (
              <input
                type="url"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
                required
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition"
            >
              {editingId ? 'Actualizar' : 'Crear'} Recurso
            </button>
          </div>
        </form>
      )}

      {/* Resources List */}
      {resources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No hay recursos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition flex items-start gap-4"
            >
              <div className="flex-shrink-0 mt-1">
                {getIcon(resource.type)}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800">{resource.title}</h4>
                    <span className="text-xs text-gray-500">{getTypeLabel(resource.type)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(resource)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {resource.description && (
                  <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
                )}

                {resource.content && resource.type !== 'INFORMATION' && (
                  <a
                    href={resource.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ver recurso →
                  </a>
                )}

                {resource.type === 'INFORMATION' && (
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mt-2">
                    {resource.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setResourceToDelete(null);
        }}
        onConfirm={confirmDeleteResource}
        title="Eliminar Recurso"
        message="¿Estás seguro de que deseas eliminar este recurso? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Toast Notifications */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default CourseResourcesTab;

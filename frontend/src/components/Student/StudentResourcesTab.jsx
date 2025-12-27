// frontend/src/components/Student/StudentResourcesTab.jsx

import { useState, useEffect } from 'react';
import { Video, FileText, Link as LinkIcon, Info, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const StudentResourcesTab = ({ courseId }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const getTypeBgColor = (type) => {
    const colors = {
      VIDEO: 'bg-red-100 text-red-600',
      DOCUMENT: 'bg-blue-100 text-blue-600',
      LINK: 'bg-green-100 text-green-600',
      INFORMATION: 'bg-yellow-100 text-yellow-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Recursos del Curso</h3>
          <p className="text-sm text-gray-500 mt-1">
            {resources.length} {resources.length === 1 ? 'recurso disponible' : 'recursos disponibles'}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Resources List */}
      {resources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No hay recursos disponibles</p>
          <p className="text-sm text-gray-500 mt-2">
            El docente aún no ha agregado recursos a este curso
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(resource.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 text-lg">
                        {resource.title}
                      </h4>
                      <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getTypeBgColor(resource.type)}`}>
                        {getTypeLabel(resource.type)}
                      </span>
                    </div>
                  </div>

                  {resource.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {resource.description}
                    </p>
                  )}

                  {resource.content && resource.type !== 'INFORMATION' && (
                    <a
                      href={resource.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-semibold text-sm"
                    >
                      <span>Abrir recurso</span>
                      <ExternalLink size={16} />
                    </a>
                  )}

                  {resource.type === 'INFORMATION' && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg mt-2 border border-gray-200">
                      <p className="whitespace-pre-wrap">{resource.content}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentResourcesTab;

// frontend/src/components/Course/CourseVideosTab.jsx

import { useState, useEffect } from 'react';
import { Video, Plus, Link, Play, Calendar, Eye, Trash2, Edit2, Loader } from 'lucide-react';
import api from '../../services/api';
import ConfirmDialog from '../ConfirmDialog';
import Toast from '../Toast';

const CourseVideosTab = ({ course }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    url: '',
    duration: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    if (course?.id) {
      fetchVideos();
    }
  }, [course?.id]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/resources`);
      const videoResources = (response.data.resources || []).filter(r => r.type === 'VIDEO');
      setVideos(videoResources);
    } catch (error) {
      console.error('Error al cargar videos:', error);
      setToastMessage('Error al cargar los videos');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.url) return;

    try {
      console.log('🎥 [VIDEO-CREATE] Agregando video:', {
        title: newVideo.title,
        url: newVideo.url,
        courseId: course.id
      });

      const response = await api.post(`/courses/${course.id}/resources`, {
        title: newVideo.title,
        description: newVideo.description,
        type: 'VIDEO',
        content: newVideo.url
      });

      if (response.data.success) {
        console.log('✅ [VIDEO-CREATE] Video agregado exitosamente:', response.data.resource);
        console.log('👀 [VIDEO-CREATE] El video ya está visible para los estudiantes');
        await fetchVideos();
        setNewVideo({ title: '', description: '', url: '', duration: '' });
        setShowAddModal(false);
        setToastMessage('Video agregado exitosamente');
        setToastType('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('❌ [VIDEO-CREATE] Error al agregar video:', error);
      console.error('❌ [VIDEO-CREATE] Detalles del error:', error.response?.data);
      setToastMessage(error.response?.data?.message || 'Error al agregar el video');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    setVideoToDelete(videoId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      const response = await api.delete(`/resources/${videoToDelete}`);
      if (response.data.success) {
        await fetchVideos();
        setToastMessage('Video eliminado exitosamente');
        setToastType('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error al eliminar video:', error);
      setToastMessage('Error al eliminar el video');
      setToastType('error');
      setShowToast(true);
    } finally {
      setVideoToDelete(null);
    }
  };

  const getVideoEmbedUrl = (url) => {
    // Convertir URLs de YouTube a embed
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Video size={24} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Videos del Curso</h2>
              <p className="text-sm text-gray-500">
                {videos.length} video{videos.length !== 1 ? 's' : ''} disponible{videos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
          >
            <Plus size={20} />
            Agregar Video
          </button>
        </div>
      </div>

      {/* Add Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-6 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <Video size={24} />
                <h3 className="text-xl font-bold">Agregar Video</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título del Video *
                </label>
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Introducción a las Matemáticas"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  URL del Video (YouTube, Vimeo, etc.) *
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="url"
                    value={newVideo.url}
                    onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows="3"
                  placeholder="Breve descripción del contenido..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duración (opcional)
                </label>
                <input
                  type="text"
                  value={newVideo.duration}
                  onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: 15:30"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddVideo}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                  disabled={!newVideo.title || !newVideo.url}
                >
                  Agregar Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map(video => (
            <div key={video.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
              {/* Video Thumbnail/Embed */}
              <div className="aspect-video bg-gray-900">
                <iframe
                  src={getVideoEmbedUrl(video.url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              
              {/* Video Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-800 flex-1">{video.title}</h3>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {video.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {video.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    {video.duration && (
                      <span className="flex items-center gap-1">
                        <Play size={12} />
                        {video.duration}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {video.views || 0} vistas
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(video.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Video className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Sin videos agregados
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza agregando videos educativos para tus estudiantes
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
          >
            Agregar Primer Video
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setVideoToDelete(null);
        }}
        onConfirm={confirmDeleteVideo}
        title="Eliminar Video"
        message="¿Estás seguro de que deseas eliminar este video? Esta acción no se puede deshacer."
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

export default CourseVideosTab;

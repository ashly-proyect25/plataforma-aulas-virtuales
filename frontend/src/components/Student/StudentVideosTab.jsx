// frontend/src/components/Student/StudentVideosTab.jsx

import { useState, useEffect } from 'react';
import { Video, Play, Clock, Calendar, Eye } from 'lucide-react';
import api from '../../services/api';

const StudentVideosTab = ({ course }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const getVideoEmbedUrl = (url) => {
    if (!url) return '';

    try {
      // Convertir URLs de YouTube a embed
      if (url.includes('youtube.com/watch')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }

      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }

      // YouTube Shorts - extraer ID y convertir a embed normal
      if (url.includes('youtube.com/shorts/')) {
        const videoId = url.split('shorts/')[1]?.split('?')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }

      // Si ya es una URL embed, devolverla tal cual
      if (url.includes('youtube.com/embed')) {
        return url;
      }

      // Para otros videos (Facebook, Vimeo, etc), devolver URL original
      return url;
    } catch (error) {
      console.error('Error processing video URL:', error);
      return url;
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
            <Video size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Videos del Curso</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {videos.length} video{videos.length !== 1 ? 's' : ''} disponible{videos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map(video => (
            <div key={video.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition overflow-hidden">
              {/* Video Thumbnail/Embed */}
              <div className="aspect-video bg-gray-900">
                <iframe
                  src={getVideoEmbedUrl(video.content)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Info */}
              <div className="p-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">{video.title}</h3>

                {video.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {video.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Video className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Sin videos disponibles
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            El docente aún no ha agregado videos para este curso
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentVideosTab;

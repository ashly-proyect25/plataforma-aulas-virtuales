// frontend/src/pages/DocenteDashboard.jsx - CON NAVEGACIÓN A GESTIÓN

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  Settings,
  Loader,
  AlertCircle,
  ChevronRight,
  Clock,
  GraduationCap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import api from '../services/api';
import UserMenu from '../components/UserMenu';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import HelpModal from '../components/HelpModal';

const DocenteDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useStore();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Event listeners para modales
  useEffect(() => {
    const handleOpenChangePassword = () => setShowChangePasswordModal(true);
    const handleOpenEditProfile = () => setShowEditProfileModal(true);
    const handleOpenSettings = () => setShowSettingsModal(true);
    const handleOpenHelp = () => setShowHelpModal(true);

    window.addEventListener('openChangePasswordModal', handleOpenChangePassword);
    window.addEventListener('openEditProfileModal', handleOpenEditProfile);
    window.addEventListener('openSettingsModal', handleOpenSettings);
    window.addEventListener('openHelpModal', handleOpenHelp);

    return () => {
      window.removeEventListener('openChangePasswordModal', handleOpenChangePassword);
      window.removeEventListener('openEditProfileModal', handleOpenEditProfile);
      window.removeEventListener('openSettingsModal', handleOpenSettings);
      window.removeEventListener('openHelpModal', handleOpenHelp);
    };
  }, []);

  useEffect(() => {
    console.log('📍 [DOCENTE-DASHBOARD] useEffect ejecutado');
    console.log('📍 [DOCENTE-DASHBOARD] isAuthenticated:', isAuthenticated);
    console.log('📍 [DOCENTE-DASHBOARD] user:', user);
    
    if (!isAuthenticated) {
      console.log('⚠️ [DOCENTE-DASHBOARD] No autenticado, redirigiendo...');
      navigate('/login/docente');
      return;
    }

    if (user && user.role !== 'TEACHER') {
      console.log('⚠️ [DOCENTE-DASHBOARD] Usuario no es docente, redirigiendo...');
      navigate('/');
      return;
    }

    if (isAuthenticated && user?.role === 'TEACHER') {
      console.log('✅ [DOCENTE-DASHBOARD] Usuario válido, cargando cursos...');
      fetchMyCourses();
    }
  }, [user, isAuthenticated, navigate]);

  const fetchMyCourses = async () => {
    try {
      console.log('📍 [DOCENTE-DASHBOARD] Cargando cursos...');
      setLoading(true);
      const response = await api.get('/courses/my-courses');
      console.log('✅ [DOCENTE-DASHBOARD] Cursos cargados:', response.data);
      setCourses(response.data.courses || []);
      setError('');
    } catch (err) {
      console.error('❌ [DOCENTE-DASHBOARD] Error al cargar cursos:', err);
      setError('Error al cargar tus materias');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (course) => {
    navigate(`/docente/curso/${course.id}`);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100">
        <div className="text-center">
          <Loader className="animate-spin text-purple-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <BookOpen size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panel Docente</h1>
              <p className="text-indigo-100 text-sm">Gestiona tus materias y alumnos</p>
            </div>
          </div>

          {/* User Menu */}
          <UserMenu loginPath="/login/docente" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Mis Materias</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {loading ? <Loader className="animate-spin" size={32} /> : courses.length}
                </p>
              </div>
              <BookOpen className="text-purple-600 opacity-20" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Total Estudiantes</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">
                  {loading ? <Loader className="animate-spin" size={32} /> :
                    courses.reduce((sum, course) => sum + (course._count?.enrollments || 0), 0)}
                </p>
              </div>
              <Users className="text-indigo-600 opacity-20" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Total Clases</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">
                  {loading ? <Loader className="animate-spin" size={32} /> :
                    courses.reduce((sum, course) => sum + (course._count?.classrooms || 0), 0)}
                </p>
              </div>
              <Clock className="text-pink-600 opacity-20" size={40} />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50/20 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <button
                onClick={fetchMyCourses}
                className="text-xs text-red-600 hover:text-red-800:text-red-300 mt-1 font-semibold"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-purple-600" size={40} />
          </div>
        ) : courses.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Mis Materias Asignadas</h2>
              <span className="text-sm text-gray-600">
                {courses.length} {courses.length === 1 ? 'materia' : 'materias'}
              </span>
            </div>

            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-xl transition-shadow duration-200 border-l-4 cursor-pointer group"
                style={{ borderLeftColor: course.color }}
                onClick={() => handleCourseClick(course)}
              >
                <div className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: course.color + '20' }}
                      >
                        <BookOpen size={20} style={{ color: course.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {course.code}
                          </h3>
                          <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                            {course.credits} créditos
                          </span>
                        </div>
                        <p className="text-gray-600">{course.title}</p>
                        {course.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 ml-4 pr-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-600">
                        {course._count?.enrollments || 0}
                      </p>
                      <p className="text-xs text-gray-600">Estudiantes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {course._count?.classrooms || 0}
                      </p>
                      <p className="text-xs text-gray-600">Clases</p>
                    </div>
                    <ChevronRight
                      size={24}
                      className="text-gray-400 group-hover:text-gray-600:text-gray-300 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <GraduationCap className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Sin materias asignadas
            </h3>
            <p className="text-gray-600 mb-6">
              El administrador aún no te ha asignado ninguna materia.
            </p>
            <button
              onClick={fetchMyCourses}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              Actualizar
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};

export default DocenteDashboard;
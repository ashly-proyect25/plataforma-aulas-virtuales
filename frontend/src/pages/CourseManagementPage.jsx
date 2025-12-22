// frontend/src/pages/CourseManagementPage.jsx

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Video,
  FileText,
  HelpCircle,
  BarChart3,
  BookOpen,
  Settings,
  Info,
  X,
  Calendar
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/store';
import api from '../services/api';
import UserMenu from '../components/UserMenu';
import ManageStudentsModal from '../components/ManageStudentsModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import HelpModal from '../components/HelpModal';

// Tabs Components
import CourseInfoTab from '../components/Course/CourseInfoTab';
import CourseStudentsTab from '../components/Course/CourseStudentsTab';
import CourseQuizzesTab from '../components/Course/CourseQuizzesTab';
import CourseStatsTab from '../components/Course/CourseStatsTab';
import CourseResourcesTab from '../components/Course/CourseResourcesTab';
import CourseLiveTab from '../components/Course/CourseLiveTab';
import CourseScheduleView from '../components/Course/CourseScheduleView';
import MinimizedLiveClass from '../components/MinimizedLiveClass';

const CourseManagementPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, activeLiveClass, updateActiveLiveClass, clearActiveLiveClass } = useStore();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showManageStudents, setShowManageStudents] = useState(false);
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
    fetchCourse();
  }, [courseId]);

  // Limpiar clase activa al salir de la página de la materia
  useEffect(() => {
    return () => {
      // Solo limpiar cuando realmente desmontamos el componente (al salir de la página)
      // Usamos un timeout para verificar si realmente estamos saliendo
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (!currentPath.includes(`/materia/${courseId}`)) {
          console.log('🔴 Saliendo de la materia, limpiando clase en vivo');
          clearActiveLiveClass();
        }
      }, 100);
    };
  }, [courseId, clearActiveLiveClass]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${courseId}`);
      setCourse(response.data.course);
    } catch (err) {
      console.error('Error al cargar materia:', err);
      navigate('/docente');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'info', label: 'Información', icon: Info },
    { id: 'live', label: 'Clases en Vivo', icon: Video },
    { id: 'schedule', label: 'Horario', icon: Calendar },
    { id: 'students', label: 'Estudiantes', icon: Users },
    { id: 'resources', label: 'Recursos', icon: FileText },
    { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando materia...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100">
      {/* Header - Compacto */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg sticky top-0 z-40 py-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/docente')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition text-sm"
            >
              <ArrowLeft size={18} className="text-white" strokeWidth={2} />
              <span className="font-semibold text-white">Volver</span>
            </button>
            <UserMenu loginPath="/login/docente" />
          </div>

          {/* Course Info */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-white/20 backdrop-blur-sm border border-white/30">
              <BookOpen size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg">{course.code}</h1>
              <p className="text-purple-100 text-sm">{course.title}</p>
            </div>
            <div className="text-right">
              <p className="text-purple-200 text-xs">Créditos</p>
              <p className="font-bold text-lg">{course.credits}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[100px] z-30 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-b-purple-600 text-purple-600'
                      : 'border-b-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
          {activeTab === 'info' && <CourseInfoTab course={course} />}
        </div>

        {/* Siempre montar CourseLiveTab si estás en 'live' O si hay una clase activa */}
        <div style={{ display: activeTab === 'live' ? 'block' : 'none' }}>
          {(activeTab === 'live' || (activeLiveClass && activeLiveClass.courseId === parseInt(courseId) && activeLiveClass.type === 'teacher')) && (
            <CourseLiveTab course={course} />
          )}
        </div>

        <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
          {activeTab === 'schedule' && <CourseScheduleView course={course} />}
        </div>

        <div style={{ display: activeTab === 'students' ? 'block' : 'none' }}>
          {activeTab === 'students' && (
            <CourseStudentsTab
              course={course}
              onManageStudents={() => setShowManageStudents(true)}
            />
          )}
        </div>

        <div style={{ display: activeTab === 'resources' ? 'block' : 'none' }}>
          {activeTab === 'resources' && <CourseResourcesTab courseId={course.id} />}
        </div>

        <div style={{ display: activeTab === 'quizzes' ? 'block' : 'none' }}>
          {activeTab === 'quizzes' && <CourseQuizzesTab course={course} />}
        </div>

        <div style={{ display: activeTab === 'stats' ? 'block' : 'none' }}>
          {activeTab === 'stats' && <CourseStatsTab course={course} />}
        </div>
      </main>

      {/* Manage Students Modal */}
      <ManageStudentsModal
        isOpen={showManageStudents}
        onClose={() => setShowManageStudents(false)}
        course={course}
        onSuccess={fetchCourse}
      />

      {/* User Menu Modals */}
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

export default CourseManagementPage;
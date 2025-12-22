// frontend/src/pages/AdminDashboard.jsx

import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { useStore } from '../store/store';
import AdminTeachersPanel from '../components/Admin/AdminTeachersPanel';
import AdminCoursesPanel from '../components/Admin/AdminCoursesPanel';
import AdminStatsPanel from '../components/Admin/AdminStatsPanel';
import UserMenu from '../components/UserMenu';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import HelpModal from '../components/HelpModal';

const AdminDashboard = () => {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('stats');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  // Referencias para controlar los modales de otros paneles
  const teachersPanelRef = useRef(null);
  const coursesPanelRef = useRef(null);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Escuchar evento para abrir modal de cambiar contraseña
  useEffect(() => {
    const handleOpenChangePassword = () => {
      setShowChangePasswordModal(true);
    };

    window.addEventListener('openChangePasswordModal', handleOpenChangePassword);
    return () => window.removeEventListener('openChangePasswordModal', handleOpenChangePassword);
  }, []);
  useEffect(() => {
    const handleOpenSettings = () => setShowSettingsModal(true);
    const handleOpenHelp = () => setShowHelpModal(true);
    
    window.addEventListener('openSettingsModal', handleOpenSettings);
    window.addEventListener('openHelpModal', handleOpenHelp);
    
    return () => {
      window.removeEventListener('openSettingsModal', handleOpenSettings);
      window.removeEventListener('openHelpModal', handleOpenHelp);
    };
  }, []);
  useEffect(() => {
    const handleOpenEditProfile = () => {
      setShowEditProfileModal(true);
    };
    window.addEventListener('openEditProfileModal', handleOpenEditProfile);
    return () => window.removeEventListener('openEditProfileModal', handleOpenEditProfile);
  }, []);
  // Funciones para abrir modales desde otros paneles
  const handleOpenCreateTeacher = () => {
    setActiveTab('teachers');
    setTimeout(() => {
      if (teachersPanelRef.current?.openCreateModal) {
        teachersPanelRef.current.openCreateModal();
      }
    }, 100);
  };

  const handleOpenCreateCourse = () => {
    setActiveTab('courses');
    setTimeout(() => {
      if (coursesPanelRef.current?.openCreateModal) {
        coursesPanelRef.current.openCreateModal();
      }
    }, 100);
  };

  const handleDownloadReport = () => {
    alert('Función de descarga de reporte en desarrollo');
  };

  const tabs = [
    {
      id: 'stats',
      label: 'Estadísticas',
      icon: BarChart3,
      color: 'text-green-600'
    },
    {
      id: 'teachers',
      label: 'Docentes',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      id: 'courses',
      label: 'Materias',
      icon: BookOpen,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <LayoutDashboard size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panel Administrativo</h1>
              <p className="text-orange-100 text-sm">Gestión de plataforma</p>
            </div>
          </div>

          {/* User Menu */}
          <UserMenu loginPath="/admin/login" />
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[72px] z-30 shadow-sm">
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
                      ? 'border-b-orange-600 text-orange-600'
                      : 'border-b-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon size={18} className={activeTab === tab.id ? tab.color : ''} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'stats' && (
          <AdminStatsPanel 
            onOpenCreateTeacher={handleOpenCreateTeacher}
            onOpenCreateCourse={handleOpenCreateCourse}
            onDownloadReport={handleDownloadReport}
          />
        )}

        {activeTab === 'teachers' && (
          <AdminTeachersPanel ref={teachersPanelRef} />
        )}

        {activeTab === 'courses' && (
          <AdminCoursesPanel ref={coursesPanelRef} />
        )}
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
      />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
};

export default AdminDashboard;
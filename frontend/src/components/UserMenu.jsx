// frontend/src/components/UserMenu.jsx

import { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  Key,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Bell,
  HelpCircle,
  Shield,
  Palette,
  Globe,
  Volume2,
  Mail,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';

const UserMenu = ({ loginPath = '/login' }) => {
  const { user, logout, theme, setTheme } = useStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const darkMode = theme === 'dark';

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(loginPath);
  };

  const handleChangePassword = () => {
    setIsOpen(false);
    const event = new CustomEvent('openChangePasswordModal');
    window.dispatchEvent(event);
  };

  const handleEditProfile = () => {
    setIsOpen(false);
    const event = new CustomEvent('openEditProfileModal');
    window.dispatchEvent(event);
  };

  const handleSettings = () => {
    setIsOpen(false);
    const event = new CustomEvent('openSettingsModal');
    window.dispatchEvent(event);
  };

  const handleHelp = () => {
    setIsOpen(false);
    const event = new CustomEvent('openHelpModal');
    window.dispatchEvent(event);
  };

  const toggleDarkMode = () => {
    const newTheme = darkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const menuItems = [
    {
      icon: User,
      label: 'Mi Perfil',
      onClick: handleEditProfile,
      description: 'Ver y editar información'
    },
    {
      icon: Key,
      label: 'Cambiar Contraseña',
      onClick: handleChangePassword,
      description: 'Actualizar seguridad',
      divider: true
    },
    {
      icon: Settings,
      label: 'Configuración',
      onClick: handleSettings,
      description: 'Preferencias del sistema'
    },
    {
      icon: HelpCircle,
      label: 'Ayuda y Soporte',
      onClick: handleHelp,
      description: 'Guías y tutoriales',
      divider: true
    },
    {
      icon: LogOut,
      label: 'Cerrar Sesión',
      onClick: handleLogout,
      color: 'text-red-600',
      hoverColor: 'hover:bg-red-50'
    }
  ];

  // Obtener color del rol
  const getRoleColor = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'bg-orange-100 text-orange-700';
      case 'TEACHER':
        return 'bg-purple-100 text-purple-700';
      case 'STUDENT':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'Administrador';
      case 'TEACHER':
        return 'Docente';
      case 'STUDENT':
        return 'Estudiante';
      default:
        return 'Usuario';
    }
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <Shield size={14} />;
      case 'TEACHER':
        return <User size={14} />;
      case 'STUDENT':
        return <User size={14} />;
      default:
        return <User size={14} />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón del menú */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-white">{user?.name}</p>
          <p className="text-xs text-white/75">{user?.email}</p>
        </div>
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center font-bold text-lg shadow-lg text-white">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <ChevronDown
          size={18}
          className={`text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop transparente */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fade-in-down overflow-hidden">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white text-xl shadow-md">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${getRoleColor()} text-xs font-semibold rounded-full`}>
                {getRoleIcon()}
                {getRoleLabel()}
              </span>
            </div>

            {/* Menu Items */}
            <div className="py-1 max-h-96 overflow-y-auto bg-white dark:bg-gray-800">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index}>
                    <button
                      onClick={item.onClick}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 transition-all duration-150 ${
                        item.color || 'text-gray-700 dark:text-gray-200'
                      } ${
                        item.hoverColor || 'hover:bg-gray-100/50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <Icon size={18} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </button>
                    {item.divider && <div className="my-1 border-t border-gray-100 dark:border-gray-700" />}
                  </div>
                );
              })}
            </div>

            {/* Dark Mode Toggle */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors duration-150"
              >
                <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                  {darkMode ? (
                    <Moon size={18} className="text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Sun size={18} className="text-amber-500" />
                  )}
                  <span className="font-medium">Modo Oscuro</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  darkMode ? 'bg-indigo-600' : 'bg-gray-300'
                } relative`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 shadow-sm ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Plataforma de Aulas Virtuales v1.0
              </p>
            </div>
          </div>
        </>
      )}

      {/* CSS para animación */}
      <style>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UserMenu;
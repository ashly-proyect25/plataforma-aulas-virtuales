// frontend/src/components/SettingsModal.jsx

import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Palette,
  Bell,
  Globe,
  Volume2,
  Moon,
  Sun,
  Monitor,
  CheckCircle,
  Save
} from 'lucide-react';
import { useStore } from '../store/store';

const SettingsModal = ({ isOpen, onClose }) => {
  const { theme: currentTheme, setTheme } = useStore();

  const [settings, setSettings] = useState({
    // Apariencia
    theme: currentTheme,
    
    // Notificaciones
    emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
    pushNotifications: localStorage.getItem('pushNotifications') !== 'false',
    classReminders: localStorage.getItem('classReminders') !== 'false',
    
    // Idioma
    language: localStorage.getItem('language') || 'es',
    
    // Audio/Video
    autoplayVideos: localStorage.getItem('autoplayVideos') !== 'false',
    soundEffects: localStorage.getItem('soundEffects') !== 'false',
  });

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance');

  useEffect(() => {
    if (!isOpen) {
      setSaved(false);
    }
  }, [isOpen]);

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // Guardar en localStorage
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(key, value.toString());
    });

    // Actualizar tema en el store
    if (settings.theme !== currentTheme) {
      setTheme(settings.theme);
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const tabs = [
    { id: 'appearance', label: 'Apariencia', icon: Palette },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'language', label: 'Idioma', icon: Globe },
    { id: 'media', label: 'Audio/Video', icon: Volume2 }
  ];

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun, description: 'Tema brillante' },
    { value: 'dark', label: 'Oscuro', icon: Moon, description: 'Tema oscuro' },
    { value: 'system', label: 'Sistema', icon: Monitor, description: 'Según el sistema' }
  ];

  const languageOptions = [
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={28} />
            <div>
              <h2 className="text-2xl font-bold">Configuración</h2>
              <p className="text-indigo-100 text-sm">Personaliza tu experiencia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Apariencia */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Tema de la Aplicación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {themeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleChange('theme', option.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        settings.theme === option.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={32} className={`mx-auto mb-2 ${
                        settings.theme === option.value ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                      <p className="font-semibold text-gray-800">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notificaciones */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Preferencias de Notificaciones</h3>
              
              <div className="space-y-3">
                <ToggleOption
                  label="Notificaciones por Email"
                  description="Recibe alertas importantes en tu correo"
                  checked={settings.emailNotifications}
                  onChange={(value) => handleChange('emailNotifications', value)}
                />
                <ToggleOption
                  label="Notificaciones Push"
                  description="Alertas en tiempo real en tu navegador"
                  checked={settings.pushNotifications}
                  onChange={(value) => handleChange('pushNotifications', value)}
                />
                <ToggleOption
                  label="Recordatorios de Clases"
                  description="Te avisaremos 15 min antes de cada clase"
                  checked={settings.classReminders}
                  onChange={(value) => handleChange('classReminders', value)}
                />
              </div>
            </div>
          )}

          {/* Idioma */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Idioma de la Interfaz</h3>
              <div className="space-y-2">
                {languageOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleChange('language', option.value)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      settings.language === option.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{option.flag}</span>
                      <span className="font-semibold text-gray-800">{option.label}</span>
                    </div>
                    {settings.language === option.value && (
                      <CheckCircle size={20} className="text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Audio/Video */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Configuración Multimedia</h3>
              
              <div className="space-y-3">
                <ToggleOption
                  label="Reproducción Automática"
                  description="Los videos se reproducirán automáticamente"
                  checked={settings.autoplayVideos}
                  onChange={(value) => handleChange('autoplayVideos', value)}
                />
                <ToggleOption
                  label="Efectos de Sonido"
                  description="Sonidos de notificación y alertas"
                  checked={settings.soundEffects}
                  onChange={(value) => handleChange('soundEffects', value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Success Message */}
        {saved && (
          <div className="px-6 pb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-center">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                ¡Configuración guardada exitosamente!
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
          >
            <Save size={18} />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente auxiliar para opciones toggle
const ToggleOption = ({ label, description, checked, onChange }) => {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ml-4 ${
          checked ? 'bg-indigo-600' : 'bg-gray-300'
        } relative`}
      >
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 shadow-sm ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
};

export default SettingsModal;
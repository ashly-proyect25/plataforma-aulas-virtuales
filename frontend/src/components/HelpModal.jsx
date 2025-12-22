// frontend/src/components/HelpModal.jsx

import { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Book, 
  Video, 
  MessageCircle, 
  Mail,
  FileText,
  ExternalLink,
  Search,
  ChevronRight
} from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('getting-started');

  const categories = [
    { id: 'getting-started', label: 'Primeros Pasos', icon: Book },
    { id: 'faq', label: 'Preguntas Frecuentes', icon: MessageCircle },
    { id: 'contact', label: 'Contacto', icon: Mail }
  ];

  const helpContent = {
    'getting-started': [
      {
        title: 'Configurar tu Perfil',
        description: 'Aprende a personalizar tu información y preferencias',
        icon: '👤',
        action: 'Ver guía'
      },
      {
        title: 'Navegar por la Plataforma',
        description: 'Conoce las diferentes secciones y funcionalidades',
        icon: '🧭',
        action: 'Ver guía'
      },
      {
        title: 'Gestionar Notificaciones',
        description: 'Configura cómo y cuándo recibir alertas',
        icon: '🔔',
        action: 'Ver guía'
      }
    ],
    'tutorials': [
      {
        title: 'Crear una Clase Virtual',
        description: 'Tutorial paso a paso para docentes',
        icon: '🎥',
        duration: '5 min',
        action: 'Ver video'
      },
      {
        title: 'Unirse a una Clase',
        description: 'Guía rápida para estudiantes',
        icon: '📚',
        duration: '3 min',
        action: 'Ver video'
      },
      {
        title: 'Compartir Materiales',
        description: 'Cómo subir y compartir archivos',
        icon: '📤',
        duration: '4 min',
        action: 'Ver video'
      }
    ],
    'faq': [
      {
        question: '¿Cómo cambio mi contraseña?',
        answer: 'Ve a tu perfil → Cambiar Contraseña. Necesitarás tu contraseña actual.'
      },
      {
        question: '¿Puedo usar la plataforma en móvil?',
        answer: 'Sí, la plataforma es totalmente responsive y funciona en cualquier dispositivo.'
      },
      {
        question: '¿Cómo recupero mi cuenta?',
        answer: 'Contacta al administrador con tu email institucional para restablecer acceso.'
      },
      {
        question: '¿Dónde veo mis clases grabadas?',
        answer: 'En la sección "Grabaciones" de cada materia encontrarás el historial completo.'
      }
    ],
    'contact': [
      {
        type: 'email',
        title: 'Soporte Técnico',
        value: 'soporte@plataforma.com',
        description: 'Respuesta en 24-48 horas',
        icon: Mail
      },
      {
        type: 'phone',
        title: 'Mesa de Ayuda',
        value: '+593 XX-XXX-XXXX',
        description: 'Lun-Vie 9:00-18:00',
        icon: MessageCircle
      }
    ]
  };

  const filteredContent = searchQuery
    ? Object.values(helpContent).flat().filter(item =>
        JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : helpContent[activeCategory];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle size={28} />
            <div>
              <h2 className="text-2xl font-bold">Centro de Ayuda</h2>
              <p className="text-blue-100 text-sm">Guías, tutoriales y soporte</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar ayuda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 overflow-y-auto">
            <div className="p-4 space-y-1">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium text-sm">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeCategory === 'getting-started' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Primeros Pasos</h3>
                {helpContent['getting-started'].map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{item.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeCategory === 'faq' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Preguntas Frecuentes</h3>
                {helpContent.faq.map((item, index) => (
                  <details
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-colors group"
                  >
                    <summary className="font-semibold text-gray-800 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      {item.question}
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 pl-4 border-l-2 border-blue-200">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            )}

            {activeCategory === 'contact' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Contacta con Nosotros</h3>
                {helpContent.contact.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Icon size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 dark:text-white mb-1">{item.title}</h4>
                          <p className="text-blue-600 font-mono text-sm mb-1">{item.value}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Formulario de Contacto */}
                <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FileText size={20} />
                    Enviar Mensaje
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Asunto"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <textarea
                      placeholder="Describe tu problema o consulta..."
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    />
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                      Enviar Mensaje
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿No encontraste lo que buscabas?
          </p>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
            Ver documentación completa
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
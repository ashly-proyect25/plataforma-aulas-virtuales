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
  const [activeCategory, setActiveCategory] = useState('about');

  const categories = [
    { id: 'about', label: 'Acerca del Proyecto', icon: Book },
    { id: 'features', label: 'Funcionalidades', icon: Video },
    { id: 'faq', label: 'Preguntas Frecuentes', icon: MessageCircle },
    { id: 'contact', label: 'Contacto', icon: Mail }
  ];

  const helpContent = {
    'about': {
      title: 'Plataforma de Aulas Virtuales',
      subtitle: 'Proyecto de Tesis - Innovación en Educación Digital',
      author: 'Ashly Ortega',
      institution: 'Universidad [Nombre de la Universidad]',
      year: '2026',
      description: 'Sistema integral de gestión de clases virtuales en tiempo real diseñado para facilitar la educación a distancia mediante herramientas de comunicación interactiva, transmisión de video, pizarra colaborativa y gestión de cursos.',
      mission: 'Democratizar el acceso a la educación mediante tecnología de vanguardia, proporcionando un espacio virtual donde docentes y estudiantes pueden interactuar de manera efectiva, replicando y mejorando la experiencia del aula presencial.',
      vision: 'Ser la plataforma educativa de referencia que transforma la manera en que se imparte y recibe educación, integrando las últimas tecnologías de comunicación en tiempo real con herramientas pedagógicas innovadoras.',
      technologies: [
        { name: 'React 18', purpose: 'Interfaz de usuario moderna y reactiva' },
        { name: 'WebRTC', purpose: 'Transmisión de video y audio P2P' },
        { name: 'Socket.IO', purpose: 'Comunicación en tiempo real' },
        { name: 'Node.js + Express', purpose: 'Servidor backend robusto' },
        { name: 'PostgreSQL', purpose: 'Base de datos relacional' },
        { name: 'Docker', purpose: 'Contenedorización y escalabilidad' }
      ],
      objectives: [
        'Proporcionar un entorno virtual completo para la enseñanza y aprendizaje en línea',
        'Facilitar la comunicación en tiempo real entre docentes y estudiantes',
        'Ofrecer herramientas colaborativas para mejorar la experiencia educativa',
        'Garantizar accesibilidad desde cualquier dispositivo con conexión a internet',
        'Implementar tecnología WebRTC para videollamadas de alta calidad',
        'Crear una experiencia de usuario intuitiva y fácil de usar'
      ]
    },
    'features': {
      admin: [
        {
          title: 'Gestión de Usuarios',
          description: 'Crear, editar y eliminar cuentas de docentes y estudiantes',
          icon: '👥'
        },
        {
          title: 'Gestión de Cursos',
          description: 'Administrar cursos, asignar docentes y estudiantes a cada materia',
          icon: '📚'
        },
        {
          title: 'Panel de Estadísticas',
          description: 'Visualizar métricas generales: usuarios activos, cursos, clases en vivo',
          icon: '📊'
        },
        {
          title: 'Control de Roles',
          description: 'Asignar y modificar roles (Admin, Docente, Estudiante)',
          icon: '🔐'
        }
      ],
      teacher: [
        {
          title: 'Gestión de Cursos',
          description: 'Ver y administrar los cursos asignados, gestionar contenido',
          icon: '📖'
        },
        {
          title: 'Clases en Vivo',
          description: 'Iniciar transmisiones en vivo con video, audio y compartir pantalla',
          icon: '🎥'
        },
        {
          title: 'Pizarra Colaborativa',
          description: 'Dibujar y explicar conceptos en tiempo real sobre el video',
          icon: '✏️'
        },
        {
          title: 'Control de Participantes',
          description: 'Silenciar estudiantes, gestionar permisos y ver lista de asistentes',
          icon: '🎯'
        },
        {
          title: 'Chat en Vivo',
          description: 'Comunicarse por texto con los estudiantes durante las clases',
          icon: '💬'
        },
        {
          title: 'Compartir Pantalla',
          description: 'Mostrar presentaciones, documentos o cualquier contenido de tu pantalla',
          icon: '🖥️'
        }
      ],
      student: [
        {
          title: 'Mis Cursos',
          description: 'Acceder a los cursos en los que estás inscrito',
          icon: '📚'
        },
        {
          title: 'Unirse a Clases en Vivo',
          description: 'Conectarse a las clases transmitidas por los docentes',
          icon: '🎓'
        },
        {
          title: 'Interacción en Clase',
          description: 'Activar cámara y micrófono para participar en las sesiones',
          icon: '🎤'
        },
        {
          title: 'Compartir Pantalla',
          description: 'Mostrar tu pantalla cuando el docente lo permita',
          icon: '📺'
        },
        {
          title: 'Usar Pizarra',
          description: 'Dibujar en la pizarra colaborativa durante las clases',
          icon: '🖊️'
        },
        {
          title: 'Chat en Vivo',
          description: 'Enviar mensajes al docente y compañeros durante la clase',
          icon: '💭'
        }
      ],
      general: [
        {
          title: 'Responsive Design',
          description: 'Funciona en computadoras, tablets y dispositivos móviles',
          icon: '📱'
        },
        {
          title: 'Tecnología WebRTC',
          description: 'Videollamadas P2P de alta calidad y baja latencia',
          icon: '⚡'
        },
        {
          title: 'Seguridad JWT',
          description: 'Autenticación segura con tokens y gestión de sesiones',
          icon: '🔒'
        }
      ]
    },
    'faq': [
      {
        question: '¿Cómo inicio una clase en vivo como docente?',
        answer: 'Ingresa al curso deseado, ve a la pestaña "Clases en Vivo" y presiona el botón "Iniciar Transmisión". Los estudiantes recibirán una notificación automáticamente.'
      },
      {
        question: '¿Puedo usar la plataforma desde mi celular?',
        answer: 'Sí, la plataforma es totalmente responsive y funciona perfectamente en dispositivos móviles (smartphones y tablets). Todas las funcionalidades están optimizadas para pantallas pequeñas.'
      },
      {
        question: '¿Cómo me uno a una clase en vivo como estudiante?',
        answer: 'Cuando el docente inicie una clase, verás un indicador "EN VIVO" en el curso. Ingresa al curso y haz clic en "Unirse a clase en vivo" en la pestaña de Clases.'
      },
      {
        question: '¿Qué navegadores son compatibles?',
        answer: 'La plataforma funciona mejor en navegadores modernos como Google Chrome, Microsoft Edge, Firefox y Safari (versiones recientes). Para mejor experiencia en videollamadas, recomendamos Chrome o Edge.'
      },
      {
        question: '¿Puedo compartir mi pantalla durante una clase?',
        answer: 'Sí, tanto docentes como estudiantes pueden compartir su pantalla durante las clases en vivo. Solo presiona el botón de "Compartir Pantalla" en los controles del video.'
      },
      {
        question: '¿Cómo funciona la pizarra colaborativa?',
        answer: 'La pizarra está disponible durante las clases en vivo. Presiona el botón de pizarra, selecciona el color y herramienta de dibujo, y dibuja directamente sobre el video. Todos los participantes verán tus trazos en tiempo real.'
      },
      {
        question: '¿Necesito instalar algún programa adicional?',
        answer: 'No, la plataforma funciona completamente en el navegador web. No necesitas descargar ni instalar ningún software adicional.'
      },
      {
        question: '¿Cómo cambio mi contraseña?',
        answer: 'Haz clic en tu perfil (esquina superior derecha) → Cambiar Contraseña. Necesitarás ingresar tu contraseña actual y la nueva contraseña dos veces para confirmar.'
      },
      {
        question: '¿Los estudiantes pueden activar su cámara y micrófono?',
        answer: 'Sí, los estudiantes pueden activar/desactivar su cámara y micrófono durante las clases. El docente puede silenciar a todos los estudiantes si es necesario.'
      },
      {
        question: '¿Qué hago si tengo problemas de conexión durante una clase?',
        answer: 'Verifica tu conexión a internet. Si el problema persiste, intenta recargar la página o salir y volver a unirte a la clase. Para mejor experiencia, usa conexión Wi-Fi estable.'
      }
    ],
    'contact': {
      email: 'ashlyortega@atomicmail.com',
      author: 'Ashly Ortega',
      role: 'Desarrolladora - Proyecto de Tesis',
      message: 'Para consultas, soporte técnico o más información sobre el proyecto, puedes contactarme a través del siguiente correo electrónico:'
    }
  };

  const filteredContent = searchQuery
    ? Object.values(helpContent).flat().filter(item =>
        JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : helpContent[activeCategory];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
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
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar ayuda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
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
                        : 'text-gray-700 hover:bg-gray-100'
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
            {activeCategory === 'about' && (
              <div className="space-y-6">
                {/* Header Principal */}
                <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 p-8 rounded-2xl text-white shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold mb-2">{helpContent.about.title}</h3>
                      <p className="text-blue-100 text-sm mb-1">{helpContent.about.subtitle}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
                          Autora: {helpContent.about.author}
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
                          {helpContent.about.year}
                        </div>
                      </div>
                    </div>
                    <div className="text-6xl">🎓</div>
                  </div>
                  <p className="text-white/90 leading-relaxed">{helpContent.about.description}</p>
                </div>

                {/* Misión y Visión */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
                        🎯
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">Misión</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{helpContent.about.mission}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl">
                        🔮
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">Visión</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{helpContent.about.vision}</p>
                  </div>
                </div>

                {/* Tecnologías */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">⚙️</span>
                    Tecnologías Implementadas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {helpContent.about.technologies.map((tech, index) => (
                      <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{tech.name}</p>
                          <p className="text-xs text-gray-600">{tech.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Objetivos */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Objetivos del Proyecto
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {helpContent.about.objectives.map((objective, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{objective}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'features' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-xl text-white">
                  <h3 className="text-2xl font-bold mb-2">Funcionalidades de la Plataforma</h3>
                  <p className="text-blue-100 text-sm">Capacidades específicas según el rol del usuario</p>
                </div>

                {/* Funcionalidades de Administrador */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-2xl shadow-lg">
                      👨‍💼
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Administrador</h4>
                      <p className="text-xs text-gray-600">Control total del sistema</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {helpContent.features.admin.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h5>
                            <p className="text-xs text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Funcionalidades de Docente */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-2xl shadow-lg">
                      👨‍🏫
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Docente</h4>
                      <p className="text-xs text-gray-600">Herramientas para impartir clases</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {helpContent.features.teacher.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h5>
                            <p className="text-xs text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Funcionalidades de Estudiante */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-2xl shadow-lg">
                      👨‍🎓
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Estudiante</h4>
                      <p className="text-xs text-gray-600">Participación en clases virtuales</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {helpContent.features.student.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h5>
                            <p className="text-xs text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Funcionalidades Generales */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white text-2xl shadow-lg">
                      ⭐
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Características Generales</h4>
                      <p className="text-xs text-gray-600">Disponibles para todos los usuarios</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {helpContent.features.general.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h5>
                            <p className="text-xs text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'faq' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Preguntas Frecuentes</h3>
                {helpContent.faq.map((item, index) => (
                  <details
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group"
                  >
                    <summary className="font-semibold text-gray-800 cursor-pointer list-none flex items-center justify-between">
                      {item.question}
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="text-sm text-gray-600 mt-3 pl-4 border-l-2 border-blue-200">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            )}

            {activeCategory === 'contact' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Información de Contacto</h3>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                  <p className="text-gray-700 mb-6 leading-relaxed">{helpContent.contact.message}</p>

                  <div className="bg-white p-6 rounded-lg border-2 border-blue-300 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail size={28} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 mb-1">{helpContent.contact.author}</h4>
                        <p className="text-sm text-gray-600 mb-3">{helpContent.contact.role}</p>
                        <a
                          href={`mailto:${helpContent.contact.email}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                        >
                          <Mail size={16} />
                          {helpContent.contact.email}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-yellow-800">Nota:</span> Este proyecto fue desarrollado como trabajo de tesis.
                    Para consultas académicas, técnicas o cualquier información adicional, no dudes en contactarme.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
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
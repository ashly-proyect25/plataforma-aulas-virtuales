// frontend/src/pages/StudentCourseViewPage.jsx

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Video,
  FileText,
  HelpCircle,
  BookOpen,
  Info,
  Award,
  PlayCircle,
  Users,
  Calendar
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/store';
import api from '../services/api';
import UserMenu from '../components/UserMenu';

// Student Tabs Components (we'll create these)
import StudentCourseInfoTab from '../components/Student/StudentCourseInfoTab';
import StudentResourcesTab from '../components/Student/StudentResourcesTab';
import StudentVideosTab from '../components/Student/StudentVideosTab';
import StudentQuizzesTab from '../components/Student/StudentQuizzesTab';
import StudentGradesTab from '../components/Student/StudentGradesTab';
import StudentLiveTab from '../components/Student/StudentLiveTab';
import StudentClassmatesTab from '../components/Student/StudentClassmatesTab';
import CourseScheduleView from '../components/Course/CourseScheduleView';
import MinimizedLiveClass from '../components/MinimizedLiveClass';

const StudentCourseViewPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, activeLiveClass, updateActiveLiveClass, clearActiveLiveClass } = useStore();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Limpiar clase activa al salir de la página de la materia
  useEffect(() => {
    return () => {
      // Solo limpiar cuando realmente desmontamos el componente (al salir de la página)
      // Usamos un timeout para verificar si realmente estamos saliendo
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (!currentPath.includes(`/alumno/materia/${courseId}`)) {
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
      navigate('/alumno/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'info', label: 'Información', icon: Info },
    { id: 'live', label: 'Clases en Vivo', icon: Video },
    { id: 'schedule', label: 'Horario', icon: Calendar },
    { id: 'classmates', label: 'Compañeros', icon: Users },
    { id: 'resources', label: 'Recursos', icon: FileText },
    { id: 'videos', label: 'Videos', icon: PlayCircle },
    { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
    { id: 'grades', label: 'Mis Notas', icon: Award }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando materia...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header - Compacto */}
      <header className={`bg-gradient-to-r from-cyan-600 to-blue-600 text-white sticky top-0 z-40 transition-all duration-300 ${
        isScrolled ? 'py-1 shadow-xl' : 'py-4 shadow-lg'
      }`}>
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'mb-1' : 'mb-2'
          }`}>
            <button
              onClick={() => navigate('/alumno/dashboard')}
              className={`flex items-center gap-2 px-3 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition text-white ${
                isScrolled ? 'py-1 text-xs' : 'py-1.5 text-sm'
              }`}
            >
              <ArrowLeft size={isScrolled ? 16 : 18} />
              <span className="font-semibold">Volver</span>
            </button>
            <UserMenu loginPath="/login/alumno" />
          </div>

          {/* Course Info */}
          <div className={`flex items-center gap-3 transition-all duration-300 ${
            isScrolled ? 'scale-90 origin-left' : 'scale-100'
          }`}>
            <div
              className={`rounded-lg transition-all duration-300 ${
                isScrolled ? 'p-1.5' : 'p-2'
              }`}
              style={{ backgroundColor: course.color + '40' }}
            >
              <BookOpen size={isScrolled ? 20 : 24} />
            </div>
            <div className="flex-1">
              <h1 className={`font-bold transition-all duration-300 ${
                isScrolled ? 'text-base' : 'text-lg'
              }`}>{course.code}</h1>
              <p className={`text-cyan-100 transition-all duration-300 ${
                isScrolled ? 'text-xs' : 'text-sm'
              }`}>{course.title}</p>
            </div>
            <div className="text-right">
              <p className={`text-cyan-200 transition-all duration-300 ${
                isScrolled ? 'text-[10px]' : 'text-xs'
              }`}>Créditos</p>
              <p className={`font-bold transition-all duration-300 ${
                isScrolled ? 'text-base' : 'text-lg'
              }`}>{course.credits}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky z-30 shadow-sm transition-all duration-300 ${
        isScrolled ? 'top-[52px]' : 'top-[90px]'
      }`}>
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
                      ? 'border-b-cyan-600 text-cyan-600 dark:text-cyan-400'
                      : 'border-b-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
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
          {activeTab === 'info' && <StudentCourseInfoTab course={course} />}
        </div>

        {/* Siempre montar StudentLiveTab si estás en 'live' O si hay una clase activa */}
        <div style={{ display: activeTab === 'live' ? 'block' : 'none' }}>
          {(activeTab === 'live' || (activeLiveClass && activeLiveClass.courseId === parseInt(courseId) && activeLiveClass.type === 'student')) && (
            <StudentLiveTab course={course} />
          )}
        </div>

        <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
          {activeTab === 'schedule' && <CourseScheduleView course={course} />}
        </div>

        <div style={{ display: activeTab === 'classmates' ? 'block' : 'none' }}>
          {activeTab === 'classmates' && <StudentClassmatesTab course={course} />}
        </div>

        <div style={{ display: activeTab === 'resources' ? 'block' : 'none' }}>
          {activeTab === 'resources' && <StudentResourcesTab courseId={course.id} />}
        </div>

        <div style={{ display: activeTab === 'videos' ? 'block' : 'none' }}>
          {activeTab === 'videos' && <StudentVideosTab course={course} />}
        </div>

        <div style={{ display: activeTab === 'quizzes' ? 'block' : 'none' }}>
          {activeTab === 'quizzes' && <StudentQuizzesTab course={course} />}
        </div>

        <div style={{ display: activeTab === 'grades' ? 'block' : 'none' }}>
          {activeTab === 'grades' && <StudentGradesTab course={course} />}
        </div>
      </main>
    </div>
  );
};

export default StudentCourseViewPage;

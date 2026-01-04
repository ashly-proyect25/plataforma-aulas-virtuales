// frontend/src/pages/AlumnoDashboard.jsx

import { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Video,
  PlayCircle,
  Clock,
  Calendar,
  FileText,
  Loader,
  AlertCircle,
  UserCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useNavigateSafe } from '../hooks/useNavigateSafe';
import { useStore } from '../store/store';
import api from '../services/api';
import UserMenu from '../components/UserMenu';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import HelpModal from '../components/HelpModal';
import Toast from '../components/Toast';

function AlumnoDashboard() {
  const navigate = useNavigateSafe();
  const { user, isAuthenticated } = useStore();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveClasses, setLiveClasses] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [liveCourses, setLiveCourses] = useState([]); // Cursos con clases en vivo
  const [scheduledClasses, setScheduledClasses] = useState([]); // Clases programadas
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({}); // {classroomId: {loading, registered, status}}
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' | 'error' | 'info'
  const [showToast, setShowToast] = useState(false);
  // Escuchar evento para abrir modal de cambiar contraseña
  useEffect(() => {
    const handleOpenChangePassword = () => {
      setShowChangePasswordModal(true);
    };
    window.addEventListener('openChangePasswordModal', handleOpenChangePassword);
    return () => window.removeEventListener('openChangePasswordModal', handleOpenChangePassword);
  }, []);

  useEffect(() => {
    const handleOpenEditProfile = () => {
      setShowEditProfileModal(true);
    };
    window.addEventListener('openEditProfileModal', handleOpenEditProfile);
    return () => window.removeEventListener('openEditProfileModal', handleOpenEditProfile);
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
  // Verificar autenticación y cargar datos
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login/alumno');
      return;
    }

    if (user && user.role !== 'STUDENT') {
      navigate('/');
      return;
    }

    if (isAuthenticated && user?.role === 'STUDENT') {
      fetchMyCourses();
    }
  }, [user, isAuthenticated, navigate]);

  // Auto-actualizar clases programadas y en vivo cada minuto
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'STUDENT') return;

    // Actualizar cada 30 segundos para clases en vivo (más frecuente)
    const interval = setInterval(() => {
      console.log('🔄 [STUDENT-DASHBOARD] Auto-actualizando clases...');
      fetchScheduledClasses();
      fetchActiveLiveClasses();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const fetchMyCourses = async () => {
    try {
      console.log('📍 [STUDENT-DASHBOARD] Cargando materias...');
      setLoading(true);
      const response = await api.get('/courses/my-enrollments');
      console.log('✅ [STUDENT-DASHBOARD] Materias cargadas:', response.data);
      const loadedCourses = response.data.courses || [];
      setCourses(loadedCourses);

      // Cargar recursos recientes de todos los cursos
      fetchRecentResources(loadedCourses);

      // Cargar clases programadas (próximos 5 días)
      fetchScheduledClasses();

      // Cargar clases en vivo activas
      fetchActiveLiveClasses();

      setError('');
    } catch (err) {
      console.error('❌ [STUDENT-DASHBOARD] Error al cargar materias:', err);
      setError('Error al cargar tus materias');
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledClasses = async () => {
    try {
      console.log('📍 [STUDENT-DASHBOARD] Cargando clases programadas...');
      const response = await api.get('/courses/upcoming-classes');

      if (response.data.success) {
        const classes = response.data.classes || [];
        console.log(`✅ [STUDENT-DASHBOARD] ${classes.length} clases programadas encontradas`);
        setScheduledClasses(classes);
      }
    } catch (err) {
      console.error('❌ [STUDENT-DASHBOARD] Error al cargar clases programadas:', err);
      // No mostrar error al usuario, simplemente no mostrar clases
      setScheduledClasses([]);
    }
  };

  const fetchActiveLiveClasses = async () => {
    try {
      console.log('📍 [STUDENT-DASHBOARD] Cargando clases en vivo activas...');
      const response = await api.get('/courses/active-live-classes');

      if (response.data.success) {
        const classes = response.data.liveClasses || [];
        console.log(`✅ [STUDENT-DASHBOARD] ${classes.length} clases en vivo encontradas`);
        setLiveCourses(classes);
      }
    } catch (err) {
      console.error('❌ [STUDENT-DASHBOARD] Error al cargar clases en vivo:', err);
      setLiveCourses([]);
    }
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const registerAttendance = async (classroomData) => {
    const { id: classroomId, courseId } = classroomData;

    try {
      // Marcar como loading
      setAttendanceStatus(prev => ({
        ...prev,
        [classroomId]: { loading: true, registered: false }
      }));

      console.log('📍 [ATTENDANCE] Registrando asistencia para clase:', classroomId);

      const response = await api.post(`/courses/${courseId}/classrooms/${classroomId}/self-attendance`);

      if (response.data.success) {
        const status = response.data.status;
        console.log('✅ [ATTENDANCE] Asistencia registrada:', status);

        setAttendanceStatus(prev => ({
          ...prev,
          [classroomId]: { loading: false, registered: true, status }
        }));

        showToastMessage(response.data.message, 'success');

        // Recargar clases programadas para actualizar la UI
        fetchScheduledClasses();
      }
    } catch (error) {
      console.error('❌ [ATTENDANCE] Error al registrar asistencia:', error);

      setAttendanceStatus(prev => ({
        ...prev,
        [classroomId]: { loading: false, registered: false, error: true }
      }));

      const errorMessage = error.response?.data?.message || 'Error al registrar asistencia';
      showToastMessage(errorMessage, 'error');
    }
  };

  const fetchRecentResources = async (coursesData) => {
    try {
      const allResources = [];

      for (const course of coursesData) {
        try {
          const response = await api.get(`/courses/${course.id}/resources`);
          const resources = response.data.resources || [];

          // Agregar información del curso a cada recurso
          resources.forEach(resource => {
            allResources.push({
              ...resource,
              courseName: course.title,
              courseCode: course.code,
              courseId: course.id,
              courseColor: course.color
            });
          });
        } catch (err) {
          console.error(`Error loading resources for course ${course.id}:`, err);
        }
      }

      // Ordenar por fecha de creación y tomar los 5 más recientes
      const sortedResources = allResources
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setRecentResources(sortedResources);
    } catch (err) {
      console.error('Error al cargar recursos recientes:', err);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <GraduationCap size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panel del Estudiante</h1>
              <p className="text-blue-100 text-sm">Mis clases y materias</p>
            </div>
          </div>

          {/* User Menu */}
          <UserMenu loginPath="/login/alumno" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
              <GraduationCap size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">¡Bienvenido, {user?.name}!</h2>
              <p className="text-blue-100">Tu espacio de aprendizaje virtual</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-cyan-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Materias Inscritas</p>
                <p className="text-3xl font-bold text-cyan-600 mt-1">
                  {loading ? <Loader className="animate-spin" size={32} /> : courses.length}
                </p>
              </div>
              <BookOpen className="text-cyan-600 opacity-20" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Total Clases</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {loading ? <Loader className="animate-spin" size={32} /> :
                    courses.reduce((sum, c) => sum + (c._count?.classrooms || 0), 0)}
                </p>
              </div>
              <Video className="text-green-600 opacity-20" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Docentes</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {loading ? <Loader className="animate-spin" size={32} /> :
                    new Set(courses.map(c => c.teacher?.id)).size}
                </p>
              </div>
              <Clock className="text-purple-600 opacity-20" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Compañeros</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {loading ? <Loader className="animate-spin" size={32} /> :
                    courses.reduce((sum, c) => sum + ((c._count?.enrollments || 1) - 1), 0)}
                </p>
              </div>
              <PlayCircle className="text-orange-600 opacity-20" size={40} />
            </div>
          </div>
        </div>

        {/* Grid de Clases en Vivo y Mis Materias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Clases en Vivo Activas */}
          <div className={`rounded-lg shadow-lg p-6 ${
            liveCourses.length > 0
              ? 'bg-gradient-to-r from-red-50 to-pink-50/20/20 border-2 border-red-400'
              : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg ${liveCourses.length > 0 ? 'animate-pulse' : ''}`}>
                <Video className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  {liveCourses.length > 0 ? '🔴 ' : ''}Clases en Vivo
                </h3>
                <p className="text-xs text-gray-600">
                  {liveCourses.length > 0
                    ? `${liveCourses.length} ${liveCourses.length === 1 ? 'activa' : 'activas'}`
                    : 'Sin clases activas'
                  }
                </p>
              </div>
            </div>

            {liveCourses.length > 0 ? (
              <div className="space-y-3">
                {liveCourses.map((liveClass) => (
                  <div
                    key={liveClass.courseId}
                    onClick={() => navigate(`/alumno/curso/${liveClass.courseId}?tab=live`)}
                    className="p-4 bg-white rounded-lg border-2 border-red-500 cursor-pointer hover:shadow-xl transition-all animate-pulse"
                    style={{ borderLeft: `4px solid ${liveClass.courseColor || '#ef4444'}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold text-red-600 uppercase">
                        EN VIVO
                      </span>
                    </div>

                    <h4 className="font-bold text-gray-800 text-sm mb-1">
                      {liveClass.courseCode}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {liveClass.courseTitle}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <UserCircle size={12} />
                        <span className="truncate">{liveClass.teacherName}</span>
                      </div>
                      <button className="px-3 py-1 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded text-xs font-semibold hover:shadow-lg transition">
                        Unirse
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500 text-sm font-semibold mb-1">Sin clases en vivo</p>
                <p className="text-xs text-gray-400">Las clases activas aparecerán aquí</p>
              </div>
            )}
          </div>

          {/* Mis Materias */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                <BookOpen className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Mis Materias</h3>
                <p className="text-xs text-gray-600">
                  {courses.length} {courses.length === 1 ? 'materia activa' : 'materias activas'}
                </p>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader className="animate-spin text-cyan-600" size={32} />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto text-red-400 mb-3" size={40} />
                  <p className="text-red-600 text-sm font-semibold mb-2">Error al cargar</p>
                  <p className="text-xs text-gray-500">{error}</p>
                  <button
                    onClick={fetchMyCourses}
                    className="mt-3 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-sm font-semibold"
                  >
                    Reintentar
                  </button>
                </div>
              ) : courses.length > 0 ? (
                <div className="space-y-3">
                  {courses.map(course => (
                    <div
                      key={course.id}
                      onClick={() => navigate(`/alumno/curso/${course.id}`)}
                      className="p-3 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer bg-white hover:border-cyan-500"
                      style={{ borderLeft: `4px solid ${course.color || '#06b6d4'}` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm">{course.code}</h4>
                          <p className="text-xs text-gray-600 truncate">{course.title}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="truncate">{course.teacher?.name}</span>
                            <span>{course._count?.classrooms || 0} clases</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded font-semibold">
                            {course.credits || 3} cr
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-500 text-sm font-semibold mb-1">Sin materias inscritas</p>
                  <p className="text-xs text-gray-400">Espera a que el docente te inscriba</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid de Recursos y Próximas Clases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recursos Recientes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <FileText className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Recursos Recientes</h3>
                  <p className="text-xs text-gray-500">Últimos materiales</p>
                </div>
              </div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader className="animate-spin text-purple-600" size={32} />
                </div>
              ) : recentResources.length > 0 ? (
                <div className="space-y-2">
                  {recentResources.map(resource => {
                    // Determinar la pestaña correcta según el tipo de recurso
                    let tab = 'resources';
                    if (resource.type === 'VIDEO' || resource.type === 'ENLACE') {
                      tab = 'videos';
                    }

                    return (
                      <div
                        key={resource.id}
                        onClick={() => navigate(`/alumno/curso/${resource.courseId}?tab=${tab}`)}
                        className="p-3 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer bg-white hover:border-purple-500"
                        style={{ borderLeft: `4px solid ${resource.courseColor || '#9333ea'}` }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 bg-purple-50/30 rounded">
                            <FileText size={16} className="text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-sm">{resource.title}</h4>
                            <p className="text-xs text-gray-600">{resource.courseCode}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold">
                                {resource.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(resource.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-500 text-sm font-semibold mb-1">Sin recursos recientes</p>
                  <p className="text-xs text-gray-400">Los recursos aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>

          {/* Próximas Clases Programadas */}
          <div className={`rounded-lg shadow ${
            scheduledClasses.length > 0
              ? 'bg-gradient-to-r from-blue-50 to-cyan-50/20/20 border border-blue-200'
              : 'bg-white border border-gray-200'
          }`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                  <Calendar className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Próximas Clases</h3>
                  <p className="text-xs text-gray-500">
                    {scheduledClasses.length > 0
                      ? `${scheduledClasses.length} ${scheduledClasses.length === 1 ? 'programada' : 'programadas'}`
                      : 'Sin clases programadas'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {scheduledClasses.length > 0 ? (
                <div className="space-y-2">
                  {scheduledClasses.map((scheduledClass) => {
                    const classDate = new Date(scheduledClass.date);
                    const now = new Date();
                    const isToday = classDate.toDateString() === now.toDateString();
                    const isSoon = (classDate - now) / (1000 * 60) <= 30 && (classDate - now) > 0;

                    // Calcular disponibilidad para registro de asistencia
                    const EARLY_MINUTES = 15; // Puede registrar hasta 15 minutos antes
                    const MAX_LATE_MINUTES = 30; // Hasta 30 minutos después

                    const earlyTime = new Date(classDate.getTime() - EARLY_MINUTES * 60000);
                    const maxLateTime = new Date(classDate.getTime() + MAX_LATE_MINUTES * 60000);

                    const canRegisterAttendance = now >= earlyTime && now <= maxLateTime;
                    const classroomAttendance = attendanceStatus[scheduledClass.id] || {};

                    return (
                      <div
                        key={scheduledClass.id}
                        className={`p-3 bg-white rounded-lg border hover:shadow-lg transition-all ${
                          isSoon
                            ? 'border-green-500 animate-pulse'
                            : isToday
                            ? 'border-blue-500'
                            : 'border-gray-200'
                        }`}
                        style={{ borderLeft: `4px solid ${scheduledClass.courseColor || '#3b82f6'}` }}
                      >
                        <div
                          onClick={() => navigate(`/alumno/curso/${scheduledClass.courseId}?tab=live`)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-800 text-sm">
                                {scheduledClass.courseCode}
                              </h4>
                              <p className="text-xs text-gray-600 truncate">
                                {scheduledClass.courseName}
                              </p>
                            </div>
                            {isSoon && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                Pronto
                              </span>
                            )}
                            {isToday && !isSoon && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                Hoy
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>
                                {classDate.toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>
                                {classDate.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {scheduledClass.duration && ` (${scheduledClass.duration} min)`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botón de registrar asistencia */}
                        {canRegisterAttendance && (
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            {classroomAttendance.registered ? (
                              <div className="flex items-center justify-center gap-2 text-green-600 text-xs font-semibold">
                                <CheckCircle size={16} />
                                <span>
                                  Asistencia registrada ({classroomAttendance.status === 'PRESENT' ? 'A tiempo' : 'Tarde'})
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  registerAttendance(scheduledClass);
                                }}
                                disabled={classroomAttendance.loading}
                                className="w-full py-2 px-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {classroomAttendance.loading ? (
                                  <>
                                    <Loader className="animate-spin" size={14} />
                                    Registrando...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={14} />
                                    Registrar Asistencia
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-500 text-sm font-semibold mb-1">Sin clases programadas</p>
                  <p className="text-xs text-gray-400">Las próximas clases aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>
        </div>

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

      {/* Toast */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
}

export default AlumnoDashboard;
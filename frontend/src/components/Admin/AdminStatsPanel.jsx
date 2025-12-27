// frontend/src/components/Admin/AdminStatsPanel.jsx

import { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  BarChart3,
  TrendingUp,
  Loader,
  AlertCircle,
  Plus,
  Download
} from 'lucide-react';
import api from '../../services/api';

const AdminStatsPanel = ({ 
  onOpenCreateTeacher, 
  onOpenCreateCourse, 
  onDownloadReport 
}) => {
  const [stats, setStats] = useState({
    totalTeachers: 0,
    activeTeachers: 0,
    totalStudents: 0,
    totalCourses: 0,
    activeCourses: 0,
    totalEnrollments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Obtener docentes
      const teachersRes = await api.get('/auth/users/teachers');
      const teachers = teachersRes.data.teachers || [];
      const activeTeachers = teachers.filter(t => t.isActive).length;

      // Obtener cursos
      const coursesRes = await api.get('/courses');
      const courses = coursesRes.data.courses || [];
      const activeCourses = courses.filter(c => c.isActive).length;

      // Calcular inscripciones
      let totalEnrollments = 0;
      courses.forEach(course => {
        totalEnrollments += course._count?.enrollments || 0;
      });

      setStats({
        totalTeachers: teachers.length,
        activeTeachers,
        totalStudents: totalEnrollments,
        totalCourses: courses.length,
        activeCourses,
        totalEnrollments
      });
      setError('');
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Docentes Activos',
      value: stats.activeTeachers,
      total: stats.totalTeachers,
      icon: Users,
      color: 'blue',
      bg: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Materias Activas',
      value: stats.activeCourses,
      total: stats.totalCourses,
      icon: BookOpen,
      color: 'purple',
      bg: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Total Inscripciones',
      value: stats.totalEnrollments,
      total: null,
      icon: TrendingUp,
      color: 'green',
      bg: 'from-green-500 to-green-600'
    },
    {
      title: 'Tasa de Ocupación',
      value: stats.totalCourses > 0 
        ? Math.round((stats.totalEnrollments / (stats.totalCourses * 30)) * 100)
        : 0,
      unit: '%',
      total: null,
      icon: BarChart3,
      color: 'orange',
      bg: 'from-orange-500 to-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
          <BarChart3 className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Estadísticas Generales</h2>
          <p className="text-sm text-gray-500">Resumen de la plataforma</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50/20 border border-red-200 rounded-lg p-4 flex gap-2 items-start">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${card.bg} rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition transform hover:scale-105`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white text-opacity-90 text-sm font-semibold mb-1">
                    {card.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{card.value}</span>
                    {card.unit && <span className="text-2xl">{card.unit}</span>}
                  </div>
                  {card.total !== null && (
                    <p className="text-white text-opacity-75 text-xs mt-1">
                      de {card.total} total
                    </p>
                  )}
                </div>
                <Icon size={32} className="text-white text-opacity-30" />
              </div>
              
              {/* Progress Bar */}
              {card.total !== null && (
                <div className="w-full bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all"
                    style={{
                      width: `${card.total > 0 ? (card.value / card.total) * 100 : 0}%`
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Docentes */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Docentes</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Totales</span>
              <span className="text-2xl font-bold text-blue-600">{stats.totalTeachers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Activos</span>
              <span className="text-2xl font-bold text-green-600">{stats.activeTeachers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Inactivos</span>
              <span className="text-2xl font-bold text-red-600">
                {stats.totalTeachers - stats.activeTeachers}
              </span>
            </div>
          </div>
        </div>

        {/* Materias */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Materias</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Totales</span>
              <span className="text-2xl font-bold text-purple-600">{stats.totalCourses}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Activas</span>
              <span className="text-2xl font-bold text-green-600">{stats.activeCourses}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Inactivas</span>
              <span className="text-2xl font-bold text-red-600">
                {stats.totalCourses - stats.activeCourses}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={onOpenCreateTeacher}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600:bg-blue-700 transition-all font-semibold shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            Nuevo Docente
          </button>
          <button
            onClick={onOpenCreateCourse}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600:bg-purple-700 transition-all font-semibold shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            Nueva Materia
          </button>
          <button
            onClick={onDownloadReport}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600:bg-orange-700 transition-all font-semibold shadow-md hover:shadow-lg"
          >
            <Download size={20} />
            Descargar Reporte
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsPanel;
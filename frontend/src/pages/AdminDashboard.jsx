// frontend/src/pages/AdminDashboard.jsx

import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  GraduationCap
} from 'lucide-react';
import { useStore } from '../store/store';
import AdminTeachersPanel from '../components/Admin/AdminTeachersPanel';
import AdminCoursesPanel from '../components/Admin/AdminCoursesPanel';
import AdminStatsPanel from '../components/Admin/AdminStatsPanel';
import AdminStudentsPanel from '../components/Admin/AdminStudentsPanel';
import UserMenu from '../components/UserMenu';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import HelpModal from '../components/HelpModal';
import api from '../services/api';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('stats');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  // Referencias para controlar los modales de otros paneles
  const teachersPanelRef = useRef(null);
  const coursesPanelRef = useRef(null);
  const studentsPanelRef = useRef(null);

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

  const handleOpenCreateStudent = () => {
    setActiveTab('students');
    setTimeout(() => {
      if (studentsPanelRef.current?.openCreateModal) {
        studentsPanelRef.current.openCreateModal();
      }
    }, 100);
  };

  const handleOpenImportStudents = () => {
    setActiveTab('students');
    setTimeout(() => {
      if (studentsPanelRef.current?.openImportModal) {
        studentsPanelRef.current.openImportModal();
      }
    }, 100);
  };

  const handleDownloadReport = async () => {
    try {
      // Obtener datos
      const teachersRes = await api.get('/auth/users/teachers');
      const coursesRes = await api.get('/courses');

      const teachers = teachersRes.data.teachers || [];
      const courses = coursesRes.data.courses || [];

      // Obtener estudiantes de cada curso
      const coursesWithStudents = await Promise.all(
        courses.map(async (course) => {
          try {
            const studentsRes = await api.get(`/courses/${course.id}/students`);
            return {
              ...course,
              students: studentsRes.data.students || []
            };
          } catch (err) {
            return {
              ...course,
              students: []
            };
          }
        })
      );

      // Calcular estadísticas
      const activeTeachers = teachers.filter(t => t.isActive).length;
      const activeCourses = courses.filter(c => c.isActive).length;
      const totalEnrollments = courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);

      // Crear libro de Excel
      const workbook = XLSX.utils.book_new();

      // === HOJA 1: Resumen General ===
      const resumenData = [
        ['REPORTE DE ESTADÍSTICAS'],
        ['PLATAFORMA DE AULAS VIRTUALES'],
        [''],
        ['Fecha de Generación:', new Date().toLocaleString()],
        [''],
        ['RESUMEN GENERAL'],
        ['Concepto', 'Cantidad'],
        ['Total Docentes', teachers.length],
        ['Docentes Activos', activeTeachers],
        ['Docentes Inactivos', teachers.length - activeTeachers],
        [''],
        ['Total Materias', courses.length],
        ['Materias Activas', activeCourses],
        ['Materias Inactivas', courses.length - activeCourses],
        [''],
        ['Total Inscripciones', totalEnrollments],
        ['Promedio de Estudiantes por Materia', courses.length > 0 ? Math.round(totalEnrollments / courses.length) : 0]
      ];

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = [{ wch: 35 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen General');

      // === HOJA 2: Docentes ===
      const docentesData = [
        ['LISTADO DE DOCENTES'],
        [''],
        ['Nombre', 'Email', 'Usuario', 'Estado', 'Materias Asignadas'],
        ...teachers.map(t => [
          t.name,
          t.email,
          t.username || '-',
          t.isActive ? 'Activo' : 'Inactivo',
          t._count?.teachingCourses || 0
        ])
      ];

      const wsDocentes = XLSX.utils.aoa_to_sheet(docentesData);
      wsDocentes['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, wsDocentes, 'Docentes');

      // === HOJA 3: Materias ===
      const materiasData = [
        ['LISTADO DE MATERIAS'],
        [''],
        ['Código', 'Título', 'Descripción', 'Docente', 'Estado', 'Estudiantes', 'Clases'],
        ...coursesWithStudents.map(c => {
          const teacher = teachers.find(t => t.id === c.teacherId);
          return [
            c.code,
            c.title,
            c.description || '-',
            teacher ? teacher.name : 'Sin asignar',
            c.isActive ? 'Activa' : 'Inactiva',
            c._count?.enrollments || 0,
            c._count?.classrooms || 0
          ];
        })
      ];

      const wsMaterias = XLSX.utils.aoa_to_sheet(materiasData);
      wsMaterias['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 40 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(workbook, wsMaterias, 'Materias');

      // === HOJAS 4+: Una hoja por cada materia con sus estudiantes ===
      coursesWithStudents.forEach((course, index) => {
        if (course.students && course.students.length > 0) {
          const teacher = teachers.find(t => t.id === course.teacherId);

          const courseStudentsData = [
            [`MATERIA: ${course.title}`],
            [`Código: ${course.code}`],
            [`Docente: ${teacher ? teacher.name : 'Sin asignar'}`],
            [`Total Estudiantes: ${course.students.length}`],
            [''],
            ['Nombre', 'Email', 'Usuario', 'Estado'],
            ...course.students.map(s => [
              s.name,
              s.email,
              s.username || '-',
              s.isActive ? 'Activo' : 'Inactivo'
            ])
          ];

          const wsCourseStudents = XLSX.utils.aoa_to_sheet(courseStudentsData);
          wsCourseStudents['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 12 }];

          // Limitar nombre de hoja a 31 caracteres (límite de Excel)
          let sheetName = `${course.code}`.substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, wsCourseStudents, sheetName);
        }
      });

      // === HOJA FINAL: Detalle por Docente ===
      const docentesMaterias = teachers.map(teacher => {
        const materias = coursesWithStudents.filter(c => c.teacherId === teacher.id);
        const totalEstudiantes = materias.reduce((sum, c) => sum + (c.students?.length || 0), 0);

        return {
          docente: teacher.name,
          email: teacher.email,
          estado: teacher.isActive ? 'Activo' : 'Inactivo',
          materias: materias.length,
          estudiantes: totalEstudiantes,
          materiasList: materias.map(m => m.title).join(', ') || 'Ninguna'
        };
      });

      const docentesDetalleData = [
        ['DETALLE POR DOCENTE'],
        [''],
        ['Docente', 'Email', 'Estado', 'Materias', 'Total Estudiantes', 'Materias Asignadas'],
        ...docentesMaterias.map(d => [
          d.docente,
          d.email,
          d.estado,
          d.materias,
          d.estudiantes,
          d.materiasList
        ])
      ];

      const wsDocentesDetalle = XLSX.utils.aoa_to_sheet(docentesDetalleData);
      wsDocentesDetalle['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, wsDocentesDetalle, 'Detalle por Docente');

      // Generar y descargar archivo
      const fileName = `Reporte_Completo_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar el reporte. Por favor, intenta nuevamente.');
    }
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
      id: 'students',
      label: 'Estudiantes',
      icon: GraduationCap,
      color: 'text-orange-600'
    },
    {
      id: 'courses',
      label: 'Materias',
      icon: BookOpen,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
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
      <div className="bg-white border-b border-gray-200 sticky top-[72px] z-30 shadow-sm">
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
                      : 'border-b-transparent text-gray-600 hover:text-gray-800:text-gray-100'
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

        {activeTab === 'students' && (
          <AdminStudentsPanel ref={studentsPanelRef} />
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
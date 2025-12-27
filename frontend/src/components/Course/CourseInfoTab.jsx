// frontend/src/components/Course/CourseInfoTab.jsx

import { Info, BookOpen, User, Calendar, Clock, Hash } from 'lucide-react';

const CourseInfoTab = ({ course }) => {
  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Info size={24} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Información del Curso</h2>
            <p className="text-sm text-gray-500">Detalles generales de la materia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Código */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Hash size={20} className="text-gray-600" />
              <p className="text-sm font-semibold text-gray-600">Código</p>
            </div>
            <p className="text-xl font-bold text-gray-800">{course.code}</p>
          </div>

          {/* Título */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={20} className="text-gray-600" />
              <p className="text-sm font-semibold text-gray-600">Título</p>
            </div>
            <p className="text-xl font-bold text-gray-800">{course.title}</p>
          </div>

          {/* Créditos */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-gray-600" />
              <p className="text-sm font-semibold text-gray-600">Créditos</p>
            </div>
            <p className="text-xl font-bold text-gray-800">{course.credits}</p>
          </div>

          {/* Docente */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <User size={20} className="text-gray-600" />
              <p className="text-sm font-semibold text-gray-600">Docente</p>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {course.teacher?.name || 'Sin asignar'}
            </p>
          </div>
        </div>

        {/* Descripción */}
        {course.description && (
          <div className="mt-6 p-4 bg-blue-50/20 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">Descripción</p>
            <p className="text-gray-700">{course.description}</p>
          </div>
        )}

        {/* Color */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-600 mb-3">Color de Identificación</p>
          <div className="flex items-center gap-3">
            <div 
              className="w-16 h-16 rounded-lg shadow-md"
              style={{ backgroundColor: course.color }}
            />
            <div>
              <p className="font-mono text-gray-800">{course.color}</p>
              <p className="text-xs text-gray-500">Usado en tarjetas y headers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <p className="text-sm font-semibold text-gray-600 mb-1">Estudiantes Inscritos</p>
          <p className="text-3xl font-bold text-indigo-600">
            {course._count?.enrollments || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <p className="text-sm font-semibold text-gray-600 mb-1">Clases Creadas</p>
          <p className="text-3xl font-bold text-purple-600">
            {course._count?.classrooms || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-600">
          <p className="text-sm font-semibold text-gray-600 mb-1">Estado</p>
          <p className={`text-xl font-bold ${
            course.isActive ? 'text-green-600' : 'text-gray-600'
          }`}>
            {course.isActive ? 'Activa' : 'Inactiva'}
          </p>
        </div>
      </div>

      {/* Fechas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Fechas Importantes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Fecha de Creación</p>
            <p className="font-semibold text-gray-800">
              {new Date(course.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Última Actualización</p>
            <p className="font-semibold text-gray-800">
              {new Date(course.updatedAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseInfoTab;
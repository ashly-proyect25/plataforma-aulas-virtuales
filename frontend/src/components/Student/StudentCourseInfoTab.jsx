// frontend/src/components/Student/StudentCourseInfoTab.jsx

import { Info, BookOpen, User, Calendar, Clock, Hash } from 'lucide-react';

const StudentCourseInfoTab = ({ course }) => {
  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
            <Info size={24} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Información del Curso</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Detalles generales de la materia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Código */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Hash size={20} className="text-gray-600 dark:text-gray-300" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Código</p>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{course.code}</p>
          </div>

          {/* Título */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={20} className="text-gray-600 dark:text-gray-300" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Título</p>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{course.title}</p>
          </div>

          {/* Créditos */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-gray-600 dark:text-gray-300" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Créditos</p>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{course.credits}</p>
          </div>

          {/* Docente */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <User size={20} className="text-gray-600 dark:text-gray-300" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Docente</p>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {course.teacher?.name || 'Sin asignar'}
            </p>
            {course.teacher?.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {course.teacher.email}
              </p>
            )}
          </div>
        </div>

        {/* Descripción */}
        {course.description && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 rounded-lg shadow-md">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Descripción</p>
            <p className="text-gray-700 dark:text-gray-300">{course.description}</p>
          </div>
        )}

        {/* Color */}
        <div className="mt-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Color de Identificación</p>
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-lg shadow-md"
              style={{ backgroundColor: course.color }}
            />
            <div>
              <p className="font-mono text-gray-800 dark:text-gray-200">{course.color}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Usado en tarjetas y headers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-cyan-600">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Compañeros de Clase</p>
          <p className="text-3xl font-bold text-cyan-600">
            {(course._count?.enrollments || 1) - 1}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-purple-600">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Clases Disponibles</p>
          <p className="text-3xl font-bold text-purple-600">
            {course._count?.classrooms || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentCourseInfoTab;

// frontend/src/components/Student/StudentClassmatesTab.jsx

import { useState, useEffect } from 'react';
import { Users, Mail, UserCircle, Loader, Search, X } from 'lucide-react';
import api from '../../services/api';
import Toast from '../Toast';

const StudentClassmatesTab = ({ course }) => {
  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    if (course?.id) {
      fetchClassmates();
    }
  }, [course]);

  const fetchClassmates = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/students`);
      setClassmates(response.data.students || []);
    } catch (err) {
      console.error('Error al cargar compañeros:', err);
      showToastMessage('Error al cargar la lista de compañeros', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const filteredClassmates = classmates.filter(classmate =>
    classmate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classmate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classmate.workGroup?.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="animate-spin text-cyan-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-md">
              <Users size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Compañeros de Clase</h2>
              <p className="text-sm text-gray-500">
                {classmates.length} {classmates.length === 1 ? 'estudiante inscrito' : 'estudiantes inscritos'}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o grupo..."
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600:text-gray-300"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Classmates Grid */}
      {filteredClassmates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassmates.map((classmate, index) => (
            <div
              key={classmate.id || index}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 border border-gray-200"
            >
              {/* Avatar and Name */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-3 shadow-md">
                  {classmate.avatar ? (
                    <img
                      src={classmate.avatar}
                      alt={classmate.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle size={48} className="text-white" />
                  )}
                </div>
                <h3 className="font-bold text-gray-800 text-center text-lg">
                  {classmate.name}
                </h3>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/50 p-3 rounded-lg">
                  <Mail size={16} className="text-cyan-600 flex-shrink-0" />
                  <span className="truncate">{classmate.email}</span>
                </div>
              </div>

              {/* Work Group */}
              <div className="mt-3 text-center">
                {classmate.workGroup ? (
                  <span className="px-3 py-1 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 rounded-full text-xs font-semibold">
                    {classmate.workGroup.groupName}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                    Sin grupo asignado
                  </span>
                )}
              </div>

              {/* Optional: Student number or ID */}
              {classmate.studentCode && (
                <div className="mt-2 text-center">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    {classmate.studentCode}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <Users className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {searchTerm ? 'No se encontraron compañeros' : 'No hay compañeros inscritos'}
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Intenta con otro término de búsqueda'
              : 'Aún no hay otros estudiantes inscritos en esta materia'}
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50/20 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">Información</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Aquí puedes ver todos tus compañeros de clase</li>
          <li>• Usa la barra de búsqueda para encontrar a alguien específico</li>
          <li>• Esta información es compartida dentro del curso</li>
        </ul>
      </div>

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default StudentClassmatesTab;

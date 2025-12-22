// frontend/src/components/Course/ClassRecordsModal.jsx

import { useState, useMemo } from 'react';
import { X, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter } from 'lucide-react';

const ClassRecordsModal = ({ isOpen, onClose, scheduledClasses }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'live', 'completed', 'missed', 'scheduled'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'status', 'title'

  // Función para obtener el estado de una clase
  const getClassStatus = (scheduledClass) => {
    if (scheduledClass.isLive || scheduledClass.status === 'live') {
      return { label: 'En vivo', value: 'live', color: 'green', icon: CheckCircle };
    }

    if (scheduledClass.wasStarted) {
      return { label: 'Finalizada', value: 'completed', color: 'blue', icon: CheckCircle };
    }

    const now = new Date();
    const classDate = new Date(scheduledClass.date);
    const [hours, minutes] = scheduledClass.time.split(':').map(Number);
    classDate.setHours(hours, minutes, 0, 0);

    // Si pasó más de 30 minutos después de la hora programada y no se inició
    if (now - classDate > 30 * 60 * 1000) {
      return { label: 'No iniciada', value: 'missed', color: 'red', icon: XCircle };
    }

    return { label: 'Programada', value: 'scheduled', color: 'yellow', icon: Clock };
  };

  // Filtrar y ordenar clases
  const filteredAndSortedClasses = useMemo(() => {
    let filtered = scheduledClasses.filter((scheduledClass) => {
      // Filtrar por búsqueda
      const matchesSearch = scheduledClass.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (scheduledClass.description && scheduledClass.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtrar por estado
      const status = getClassStatus(scheduledClass);
      const matchesFilter = filterStatus === 'all' || status.value === filterStatus;

      return matchesSearch && matchesFilter;
    });

    // Ordenar
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const [hoursA, minutesA] = a.time.split(':').map(Number);
        const [hoursB, minutesB] = b.time.split(':').map(Number);
        dateA.setHours(hoursA, minutesA);
        dateB.setHours(hoursB, minutesB);
        return dateB - dateA; // Más reciente primero
      } else if (sortBy === 'status') {
        const statusA = getClassStatus(a);
        const statusB = getClassStatus(b);
        return statusA.value.localeCompare(statusB.value);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return filtered;
  }, [scheduledClasses, searchTerm, filterStatus, sortBy]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = scheduledClasses.length;
    const live = scheduledClasses.filter(c => c.isLive || c.status === 'live').length;
    const completed = scheduledClasses.filter(c => c.wasStarted).length;
    const missed = scheduledClasses.filter(c => {
      const now = new Date();
      const classDate = new Date(c.date);
      const [hours, minutes] = c.time.split(':').map(Number);
      classDate.setHours(hours, minutes);
      return now - classDate > 30 * 60 * 1000 && !c.wasStarted && !c.isLive;
    }).length;
    const scheduled = total - live - completed - missed;

    return { total, live, completed, missed, scheduled };
  }, [scheduledClasses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Registro de Clases</h2>
            <p className="text-indigo-100 text-sm">Historial completo de clases programadas</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-green-200 dark:border-green-700">
            <p className="text-2xl font-bold text-green-600">{stats.live}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">En vivo</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-blue-200 dark:border-blue-700">
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Finalizadas</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-red-200 dark:border-red-700">
            <p className="text-2xl font-bold text-red-600">{stats.missed}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">No iniciadas</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-yellow-200 dark:border-yellow-700">
            <p className="text-2xl font-bold text-yellow-600">{stats.scheduled}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Programadas</p>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Estado:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Todas</option>
                <option value="live">En vivo</option>
                <option value="completed">Finalizadas</option>
                <option value="missed">No iniciadas</option>
                <option value="scheduled">Programadas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="date">Fecha</option>
                <option value="status">Estado</option>
                <option value="title">Título</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de clases */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAndSortedClasses.length > 0 ? (
            <div className="space-y-3">
              {filteredAndSortedClasses.map((scheduledClass) => {
                const status = getClassStatus(scheduledClass);
                const StatusIcon = status.icon;

                return (
                  <div
                    key={scheduledClass.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                            {scheduledClass.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                              status.color === 'green'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : status.color === 'blue'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : status.color === 'yellow'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}
                          >
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </div>

                        {scheduledClass.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                            {scheduledClass.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Calendar size={16} className="text-purple-600" />
                            <span>
                              {new Date(scheduledClass.date).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Clock size={16} className="text-purple-600" />
                            <span>{scheduledClass.time} ({scheduledClass.duration} min)</span>
                          </div>
                        </div>

                        {scheduledClass.roomCode && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Código de sala: <span className="font-mono font-semibold">{scheduledClass.roomCode}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <AlertCircle size={48} className="mb-4" />
              <p className="text-lg font-semibold">No se encontraron clases</p>
              <p className="text-sm">Intenta cambiar los filtros o la búsqueda</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {filteredAndSortedClasses.length} de {scheduledClasses.length} clases
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassRecordsModal;

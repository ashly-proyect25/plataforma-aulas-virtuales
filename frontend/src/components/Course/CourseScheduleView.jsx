// frontend/src/components/Course/CourseScheduleView.jsx

import { useState, useEffect } from 'react';
import { Calendar, Clock, Loader } from 'lucide-react';
import api from '../../services/api';

const CourseScheduleView = ({ course }) => {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);

  const daysOfWeek = [
    { value: 'MONDAY', label: 'Lunes', short: 'L' },
    { value: 'TUESDAY', label: 'Martes', short: 'M' },
    { value: 'WEDNESDAY', label: 'Miércoles', short: 'X' },
    { value: 'THURSDAY', label: 'Jueves', short: 'J' },
    { value: 'FRIDAY', label: 'Viernes', short: 'V' },
    { value: 'SATURDAY', label: 'Sábado', short: 'S' },
    { value: 'SUNDAY', label: 'Domingo', short: 'D' }
  ];

  // ✅ Generar solo las horas que tienen clases programadas
  const getRelevantTimeSlots = () => {
    if (!scheduleData?.schedules || scheduleData.schedules.length === 0) {
      return [];
    }

    const hoursSet = new Set();
    scheduleData.schedules.forEach(schedule => {
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const endHour = parseInt(schedule.endTime.split(':')[0]);

      // Agregar todas las horas desde inicio hasta fin de la clase
      for (let hour = startHour; hour <= endHour; hour++) {
        hoursSet.add(hour);
      }
    });

    // Convertir a array y ordenar
    const sortedHours = Array.from(hoursSet).sort((a, b) => a - b);

    // Convertir a formato "HH:00"
    return sortedHours.map(hour => `${hour.toString().padStart(2, '0')}:00`);
  };

  useEffect(() => {
    if (course) {
      fetchSchedule();
    }
  }, [course]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/schedule`);
      setScheduleData(response.data.data);
    } catch (err) {
      console.error('Error al cargar horario:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleGrid = () => {
    if (!scheduleData?.schedules) return {};

    const grid = {};
    daysOfWeek.forEach(day => {
      grid[day.value] = [];
    });

    scheduleData.schedules.forEach(schedule => {
      if (!grid[schedule.dayOfWeek]) {
        grid[schedule.dayOfWeek] = [];
      }
      grid[schedule.dayOfWeek].push(schedule);
    });

    return grid;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-8">
          <Loader className="animate-spin text-indigo-600" size={32} />
        </div>
      </div>
    );
  }

  if (!scheduleData?.schedules || scheduleData.schedules.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-100/30 rounded-lg">
            <Calendar size={24} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Horario del Curso</h3>
            <p className="text-sm text-gray-500">Información de horarios y fechas</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No hay horario configurado para este curso</p>
          <p className="text-sm text-gray-400 mt-2">
            El administrador debe configurar el horario
          </p>
        </div>
      </div>
    );
  }

  const scheduleGrid = getScheduleGrid();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100/30 rounded-lg">
          <Calendar size={24} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Horario del Curso</h3>
          <p className="text-sm text-gray-500">Información de horarios y fechas</p>
        </div>
      </div>

      {/* Course Duration Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50/20/20 rounded-lg p-4 border border-blue-200">
          <p className="text-sm font-semibold text-gray-700 mb-1">Fecha de Inicio</p>
          <p className="text-lg font-bold text-blue-600">
            {formatDate(scheduleData.startDate)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50/20/20 rounded-lg p-4 border border-purple-200">
          <p className="text-sm font-semibold text-gray-700 mb-1">Fecha de Fin</p>
          <p className="text-lg font-bold text-purple-600">
            {formatDate(scheduleData.endDate)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50/20/20 rounded-lg p-4 border border-green-200">
          <p className="text-sm font-semibold text-gray-700 mb-1">Duración</p>
          <p className="text-lg font-bold text-green-600">
            {scheduleData.durationWeeks ? `${scheduleData.durationWeeks} semanas` : '-'}
          </p>
        </div>
      </div>

      {/* Visual Schedule Grid */}
      <div className="bg-gray-50/50 rounded-lg p-4">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={20} />
          Horario Semanal
        </h4>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header Days */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="text-xs font-semibold text-gray-600">Hora</div>
              {daysOfWeek.map(day => (
                <div key={day.value} className="text-center">
                  <div className="text-xs font-semibold text-gray-800">{day.label}</div>
                  <div className="text-xs text-gray-500">({day.short})</div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {getRelevantTimeSlots().map((time) => {
                const hour = parseInt(time.split(':')[0]);

                return (
                  <div key={time} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                    <div className="bg-gray-100 p-2 text-xs font-semibold text-gray-600 flex items-center justify-center">
                      {time}
                    </div>
                    {daysOfWeek.map(day => {
                      const daySchedules = scheduleGrid[day.value] || [];
                      const classesInHour = daySchedules.filter(s => {
                        const scheduleStartHour = parseInt(s.startTime.split(':')[0]);
                        const scheduleEndHour = parseInt(s.endTime.split(':')[0]);
                        return hour >= scheduleStartHour && hour < scheduleEndHour;
                      });

                      const hasClass = classesInHour.length > 0;

                      return (
                        <div
                          key={day.value}
                          className={`p-2 text-xs flex flex-col items-center justify-center min-h-[50px] ${
                            hasClass
                              ? 'bg-indigo-100/30 border-l-4 border-indigo-600'
                              : 'bg-white'
                          }`}
                        >
                          {hasClass && classesInHour.map((schedule, idx) => (
                            <div key={idx} className="text-center">
                              <span className="text-indigo-700 font-semibold block">
                                {course.code}
                              </span>
                              <span className="text-indigo-600 text-xs">
                                {schedule.startTime}-{schedule.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Details List */}
      <div className="mt-6">
        <h4 className="font-bold text-gray-800 mb-3">Horarios Detallados</h4>
        <div className="space-y-2">
          {scheduleData.schedules.map((schedule, index) => {
            const day = daysOfWeek.find(d => d.value === schedule.dayOfWeek);
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100/30 rounded-lg flex items-center justify-center">
                    <span className="text-indigo-600 font-bold text-sm">{day?.short}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{day?.label}</p>
                    <p className="text-sm text-gray-600">
                      {schedule.startTime} - {schedule.endTime}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-green-100/30 text-green-700 rounded-full text-xs font-semibold">
                    Activo
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CourseScheduleView;

// frontend/src/components/Course/CourseScheduleModal.jsx

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Plus, Trash2, Save, Loader, Zap } from 'lucide-react';
import api from '../../services/api';
import Toast from '../Toast';

const CourseScheduleModal = ({ isOpen, onClose, course, onSuccess }) => {
  const [schedules, setSchedules] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const daysOfWeek = [
    { value: 'MONDAY', label: 'Lunes', short: 'L' },
    { value: 'TUESDAY', label: 'Martes', short: 'M' },
    { value: 'WEDNESDAY', label: 'Miércoles', short: 'X' },
    { value: 'THURSDAY', label: 'Jueves', short: 'J' },
    { value: 'FRIDAY', label: 'Viernes', short: 'V' },
    { value: 'SATURDAY', label: 'Sábado', short: 'S' },
    { value: 'SUNDAY', label: 'Domingo', short: 'D' }
  ];

  const timeSlots = [];
  for (let hour = 7; hour <= 21; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 21) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  useEffect(() => {
    if (isOpen && course) {
      fetchSchedule();
    }
  }, [isOpen, course]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/schedule`);
      const data = response.data.data;

      setSchedules(data.schedules || []);
      setStartDate(data.startDate ? data.startDate.split('T')[0] : '');
      setEndDate(data.endDate ? data.endDate.split('T')[0] : '');
      setDurationWeeks(data.durationWeeks || '');
    } catch (err) {
      console.error('Error al cargar horario:', err);
      showToastMessage('Error al cargar horario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addScheduleSlot = () => {
    setSchedules([...schedules, {
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      endTime: '10:00'
    }]);
  };

  const removeScheduleSlot = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateScheduleSlot = (index, field, value) => {
    const updated = [...schedules];
    updated[index][field] = value;
    setSchedules(updated);
  };

  const handleSave = async () => {
    if (!startDate) {
      showToastMessage('Debe seleccionar una fecha de inicio', 'error');
      return;
    }

    if (!endDate && !durationWeeks) {
      showToastMessage('Debe seleccionar una fecha de fin o duración en semanas', 'error');
      return;
    }

    if (schedules.length === 0) {
      showToastMessage('Debe agregar al menos un horario de clase', 'error');
      return;
    }

    try {
      setSaving(true);
      await api.post(`/courses/${course.id}/schedule`, {
        schedules,
        startDate,
        endDate: endDate || null,
        durationWeeks: durationWeeks ? parseInt(durationWeeks) : null
      });

      showToastMessage('Horario guardado exitosamente', 'success');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error al guardar horario:', err);
      showToastMessage('Error al guardar horario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateClasses = async () => {
    if (!startDate || schedules.length === 0) {
      showToastMessage('Primero debe configurar y guardar el horario', 'error');
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post(`/courses/${course.id}/generate-classes`);
      showToastMessage(response.data.message, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error al generar clases:', err);
      showToastMessage(err.response?.data?.message || 'Error al generar clases', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const getScheduleGrid = () => {
    const grid = {};
    daysOfWeek.forEach(day => {
      grid[day.value] = [];
    });

    schedules.forEach(schedule => {
      if (!grid[schedule.dayOfWeek]) {
        grid[schedule.dayOfWeek] = [];
      }
      grid[schedule.dayOfWeek].push(schedule);
    });

    return grid;
  };

  if (!isOpen) return null;

  const scheduleGrid = getScheduleGrid();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar size={28} />
              <div>
                <h2 className="text-2xl font-bold">Configurar Horario</h2>
                <p className="text-indigo-100">{course?.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Dates Configuration */}
                <div className="bg-gray-50/50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    Configuración de Fechas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha de Inicio *
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha de Fin
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Duración (Semanas)
                      </label>
                      <input
                        type="number"
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(e.target.value)}
                        min="1"
                        max="52"
                        placeholder="16"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Puede especificar fecha de fin O duración en semanas
                  </p>
                </div>

                {/* Visual Schedule Grid */}
                <div className="bg-gray-50/50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Horario Semanal
                  </h3>

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

                      {/* Time Grid - Simplified Visual */}
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        {timeSlots.filter((_, i) => i % 2 === 0).map((time) => (
                          <div key={time} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                            <div className="bg-gray-100 p-2 text-xs font-semibold text-gray-600 flex items-center justify-center">
                              {time}
                            </div>
                            {daysOfWeek.map(day => {
                              const daySchedules = scheduleGrid[day.value] || [];
                              const hasClass = daySchedules.some(s => {
                                const scheduleHour = parseInt(s.startTime.split(':')[0]);
                                const currentHour = parseInt(time.split(':')[0]);
                                return scheduleHour === currentHour;
                              });

                              return (
                                <div
                                  key={day.value}
                                  className={`p-2 text-xs flex items-center justify-center min-h-[40px] ${
                                    hasClass
                                      ? 'bg-indigo-100/30 border-l-2 border-indigo-600'
                                      : 'bg-white'
                                  }`}
                                >
                                  {hasClass && (
                                    <span className="text-indigo-700 font-semibold">Clase</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Slots Configuration */}
                <div className="bg-gray-50/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Clock size={20} />
                      Horarios de Clase
                    </h3>
                    <button
                      onClick={addScheduleSlot}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-semibold"
                    >
                      <Plus size={16} />
                      Agregar Horario
                    </button>
                  </div>

                  <div className="space-y-3">
                    {schedules.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No hay horarios configurados. Haz clic en "Agregar Horario" para comenzar.
                      </p>
                    ) : (
                      schedules.map((schedule, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Día
                              </label>
                              <select
                                value={schedule.dayOfWeek}
                                onChange={(e) => updateScheduleSlot(index, 'dayOfWeek', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 text-sm"
                              >
                                {daysOfWeek.map(day => (
                                  <option key={day.value} value={day.value}>{day.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Hora Inicio
                              </label>
                              <select
                                value={schedule.startTime}
                                onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 text-sm"
                              >
                                {timeSlots.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Hora Fin
                              </label>
                              <select
                                value={schedule.endTime}
                                onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 text-sm"
                              >
                                {timeSlots.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => removeScheduleSlot(index)}
                                className="w-full px-3 py-2 bg-red-100/30 text-red-700 rounded-lg hover:bg-red-200:bg-red-900/50 transition flex items-center justify-center gap-2 text-sm font-semibold"
                              >
                                <Trash2 size={16} />
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 flex items-center justify-between gap-3 border-t border-gray-200">
            <button
              onClick={handleGenerateClasses}
              disabled={generating || !startDate || schedules.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Generando...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Generar Clases Auto
                </>
              )}
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200:bg-gray-600 rounded-lg transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Horario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};

export default CourseScheduleModal;

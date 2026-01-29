// frontend/src/components/Course/ScheduledClassesCarousel.jsx

import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, Clock, Play, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const ScheduledClassesCarousel = ({ scheduledClasses, onStartClass, onDeleteClass, loading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Función auxiliar para crear fecha correctamente en zona horaria local
  const parseClassDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  // Función para formatear fecha en español
  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Ordenar clases por proximidad (más cercana a la hora actual primero)
  const sortedClasses = useMemo(() => {
    if (!scheduledClasses || scheduledClasses.length === 0) return [];

    const now = new Date();
    return [...scheduledClasses].sort((a, b) => {
      const dateA = parseClassDateTime(a.date, a.time);
      const dateB = parseClassDateTime(b.date, b.time);

      // Ordenar por diferencia absoluta con la hora actual (más cercana primero)
      const diffA = Math.abs(dateA - now);
      const diffB = Math.abs(dateB - now);

      return diffA - diffB;
    });
  }, [scheduledClasses]);

  // Función para validar si una clase puede iniciarse (30 min antes o después)
  const canStartClass = (scheduledClass) => {
    const now = new Date();
    const classDate = parseClassDateTime(scheduledClass.date, scheduledClass.time);

    const diffInMinutes = (classDate - now) / (1000 * 60);

    // Permitir iniciar 30 minutos antes o después
    return diffInMinutes >= -30 && diffInMinutes <= 30;
  };

  // Función para obtener el estado de la clase
  const getClassStatus = (scheduledClass) => {
    if (scheduledClass.isLive || scheduledClass.status === 'live') {
      return { label: 'En vivo', color: 'green', icon: CheckCircle };
    }

    if (scheduledClass.wasStarted) {
      return { label: 'Finalizada', color: 'gray', icon: CheckCircle };
    }

    const now = new Date();
    const classDate = parseClassDateTime(scheduledClass.date, scheduledClass.time);

    if (now > classDate) {
      return { label: 'No iniciada', color: 'red', icon: XCircle };
    }

    if (canStartClass(scheduledClass)) {
      return { label: 'Lista para iniciar', color: 'blue', icon: AlertCircle };
    }

    return { label: 'Programada', color: 'yellow', icon: Clock };
  };

  // Función para obtener el mensaje de tiempo
  const getTimeMessage = (scheduledClass) => {
    const now = new Date();
    const classDate = parseClassDateTime(scheduledClass.date, scheduledClass.time);

    const diffInMinutes = Math.round((classDate - now) / (1000 * 60));

    if (diffInMinutes < -30) {
      return `Pasó hace ${Math.abs(diffInMinutes)} minutos`;
    } else if (diffInMinutes < 0) {
      return `Empezó hace ${Math.abs(diffInMinutes)} minutos`;
    } else if (diffInMinutes === 0) {
      return 'Es ahora';
    } else if (diffInMinutes <= 30) {
      return `En ${diffInMinutes} minutos`;
    } else if (diffInMinutes < 60) {
      return `En ${diffInMinutes} minutos`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `En ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `En ${days} ${days === 1 ? 'día' : 'días'}`;
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sortedClasses.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < sortedClasses.length - 1 ? prev + 1 : 0));
  };

  // Manejo de arrastre táctil
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!sortedClasses || sortedClasses.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Carrusel */}
      <div className="relative overflow-hidden">
        <div
          ref={carouselRef}
          className="flex transition-transform duration-300 ease-in-out cursor-grab active:cursor-grabbing"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {sortedClasses.map((scheduledClass) => {
            const status = getClassStatus(scheduledClass);
            const StatusIcon = status.icon;
            const canStart = canStartClass(scheduledClass) && !scheduledClass.wasStarted && !scheduledClass.isLive;
            const timeMessage = getTimeMessage(scheduledClass);

            return (
              <div
                key={scheduledClass.id}
                className="min-w-full px-2"
              >
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50/20/20 rounded-xl p-6 border-2 border-blue-200 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold text-gray-800">
                          {scheduledClass.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            status.color === 'green'
                              ? 'bg-green-100 text-green-700'
                              : status.color === 'blue'
                              ? 'bg-blue-100 text-blue-700'
                              : status.color === 'yellow'
                              ? 'bg-yellow-100 text-yellow-700'
                              : status.color === 'red'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>

                      {scheduledClass.description && (
                        <p className="text-gray-600 mb-4">
                          {scheduledClass.description}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-gray-700">
                          <Calendar size={20} className="text-blue-600" />
                          <span className="font-semibold">
                            {formatDate(scheduledClass.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                          <Clock size={20} className="text-blue-600" />
                          <span className="font-semibold">
                            {scheduledClass.time} ({scheduledClass.duration} minutos)
                          </span>
                          <span className="text-sm text-gray-500">
                            • {timeMessage}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    {canStart ? (
                      <button
                        onClick={() => onStartClass(scheduledClass)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play size={20} />
                        Iniciar Clase
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
                        <AlertCircle size={20} />
                        <span className="font-semibold">
                          {scheduledClass.isLive || scheduledClass.wasStarted
                            ? 'Clase ya iniciada'
                            : 'Fuera del horario permitido'}
                        </span>
                      </div>
                    )}
                    {/* Botón eliminar - solo si no está en vivo ni fue iniciada */}
                    {!scheduledClass.isLive && !scheduledClass.wasStarted && onDeleteClass && (
                      <button
                        onClick={() => onDeleteClass(scheduledClass.id)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold"
                        title="Eliminar clase"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>

                  {!canStart && !scheduledClass.isLive && !scheduledClass.wasStarted && (
                    <div className="mt-3 text-center">
                      <p className="text-sm text-gray-600">
                        Podrás iniciar esta clase 30 minutos antes o después de la hora programada
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botones de navegación */}
        {scheduledClasses.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100:bg-gray-700 transition-all z-10 ml-2"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100:bg-gray-700 transition-all z-10 mr-2"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* Indicadores */}
      {scheduledClasses.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {scheduledClasses.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-gray-300 hover:bg-gray-400:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduledClassesCarousel;

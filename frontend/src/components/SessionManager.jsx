// frontend/src/components/SessionManager.jsx

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { Clock, AlertTriangle } from 'lucide-react';

const SessionManager = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    lastActivity,
    sessionStartTime,
    showSessionRenewalModal,
    setShowSessionRenewalModal,
    renewSession,
    logout,
    updateActivity
  } = useStore();

  const checkIntervalRef = useRef(null);
  const activityListenerRef = useRef(null);

  const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutos
  const THREE_HOURS = 3 * 60 * 60 * 1000; // 3 horas

  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('🔄 [SESSION] SessionManager montado');

    // Función para verificar la sesión
    const checkSession = () => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      const sessionDuration = now - sessionStartTime;

      // Si ha pasado 30 minutos sin actividad, cerrar sesión
      if (inactiveTime >= THIRTY_MINUTES) {
        console.log('⏰ [SESSION] Sesión expirada por inactividad');
        logout();
        navigate('/login');
        return;
      }

      // Si han pasado 3 horas de sesión activa, mostrar modal de renovación
      if (sessionDuration >= THREE_HOURS && !showSessionRenewalModal) {
        console.log('⏰ [SESSION] Mostrando modal de renovación de sesión');
        setShowSessionRenewalModal(true);
      }
    };

    // Listener para actualizar la actividad
    const handleActivity = () => {
      updateActivity();
    };

    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    // Verificar sesión cada minuto
    checkIntervalRef.current = setInterval(checkSession, 60 * 1000);

    // Verificar inmediatamente
    checkSession();

    return () => {
      // Limpiar listeners
      events.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, lastActivity, sessionStartTime, showSessionRenewalModal]);

  const handleRenew = () => {
    renewSession();
  };

  const handleLogout = () => {
    setShowSessionRenewalModal(false);
    logout();
    navigate('/login');
  };

  if (!showSessionRenewalModal) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-scale">
          {/* Icono */}
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-orange-600 dark:text-orange-400" />
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-2">
            Tu sesión está por expirar
          </h2>

          {/* Descripción */}
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            Has estado en sesión por 3 horas. ¿Deseas continuar trabajando?
          </p>

          {/* Advertencia */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800 dark:text-orange-300">
                Si no respondes, tu sesión se cerrará automáticamente después de 30 minutos de inactividad.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-semibold"
            >
              Cerrar Sesión
            </button>
            <button
              onClick={handleRenew}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-semibold shadow-lg"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>

      {/* CSS para animación */}
      <style>{`
        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default SessionManager;

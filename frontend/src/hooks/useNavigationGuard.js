// frontend/src/hooks/useNavigationGuard.js
import { useEffect } from 'react';

/**
 * Hook para prevenir navegación cuando hay una transmisión activa
 * @param {boolean} isActive - Si hay una transmisión activa
 * @param {string} message - Mensaje a mostrar al usuario
 * @param {function} onNavigate - Callback cuando el usuario confirma salir
 */
export const useNavigationGuard = (isActive, message, onNavigate) => {
  // Bloquear navegación del navegador (back/forward)
  useEffect(() => {
    if (!isActive) return;

    const currentPath = window.location.pathname;

    const handlePopState = (e) => {
      const confirmLeave = window.confirm(message || '¿Estás seguro de que quieres salir? La transmisión se interrumpirá.');

      if (confirmLeave) {
        if (onNavigate) {
          onNavigate();
        }
        // Permitir navegación
        // No hacemos nada, dejamos que el navegador navegue
      } else {
        // Prevenir navegación reemplazando el estado
        window.history.pushState(null, '', currentPath);
      }
    };

    // Agregar entrada al historial para capturar el botón de atrás
    window.history.pushState(null, '', currentPath);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive, message, onNavigate]);

  // Bloquear antes de descargar la página
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message || '¿Estás seguro de que quieres salir? La transmisión se interrumpirá.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, message]);
};

export default useNavigationGuard;

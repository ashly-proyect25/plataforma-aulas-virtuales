// frontend/src/hooks/useNavigateSafe.js
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook personalizado para navegación segura que evita conflictos con React
 *
 * Problema: Cuando se actualiza el estado y luego se navega inmediatamente,
 * React y React Router intentan actualizar el DOM simultáneamente, causando:
 * "Failed to execute 'insertBefore' on 'Node'"
 *
 * Solución: Postponer la navegación al siguiente tick del event loop usando setTimeout
 * Esto permite que React termine de procesar las actualizaciones de estado
 * antes de que React Router inicie la navegación.
 */
export const useNavigateSafe = () => {
  const navigate = useNavigate();

  const navigateSafe = useCallback((to, options = {}) => {
    // Postponer navegación al siguiente tick
    setTimeout(() => {
      navigate(to, { replace: true, ...options });
    }, 0);
  }, [navigate]);

  return navigateSafe;
};

// frontend/src/utils/getAuthToken.js

/**
 * Obtiene el token de autenticación desde el Zustand persist storage
 * @returns {string|null} El token JWT o null si no existe
 */
export const getAuthToken = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) {
      return null;
    }

    const parsedStorage = JSON.parse(authStorage);
    return parsedStorage?.state?.token || null;
  } catch (error) {
    console.error('Error obteniendo token desde auth-storage:', error);
    return null;
  }
};

/**
 * Obtiene el usuario actual desde el Zustand persist storage
 * @returns {object|null} El objeto de usuario o null si no existe
 */
export const getAuthUser = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) {
      return null;
    }

    const parsedStorage = JSON.parse(authStorage);
    return parsedStorage?.state?.user || null;
  } catch (error) {
    console.error('Error obteniendo usuario desde auth-storage:', error);
    return null;
  }
};

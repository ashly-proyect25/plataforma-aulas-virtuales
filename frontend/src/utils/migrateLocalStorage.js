// frontend/src/utils/migrateLocalStorage.js

/**
 * Migra datos de localStorage del sistema viejo al nuevo sistema con persist
 *
 * Sistema VIEJO:
 * - token: "eyJhbG..."
 * - user: "{\"id\":1,...}"
 * - lastActivity: "1699999999999"
 * - sessionStartTime: "1699999999999"
 *
 * Sistema NUEVO (persist):
 * - auth-storage: "{\"state\":{...},\"version\":0}"
 *
 * NOTA: Esta función es OPCIONAL y solo se necesita si hay usuarios
 * con sesiones activas en el sistema viejo
 */
export function migrateOldLocalStorage() {
  console.log('🔄 [MIGRATE] Verificando si hay datos viejos...');

  // Verificar si ya existe el nuevo formato
  const newStorage = localStorage.getItem('auth-storage');
  if (newStorage) {
    console.log('ℹ️ [MIGRATE] Ya existe auth-storage, no se necesita migración');
    return;
  }

  // Buscar datos del sistema viejo
  const oldToken = localStorage.getItem('token');
  const oldUserStr = localStorage.getItem('user');
  const oldLastActivity = localStorage.getItem('lastActivity');
  const oldSessionStartTime = localStorage.getItem('sessionStartTime');

  if (oldToken && oldUserStr) {
    try {
      console.log('🔄 [MIGRATE] Datos viejos encontrados, migrando...');

      const user = JSON.parse(oldUserStr);
      const lastActivity = oldLastActivity ? parseInt(oldLastActivity) : Date.now();
      const sessionStartTime = oldSessionStartTime ? parseInt(oldSessionStartTime) : Date.now();

      // Crear estructura para persist
      const persistData = {
        state: {
          user,
          token: oldToken,
          isAuthenticated: true,
          lastActivity,
          sessionStartTime,
          theme: localStorage.getItem('theme') || 'light',
        },
        version: 0
      };

      // Guardar en nuevo formato
      localStorage.setItem('auth-storage', JSON.stringify(persistData));

      // Limpiar datos viejos
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('sessionStartTime');

      console.log('✅ [MIGRATE] Migración completada exitosamente');
      console.log('✅ [MIGRATE] Usuario migrado:', user.username);

    } catch (error) {
      console.error('❌ [MIGRATE] Error al migrar datos:', error);
      // En caso de error, limpiar todo
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('sessionStartTime');
    }
  } else {
    console.log('ℹ️ [MIGRATE] No hay datos viejos para migrar');
  }
}

/**
 * Limpia TODOS los datos de autenticación (viejo y nuevo)
 * Útil para forzar un re-login
 */
export function clearAllAuthData() {
  console.log('🗑️ [MIGRATE] Limpiando todos los datos de autenticación...');

  // Limpiar sistema viejo
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivity');
  localStorage.removeItem('sessionStartTime');

  // Limpiar sistema nuevo
  localStorage.removeItem('auth-storage');

  console.log('✅ [MIGRATE] Todos los datos de autenticación eliminados');
}

// frontend/src/store/store.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI } from '../services/api';

export const useStore = create(
  persist(
    (set, get) => ({
  // ==================== AUTH STATE ====================
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  lastActivity: Date.now(),
  sessionStartTime: Date.now(),
  showSessionRenewalModal: false,

  // Login universal
  login: async (username, password) => {
    try {
      console.log('📍 [STORE] Iniciando login para:', username);

      // ✅ Solo marcamos isLoading, sin limpiar el estado anterior
      // Esto evita re-renders innecesarios que causan el error de DOM
      set({ isLoading: true });

      const response = await authAPI.login(username, password);
      console.log('📍 [STORE] Respuesta completa:', response);

      const { user, token } = response.data;

      console.log('📍 [STORE] User extraído:', user);
      console.log('📍 [STORE] Token extraído:', token ? 'SÍ' : 'NO');

      // ✅ Actualizar estado con el NUEVO usuario - persist guardará automáticamente
      const now = Date.now();
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: now,
        sessionStartTime: now,
        showSessionRenewalModal: false,
        currentClassroom: null,
        participants: [],
        messages: []
      });

      console.log('✅ [STORE] Login completado:', user.username, '/', user.role);
      console.log('✅ [STORE] Estado actualizado - persist guardará automáticamente');

      return { success: true, user };

    } catch (error) {
      console.error('❌ [STORE] Error en login:', error);
      console.error('❌ [STORE] Error response:', error.response);
      console.error('❌ [STORE] Error data:', error.response?.data);

      // ✅ En caso de error, solo marcar isLoading como false
      set({ isLoading: false });

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          'Error al iniciar sesión';

      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      console.log('📍 [STORE] Haciendo logout...');
      await authAPI.logout();
    } catch (error) {
      console.error('❌ [STORE] Error al hacer logout:', error);
    } finally {
      // Solo resetear el estado - persist limpiará localStorage automáticamente
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        lastActivity: Date.now(),
        sessionStartTime: Date.now(),
        showSessionRenewalModal: false
      });
      console.log('✅ [STORE] Logout completado - persist limpiará automáticamente');
    }
  },

  // Actualizar actividad
  updateActivity: () => {
    const now = Date.now();
    set({ lastActivity: now });
    // persist guardará automáticamente
  },

  // Renovar sesión
  renewSession: () => {
    const now = Date.now();
    set({
      sessionStartTime: now,
      lastActivity: now,
      showSessionRenewalModal: false
    });
    // persist guardará automáticamente
    console.log('✅ [STORE] Sesión renovada');
  },

  // Mostrar/ocultar modal de renovación
  setShowSessionRenewalModal: (show) => {
    set({ showSessionRenewalModal: show });
  },

  // Actualizar usuario
  updateUser: (userData) => {
    const updatedUser = { ...get().user, ...userData };
    set({ user: updatedUser });
    // persist guardará automáticamente
    console.log('✅ [STORE] Usuario actualizado');
  },

  // Alias para compatibilidad
  setUser: (userData) => get().updateUser(userData),

  // ==================== UI STATE ====================
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({
    isSidebarOpen: !state.isSidebarOpen
  })),

  // ==================== CLASSROOM STATE ====================
  currentClassroom: null,
  participants: [],
  messages: [],

  setCurrentClassroom: (classroom) => set({ currentClassroom: classroom }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants, participant]
  })),
  removeParticipant: (participantId) => set((state) => ({
    participants: state.participants.filter(p => p.id !== participantId)
  })),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  clearMessages: () => set({ messages: [] }),

  // ==================== LIVE CLASS STATE ====================
  // Estado para mantener la clase en vivo activa mientras se navega dentro de la materia
  activeLiveClass: null, // { courseId, type: 'teacher' | 'student', isMinimized: boolean }

  setActiveLiveClass: (liveClassData) => {
    console.log('🎥 [STORE] Configurando clase en vivo activa:', liveClassData);
    set({ activeLiveClass: liveClassData });
  },

  updateActiveLiveClass: (updates) => {
    set((state) => {
      if (!state.activeLiveClass) return {};
      console.log('🎥 [STORE] Actualizando clase en vivo:', updates);
      return {
        activeLiveClass: {
          ...state.activeLiveClass,
          ...updates
        }
      };
    });
  },

  clearActiveLiveClass: () => {
    console.log('🎥 [STORE] Limpiando clase en vivo activa');
    set({ activeLiveClass: null });
  },
}),
    {
      name: 'auth-storage', // nombre del item en localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Solo persistir estos campos
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
        sessionStartTime: state.sessionStartTime,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('✅ [PERSIST] Estado restaurado desde localStorage');
          console.log('🔍 [PERSIST] User:', state.user?.username);
          console.log('🔍 [PERSIST] Token:', state.token ? 'SI' : 'NO');
          console.log('🔍 [PERSIST] isAuthenticated:', state.isAuthenticated);
        }
      },
    }
  )
);
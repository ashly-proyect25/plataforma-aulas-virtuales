// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ INTERCEPTOR CORREGIDO - Lee el token EN CADA REQUEST desde Zustand persist
api.interceptors.request.use(
  (config) => {
    // ✅ Leer token SIEMPRE del auth-storage (Zustand persist) en cada petición
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsedStorage = JSON.parse(authStorage);
        const token = parsedStorage?.state?.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 [API] Token agregado al request');
        } else {
          console.warn('⚠️ [API] No hay token en auth-storage');
        }
      } else {
        console.warn('⚠️ [API] No hay auth-storage disponible');
      }
    } catch (error) {
      console.error('❌ [API] Error leyendo token desde auth-storage:', error);
    }

    return config;
  },
  (error) => {
    console.error('❌ [API] Error en interceptor request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ [API] Error en response:', error.response?.status, error.config?.url);

    if (error.response?.status === 401) {
      let redirectPath = '/login/docente';

      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsedStorage = JSON.parse(authStorage);
          const user = parsedStorage?.state?.user;

          if (user) {
            if (user.role === 'ADMIN') {
              redirectPath = '/admin/login';
            } else if (user.role === 'STUDENT') {
              redirectPath = '/login/alumno';
            }
          }
        }
      } catch (e) {
        console.error('Error parsing auth-storage:', e);
      }

      // Limpiar auth-storage completo en caso de 401
      localStorage.removeItem('auth-storage');

      if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/admin/login')) {
        console.log('🔄 [API] Redirigiendo a:', redirectPath);
        window.location.href = redirectPath;
      }
    }
    return Promise.reject(error);
  }
);

/**
 * 🔐 AUTENTICACIÓN
 */
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  logout: () =>
    api.post('/auth/logout'),

  getMe: () =>
    api.get('/auth/me'),

  // Admin - Gestión de Docentes
  createTeacher: (data) =>
    api.post('/auth/users/teacher', data),

  getTeachers: () =>
    api.get('/auth/users/teachers'),

  updateUser: (id, data) =>
    api.patch(`/auth/users/${id}`, data),

  toggleTeacherStatus: (id) =>
    api.patch(`/auth/users/${id}/toggle-status`),

  // Teacher - Gestión de Alumnos
  createStudent: (data) =>
    api.post('/auth/users/student', data),

  importStudents: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/auth/users/import-students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getStudents: (params) =>
    api.get('/auth/users/students', { params }),

  toggleStudentStatus: (id) =>
    api.patch(`/auth/users/students/${id}/toggle-status`),

  // Admin - Gestión global de estudiantes
  getAllStudents: () =>
    api.get('/users/students'),

  getAvailableStudents: (courseId, search) =>
    api.get('/auth/users/students/available', { params: { courseId, search } }),

  importStudentsBulk: (students) =>
    api.post('/auth/users/students/import', { students })
};

/**
 * 📚 CURSOS/MATERIAS
 */
export const coursesAPI = {
  create: (data) =>
    api.post('/courses', data),

  getAll: (params) =>
    api.get('/courses', { params }),

  getById: (id) =>
    api.get(`/courses/${id}`),

  update: (id, data) =>
    api.patch(`/courses/${id}`, data),

  toggleStatus: (id) =>
    api.patch(`/courses/${id}/toggle-status`),

  delete: (id) =>
    api.delete(`/courses/${id}`),

  getMyCourses: () =>
    api.get('/my-courses')
};

/**
 * 📝 AULAS/CLASES
 */
export const classroomsAPI = {
  create: (data) =>
    api.post('/classrooms', data),

  getAll: (params) =>
    api.get('/classrooms', { params }),

  getById: (id) =>
    api.get(`/classrooms/${id}`),

  update: (id, data) =>
    api.patch(`/classrooms/${id}`, data),

  delete: (id) =>
    api.delete(`/classrooms/${id}`)
};

/**
 * 👥 INSCRIPCIONES
 */
export const enrollmentsAPI = {
  create: (data) =>
    api.post('/enrollments', data),

  getAll: (params) =>
    api.get('/enrollments', { params }),

  delete: (id) =>
    api.delete(`/enrollments/${id}`)
};

export default api;
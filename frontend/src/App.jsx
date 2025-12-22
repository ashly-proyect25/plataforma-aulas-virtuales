// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store/store';
import { migrateOldLocalStorage } from './utils/migrateLocalStorage';

// Auth Components
import LoginDocente from './components/Auth/LoginDocente';
import LoginAlumno from './components/Auth/LoginAlumno';
import LoginAdmin from './components/Auth/LoginAdmin';

// Dashboard Pages
import AdminDashboard from './pages/AdminDashboard';
import DocenteDashboard from './pages/DocenteDashboard';
import AlumnoDashboard from './pages/AlumnoDashboard';
import CourseManagementPage from './pages/CourseManagementPage';
import StudentCourseViewPage from './pages/StudentCourseViewPage';

// Session Manager
import SessionManager from './components/SessionManager';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useStore();

  if (!isAuthenticated) {
    // Guardar la URL a la que intentaba acceder
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('redirectAfterLogin', currentPath);

    if (allowedRoles.includes('ADMIN')) {
      return <Navigate to="/admin/login" replace />;
    } else if (allowedRoles.includes('TEACHER')) {
      return <Navigate to="/login/docente" replace />;
    } else {
      return <Navigate to="/login/alumno" replace />;
    }
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Redirect basado en rol
function RoleBasedRedirect() {
  const { isAuthenticated, user } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login/docente" replace />;
  }

  // Verificar si hay una URL para redirigir después del login
  const redirectPath = localStorage.getItem('redirectAfterLogin');
  if (redirectPath) {
    localStorage.removeItem('redirectAfterLogin');
    return <Navigate to={redirectPath} replace />;
  }

  switch (user?.role) {
    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    case 'TEACHER':
      return <Navigate to="/docente/dashboard" replace />;
    case 'STUDENT':
      return <Navigate to="/alumno/dashboard" replace />;
    default:
      return <Navigate to="/login/docente" replace />;
  }
}

// Redirect de sala/clase basado en rol
function RoomRedirect() {
  const { user } = useStore();
  const { courseId } = useParams();

  if (user?.role === 'TEACHER') {
    return <Navigate to={`/docente/curso/${courseId}`} replace />;
  } else if (user?.role === 'STUDENT') {
    return <Navigate to={`/alumno/curso/${courseId}`} replace />;
  }

  return <Navigate to="/" replace />;
}

function App() {
  const { theme, user, isAuthenticated } = useStore();

  // ✅ Migrar datos viejos de localStorage (si existen)
  useEffect(() => {
    migrateOldLocalStorage();
  }, []);

  // ✅ Log de inicialización - persist restaura automáticamente
  useEffect(() => {
    console.log('🚀 [APP] Aplicación iniciada');
    console.log('🔍 [APP] Estado inicial - isAuthenticated:', isAuthenticated);
    console.log('🔍 [APP] Estado inicial - user:', user?.username || 'ninguno');
  }, []);

  // ✅ Aplicar tema al cargar y cuando cambie
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'system') {
      // Detectar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <SessionManager />
      <Routes>
        {/* ==================== RUTAS PÚBLICAS ==================== */}
        <Route path="/login/docente" element={<LoginDocente />} />
        <Route path="/login/alumno" element={<LoginAlumno />} />
        <Route path="/admin/login" element={<LoginAdmin />} />

        {/* ==================== RUTAS PROTEGIDAS - ADMIN ==================== */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* ==================== RUTAS PROTEGIDAS - DOCENTE ==================== */}
        <Route
          path="/docente/dashboard"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <DocenteDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/docente/curso/:courseId"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <CourseManagementPage />
            </ProtectedRoute>
          }
        />

        {/* ==================== RUTAS PROTEGIDAS - ALUMNO ==================== */}
        <Route
          path="/alumno/dashboard"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <AlumnoDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alumno/curso/:courseId"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentCourseViewPage />
            </ProtectedRoute>
          }
        />

        {/* ==================== RUTAS DE SALA/CLASE ==================== */}
        {/* Estas rutas permiten acceso directo con redirect automático */}
        <Route
          path="/sala/:courseId"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER']}>
              <RoomRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clase/:courseId"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER']}>
              <RoomRedirect />
            </ProtectedRoute>
          }
        />

        {/* ==================== REDIRECCIONES ==================== */}
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="*" element={<RoleBasedRedirect />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
// frontend/src/components/Auth/LoginAdmin.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import { Shield, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

function LoginAdmin() {
  const navigate = useNavigate();
  const { login, isLoading } = useStore();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }

    const result = await login(formData.username, formData.password);

    if (result.success) {
      // Verificar que sea admin
      if (result.user.role !== 'ADMIN') {
        setError('Acceso denegado. Solo administradores.');
        await useStore.getState().logout();
        return;
      }

      // ✅ CRÍTICO: Navegar en el siguiente tick para evitar conflictos con React
      setTimeout(() => {
        // Verificar si hay una URL para redirigir después del login
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirectPath, { replace: true });
        } else {
          navigate('/admin/dashboard', { replace: true });
        }
      }, 0);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-900 via-red-900 to-slate-900 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Panel Administrativo
          </h1>
          <p className="text-orange-300 text-lg">
            Acceso restringido
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Warning */}
            <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 text-sm font-medium">Solo Administradores</p>
                <p className="text-orange-300/70 text-xs mt-1">Acceso no autorizado será registrado</p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-300 mb-2">
                Usuario Administrativo
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 group-focus-within:text-orange-300 transition-colors" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-100 placeholder-slate-500 transition-all"
                  placeholder="admin"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 group-focus-within:text-orange-300 transition-colors" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-100 placeholder-slate-500 transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-orange-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Acceder al Panel
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          Sistema Protegido - Todos los accesos son registrados
        </p>
      </div>
    </div>
  );
}

export default LoginAdmin;
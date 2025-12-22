// frontend/src/components/Admin/CreateTeacherModal.jsx
import { useState } from 'react';
import { X, UserPlus, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useToast } from '../common/ToastContainer';
import { validateUserForm } from '../../utils/validation';

function CreateTeacherModal({ isOpen, onClose, onTeacherCreated }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Limpiar error del campo específico cuando el usuario escribe
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setErrors({});

    // Validar formulario usando la utilidad de validación
    const validation = validateUserForm(formData, true);

    if (!validation.valid) {
      setErrors(validation.errors);
      // Mostrar el primer error como mensaje general
      const firstError = Object.values(validation.errors)[0];
      setError(firstError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.createTeacher({
        ...formData,
        role: 'TEACHER',
      });

      // Verificar la respuesta del backend
      if (response.data.success) {
        const successMsg = response.data.message || 'Docente creado exitosamente';
        setSuccess(successMsg);

        // Mostrar toast de éxito
        toast.success(successMsg);

        // Limpiar formulario
        setFormData({
          username: '',
          email: '',
          password: '',
          name: '',
        });

        // Notificar al componente padre con los datos del docente creado
        if (onTeacherCreated && response.data.teacher) {
          onTeacherCreated(response.data.teacher);
        }

        // Cerrar modal después de un breve delay para mostrar el mensaje
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1500);
      } else {
        const errorMsg = response.data.message || 'Error al crear docente';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error creando docente:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Error al crear docente';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-orange-400 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Crear Docente</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Nombre Completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Nombre Completo
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-slate-700 focus:ring-orange-500'
                }`}
                placeholder="Ej: Juan Pérez García"
              />
            </div>
            {errors.name && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Debe incluir al menos nombre y apellido
            </p>
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Usuario
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 ${
                  errors.username
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-slate-700 focus:ring-orange-500'
                }`}
                placeholder="Ej: juan.perez"
              />
            </div>
            {errors.username && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.username}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Sin espacios. Solo letras, números, puntos, guiones
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-slate-700 focus:ring-orange-500'
                }`}
                placeholder="juan@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Sin espacios. Formato válido de correo
            </p>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Contraseña Temporal
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-slate-700 focus:ring-orange-500'
                }`}
                placeholder="Mínimo 8 caracteres con números"
              />
            </div>
            {errors.password && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Al menos 8 caracteres, debe incluir números
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear Docente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTeacherModal;
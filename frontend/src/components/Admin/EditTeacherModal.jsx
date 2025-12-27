// frontend/src/components/Admin/EditTeacherModal.jsx
import { useState, useEffect } from 'react';
import { X, Save, Mail, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useToast } from '../common/ToastContainer';
import { validateFullName, validateUsername, validateEmail } from '../../utils/validation';

function EditTeacherModal({ isOpen, onClose, teacher, onTeacherUpdated }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos del docente cuando cambie
  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        username: teacher.username || '',
        email: teacher.email || '',
      });
      setErrors({});
      setError('');
      setSuccess('');
    }
  }, [teacher]);

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

    // Validaciones
    const validationErrors = {};
    let isValid = true;

    const nameValidation = validateFullName(formData.name);
    if (!nameValidation.valid) {
      validationErrors.name = nameValidation.message;
      isValid = false;
    }

    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.valid) {
      validationErrors.username = usernameValidation.message;
      isValid = false;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      validationErrors.email = emailValidation.message;
      isValid = false;
    }

    if (!isValid) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      setError(firstError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.updateUser(teacher.id, formData);

      if (response.data.success) {
        const successMsg = response.data.message || 'Docente actualizado exitosamente';
        setSuccess(successMsg);
        toast.success(successMsg);

        // Notificar al componente padre
        if (onTeacherUpdated && response.data.user) {
          onTeacherUpdated(response.data.user);
        }

        // Cerrar modal después de un breve delay
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1500);
      } else {
        const errorMsg = response.data.message || 'Error al actualizar docente';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error actualizando docente:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Error al actualizar docente';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !teacher) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Save className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Editar Docente</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-500 text-sm">{error}</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Ej: Juan Pérez García"
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Debe incluir al menos nombre y apellido
            </p>
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 ${
                  errors.username
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Ej: juan.perez"
              />
            </div>
            {errors.username && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.username}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Sin espacios. Solo letras, números, puntos, guiones
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="juan@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Sin espacios. Formato válido de correo
            </p>
          </div>

          {/* Info sobre contraseña */}
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
            <p className="text-blue-400 text-xs">
              💡 Para cambiar la contraseña, utiliza la opción "Resetear Contraseña"
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTeacherModal;

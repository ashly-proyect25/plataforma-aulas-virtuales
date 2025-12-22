// frontend/src/components/common/Toast.jsx
import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ type = 'info', message, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const configs = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-500 dark:bg-green-600',
      borderColor: 'border-green-600 dark:border-green-700',
      textColor: 'text-white',
      iconColor: 'text-white'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-500 dark:bg-red-600',
      borderColor: 'border-red-600 dark:border-red-700',
      textColor: 'text-white',
      iconColor: 'text-white'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-500 dark:bg-yellow-600',
      borderColor: 'border-yellow-600 dark:border-yellow-700',
      textColor: 'text-white',
      iconColor: 'text-white'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500 dark:bg-blue-600',
      borderColor: 'border-blue-600 dark:border-blue-700',
      textColor: 'text-white',
      iconColor: 'text-white'
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border-l-4 rounded-lg shadow-2xl p-4 flex items-start gap-3 min-w-[320px] max-w-md animate-slide-in-right`}>
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <p className={`${config.textColor} text-sm font-medium flex-1`}>{message}</p>
      <button
        onClick={onClose}
        className={`${config.iconColor} hover:opacity-75 transition-opacity flex-shrink-0`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
